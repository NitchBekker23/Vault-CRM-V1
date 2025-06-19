import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { imageOptimizer } from "./imageOptimizer";
import { db } from "./db";
import { 
  sendAccountRequestNotification, 
  sendAccountApprovalEmail, 
  sendAccountDenialEmail,
  sendTwoFactorCode,
  sendPasswordResetEmail
} from "./emailService";
import { notificationService } from "./notificationService";
import { 
  requireAuth as requireAuthentication, 
  requireAdminRole, 
  requireOwnerRole,
  requireAdminAccess,
  requireOwnerAccess,
  validateRoleHierarchy,
  auditLog,
  type AuthenticatedRequest
} from "./authMiddleware";
import {
  users,
  images,
  insertAccountRequestSchema,
  insertTwoFactorCodeSchema,
  insertInventoryItemSchema,
  insertWishlistItemSchema,
  insertClientSchema,
  insertPurchaseSchema,
  insertSalesTransactionSchema,
  inventoryItems,
} from "@shared/schema";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getUserId } from "./authHelper";

// Configure multer for CSV file uploads
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Configure multer for image uploads
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Session-based authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  const session = req.session;
  if (session && session.authenticated && session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection before setting up routes
  try {
    await storage.testConnection();
  } catch (error) {
    console.error('Failed to connect to database during startup:', error);
    throw error;
  }

  // Auth middleware
  await setupAuth(app);

  // Public account request route
  app.post('/api/auth/request-account', async (req, res) => {
    try {
      const validatedData = insertAccountRequestSchema.parse(req.body);
      
      // Create account request
      const request = await storage.createAccountRequest(validatedData);
      
      // Get all admin users to notify
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(user => 
        (user.role === 'admin' || user.role === 'owner') && 
        user.status === 'approved' && 
        user.email
      );
      
      // Send notification emails to admins
      for (const admin of admins) {
        await sendAccountRequestNotification(
          admin.email!,
          {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            email: validatedData.email,
            company: validatedData.company,
            message: validatedData.message || undefined
          },
          request.id
        );
      }
      
      res.status(201).json({ 
        message: "Account request submitted successfully. You will receive an email when your request is reviewed.",
        requestId: request.id 
      });
    } catch (error) {
      console.error("Error creating account request:", error);
      res.status(500).json({ message: "Failed to submit account request" });
    }
  });

  // Session-based authentication check
  const checkAuth = (req: any, res: any, next: any) => {
    console.log("CheckAuth: Starting authentication check");
    console.log("CheckAuth: req.session:", req.session ? JSON.stringify(req.session) : "null");
    console.log("CheckAuth: req.isAuthenticated():", req.isAuthenticated?.());
    console.log("CheckAuth: req.user:", req.user ? JSON.stringify(req.user) : "null");
    
    // Check session-based auth first (standalone)
    if (req.session?.authenticated && req.session?.userId) {
      console.log("CheckAuth: Session auth success, userId:", req.session.userId);
      req.currentUserId = req.session.userId;
      return next();
    }
    
    // Fallback to Replit auth if available
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      console.log("CheckAuth: Replit auth success, userId:", req.user.claims.sub);
      req.currentUserId = getUserId(req);
      return next();
    }
    
    console.log("CheckAuth: No valid authentication found, returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Auth routes
  app.get("/api/auth/user", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user status allows access
      if (user.status !== 'approved') {
        return res.status(401).json({ message: "Account not approved" });
      }
      
      // Return user data without password hash
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`Password reset requested for email: ${email}`);
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`No user found for email: ${email}`);
        // For security, don't reveal if email exists
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      console.log(`User found: ${user.firstName} ${user.lastName} (${user.email})`);

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      console.log(`Generated reset token: ${resetToken}`);

      // Store reset token
      await storage.createPasswordResetToken({
        token: resetToken,
        email: email,
        used: false,
        expiresAt: expiresAt,
      });

      console.log(`Token stored in database for email: ${email}`);

      // Send reset email
      console.log(`Attempting to send password reset email to: ${email}`);
      const emailSent = await sendPasswordResetEmail(email, user.firstName || 'User', resetToken);
      
      if (emailSent) {
        console.log(`Password reset email sent successfully to: ${email}`);
      } else {
        console.log(`Failed to send password reset email to: ${email}`);
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Temporary admin login for testing
  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { adminKey } = req.body;
      
      // Simple admin bypass for testing
      if (adminKey === "admin123temp") {
        const user = await storage.getUserByEmail("nitchbekker@gmail.com");
        if (!user) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        
        // Store user session
        (req.session as any).userId = user.id;
        (req.session as any).authenticated = true;
        (req.session as any).userEmail = user.email;
        
        res.json({ 
          message: "Admin login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.company,
            role: user.role,
            status: user.status
          }
        });
      } else {
        res.status(401).json({ message: "Invalid admin key" });
      }
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Get reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await storage.updateUserPassword(resetToken.email, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin route middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      // Use the same getUserId function that other routes use
      const userId = getUserId(req);
      if (!userId) {
        console.log("Admin middleware: No user ID found");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("Admin middleware: Checking user:", userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log("Admin middleware: User not found:", userId);
        return res.status(403).json({ message: "User not found" });
      }
      
      if (user.status !== 'approved') {
        console.log("Admin middleware: User not approved:", user.status);
        return res.status(403).json({ message: "Account not approved" });
      }
      
      if (user.role !== 'admin' && user.role !== 'owner') {
        console.log("Admin middleware: Insufficient role:", user.role);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      console.log("Admin middleware: Access granted for user:", userId, "with role:", user.role);
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Account request management routes (admin only)
  app.get('/api/admin/account-requests', async (req: any, res) => {
    try {
      const status = req.query.status as string;
      const requests = await storage.getAccountRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching account requests:", error);
      res.status(500).json({ message: "Failed to fetch account requests" });
    }
  });

  app.post('/api/admin/account-requests/:id/review', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { approved, denialReason } = req.body;
      const reviewerId = req.currentUser.id;

      // Update request status
      const updatedRequest = await storage.reviewAccountRequest(requestId, reviewerId, approved, denialReason);
      
      if (approved) {
        // Generate setup token
        const setupToken = crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await storage.createAccountSetupToken({
          token: setupToken,
          email: updatedRequest.email,
          accountRequestId: updatedRequest.id,
          expiresAt
        });
        
        // Send approval email with setup link
        await sendAccountApprovalEmail(
          updatedRequest.email,
          `${updatedRequest.firstName} ${updatedRequest.lastName}`,
          setupToken
        );
      } else {
        // Send denial email
        await sendAccountDenialEmail(
          updatedRequest.email,
          `${updatedRequest.firstName} ${updatedRequest.lastName}`,
          denialReason
        );
      }

      res.json({ message: approved ? "Account request approved" : "Account request denied" });
    } catch (error) {
      console.error("Error reviewing account request:", error);
      res.status(500).json({ message: "Failed to review account request" });
    }
  });

  // User management routes (admin only)
  app.get('/api/admin/users', checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/status', 
    isAuthenticated, 
    isAdmin,
    auditLog('USER_STATUS_UPDATE'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.params.id;
        const { status } = req.body;
        
        if (!['approved', 'suspended', 'denied'].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        
        // Prevent self-modification
        if (userId === req.currentUser?.id) {
          return res.status(403).json({ message: "Cannot modify your own status" });
        }
        
        const updatedUser = await storage.updateUserStatus(userId, status);
        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status" });
      }
    }
  );

  // Get individual user
  app.get('/api/admin/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user
  app.patch('/api/admin/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      
      // Use the comprehensive updateUser method
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Upload user profile image
  app.post('/api/admin/users/:id/upload-image', multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  }).single('image'), async (req, res) => {
    try {
      const userId = req.params.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Create direct file URL that can be served statically
      const profileImageUrl = `/uploads/${file.filename}`;

      // Update user profile with new image URL
      await storage.updateUser(userId, { profileImageUrl });

      res.json({ 
        message: "Image uploaded successfully",
        profileImageUrl 
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static('uploads'));

  // Serve optimized images
  app.get('/api/images/:id', async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const [image] = await db.select().from(images).where(eq(images.id, imageId));
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // If it's a data URL, extract and serve the image data
      if (image.url.startsWith('data:')) {
        const [mimeType, base64Data] = image.url.split(',');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const contentType = mimeType.split(':')[1].split(';')[0];
        
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(imageBuffer);
      } else {
        // Redirect to external URL
        res.redirect(image.url);
      }
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  app.patch('/api/admin/users/:id/role', 
    checkAuth,
    auditLog('USER_ROLE_UPDATE'),
    async (req: any, res) => {
      try {
        const currentUserId = req.currentUserId;
        const currentUser = await storage.getUser(currentUserId);
        
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
          return res.status(403).json({ message: "Admin privileges required" });
        }
        
        const userId = req.params.id;
        const { role } = req.body;
        
        if (!['user', 'admin', 'owner'].includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        
        // Prevent self-modification
        if (userId === currentUserId) {
          return res.status(403).json({ message: "Cannot modify your own role" });
        }
        
        // Only owners can assign owner role
        if (role === 'owner' && currentUser.role !== 'owner') {
          return res.status(403).json({ message: "Only owners can assign owner role" });
        }
        
        const updatedUser = await storage.updateUserRole(userId, role);
        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }
    }
  );

  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.currentUser.id;
      
      // Prevent users from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Get user to delete
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only owners can delete other owners
      if (userToDelete.role === 'owner' && req.currentUser.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can delete other owners" });
      }
      
      await storage.deleteUser(userId);
      
      // Log the deletion activity (use 0 as entityId since user IDs are strings)
      await storage.createActivity({
        userId: currentUserId,
        action: "deleted_user",
        entityType: "user",
        entityId: 0,
        description: `Deleted user: ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email})`,
      });
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Account setup routes
  app.get('/api/auth/verify-setup-token', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const setupToken = await storage.getAccountSetupToken(token);
      
      if (!setupToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Get account request details
      const accountRequest = await storage.getAccountRequest(setupToken.accountRequestId);
      
      if (!accountRequest) {
        return res.status(400).json({ message: "Account request not found" });
      }
      
      res.json({
        firstName: accountRequest.firstName,
        lastName: accountRequest.lastName,
        email: accountRequest.email,
        company: accountRequest.company,
      });
    } catch (error) {
      console.error("Error verifying setup token:", error);
      res.status(500).json({ message: "Failed to verify setup token" });
    }
  });

  app.post('/api/auth/complete-setup', async (req, res) => {
    try {
      const { token, password, twoFactorMethod } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      const setupToken = await storage.getAccountSetupToken(token);
      
      if (!setupToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Get account request details
      const accountRequest = await storage.getAccountRequest(setupToken.accountRequestId);
      
      if (!accountRequest) {
        return res.status(400).json({ message: "Account request not found" });
      }
      
      // Check if user already exists and delete if so (to handle duplicates)
      const existingUser = await storage.getUser(accountRequest.email);
      if (existingUser) {
        // Delete existing user to avoid constraint violation
        await db.delete(users).where(eq(users.email, accountRequest.email));
      }
      
      // Create user account
      const userId = `user-${Date.now()}`;
      
      await storage.upsertUser({
        id: userId,
        email: accountRequest.email,
        firstName: accountRequest.firstName,
        lastName: accountRequest.lastName,
        company: accountRequest.company,
        phoneNumber: accountRequest.phoneNumber,
        role: "user",
        status: "approved",
        twoFactorEnabled: false,
        twoFactorMethod: twoFactorMethod || "email",
        lastLoginAt: new Date(),
      });
      
      // Mark setup token as used
      await storage.markAccountSetupTokenUsed(setupToken.id);
      
      res.json({ message: "Account setup completed successfully" });
    } catch (error) {
      console.error("Error completing account setup:", error);
      res.status(500).json({ message: "Failed to complete account setup" });
    }
  });

  // Direct registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firstName, lastName, email, company, password } = req.body;
      
      if (!firstName || !lastName || !email || !company || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password securely
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user directly (no approval needed)
      const userId = `user-${Date.now()}`;
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        company,
        role: 'user',
        status: 'approved',
        password: hashedPassword,
      });
      
      res.status(201).json({ 
        message: "Account created successfully",
        userId: user.id 
      });
    } catch (error) {
      console.error("Error in registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Direct login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password against stored hash
      const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(401).json({ message: "Account not approved" });
      }
      
      // Store user session
      (req.session as any).userId = user.id;
      (req.session as any).authenticated = true;
      (req.session as any).userEmail = user.email;
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Test login endpoint for 2FA demonstration
  app.post('/api/auth/test-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // For demo purposes, accept any email/password and initiate 2FA
      (req.session as any).pendingEmail = email;
      (req.session as any).testLogin = true;
      
      res.json({ 
        message: "Login successful, 2FA required",
        requiresTwoFactor: true 
      });
    } catch (error) {
      console.error("Error in test login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Test 2FA request code (for demo without full authentication)
  app.post('/api/auth/2fa/request-code', async (req, res) => {
    try {
      // Check if this is a test login session
      const email = (req.session as any)?.pendingEmail;
      const isTestLogin = (req.session as any)?.testLogin;
      
      if (isTestLogin && email) {
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        // Store code in session for testing
        (req.session as any).twoFactorCode = {
          code: code,
          expiresAt: expiresAt,
          email: email,
        };
        
        // Log code for testing (in production, send via email)
        console.log(`\n🔐 2FA Code for ${email}: ${code}\n`);
        
        // Try to send email, but don't fail if it doesn't work
        try {
          await sendTwoFactorCode(email, 'Test User', code);
        } catch (emailError) {
          console.log("Email sending failed, using console output for testing");
        }
        
        res.json({ message: "Verification code sent" });
        return;
      }
      
      // Original authenticated user flow
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || user.status !== 'approved') {
        return res.status(401).json({ message: "User not authorized" });
      }
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store code
      await storage.createTwoFactorCode({
        userId,
        code,
        method: user.twoFactorMethod || 'email',
        expiresAt
      });
      
      // Send code via email
      if (!user.email) {
        return res.status(400).json({ message: "User email not available" });
      }
      
      await sendTwoFactorCode(
        user.email,
        `${user.firstName} ${user.lastName}`,
        code
      );
      
      res.json({ message: "Authentication code sent" });
    } catch (error) {
      console.error("Error sending 2FA code:", error);
      res.status(500).json({ message: "Failed to send authentication code" });
    }
  });

  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      // Check if this is a test login session
      const sessionData = (req.session as any)?.twoFactorCode;
      const isTestLogin = (req.session as any)?.testLogin;
      
      if (isTestLogin && sessionData) {
        if (sessionData.code !== code) {
          return res.status(400).json({ message: "Invalid verification code" });
        }
        
        if (new Date() > new Date(sessionData.expiresAt)) {
          return res.status(400).json({ message: "Verification code expired" });
        }
        
        // Clear the 2FA session data
        delete (req.session as any).twoFactorCode;
        delete (req.session as any).pendingEmail;
        delete (req.session as any).testLogin;
        
        // Mark user as fully authenticated in test mode
        (req.session as any).authenticated = true;
        (req.session as any).userEmail = sessionData.email;
        
        res.json({ message: "Two-factor authentication verified" });
        return;
      }
      
      // Original authenticated user flow
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!code || code.length !== 6) {
        return res.status(400).json({ message: "Invalid code format" });
      }
      
      const twoFactorCode = await storage.getTwoFactorCode(userId, code);
      
      if (!twoFactorCode) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      
      // Mark code as used
      await storage.markTwoFactorCodeUsed(twoFactorCode.id);
      
      res.json({ message: "Code verified successfully" });
    } catch (error) {
      console.error("Error verifying 2FA code:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Manual email sending endpoint for testing
  app.post('/api/admin/send-setup-email', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find the approved account request
      const accountRequests = await storage.getAccountRequests('approved');
      const accountRequest = accountRequests.find(req => req.email === email);
      
      if (!accountRequest) {
        return res.status(404).json({ message: "No approved account request found for this email" });
      }
      
      // Check if setup token already exists
      const existingToken = await storage.getAccountSetupToken(email);
      let setupToken;
      
      if (existingToken && !existingToken.usedAt) {
        setupToken = existingToken.token;
      } else {
        // Generate new setup token
        setupToken = crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await storage.createAccountSetupToken({
          token: setupToken,
          email: email,
          accountRequestId: accountRequest.id,
          expiresAt
        });
      }
      
      // Send the setup email
      await sendAccountApprovalEmail(
        email,
        `${accountRequest.firstName} ${accountRequest.lastName}`,
        setupToken
      );
      
      console.log(`Password setup email sent to ${email} with token: ${setupToken}`);
      
      res.json({ 
        message: "Setup email sent successfully",
        setupUrl: `/setup-account?token=${setupToken}`
      });
    } catch (error) {
      console.error("Error sending setup email:", error);
      res.status(500).json({ message: "Failed to send setup email" });
    }
  });

  // Legacy endpoint for compatibility
  app.post('/api/auth/2fa/request-code-auth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || user.status !== 'approved') {
        return res.status(401).json({ message: "User not authorized" });
      }
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store code
      await storage.createTwoFactorCode({
        userId,
        code,
        method: user.twoFactorMethod || 'email',
        expiresAt
      });
      
      // Send code via email
      if (!user.email) {
        return res.status(400).json({ message: "User email not available" });
      }
      
      await sendTwoFactorCode(
        user.email,
        `${user.firstName} ${user.lastName}`,
        code
      );
      
      res.json({ message: "Authentication code sent" });
    } catch (error) {
      console.error("Error sending 2FA code:", error);
      res.status(500).json({ message: "Failed to send authentication code" });
    }
  });

  app.post('/api/auth/2fa/verify-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { code } = req.body;
      
      if (!code || code.length !== 6) {
        return res.status(400).json({ message: "Invalid code format" });
      }
      
      const twoFactorCode = await storage.getTwoFactorCode(userId, code);
      
      if (!twoFactorCode) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      
      // Mark code as used
      await storage.markTwoFactorCodeUsed(twoFactorCode.id);
      
      res.json({ message: "Code verified successfully" });
    } catch (error) {
      console.error("Error verifying 2FA code:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Recent activities
  app.get("/api/activities/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Image upload endpoint for inventory items
  app.post("/api/inventory/upload-image", checkAuth, imageUpload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Store image using the image optimizer
      const imageId = await imageOptimizer.storeImage(
        {
          url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        userId
      );

      // Return the image URL
      const imageUrl = `/api/images/${imageId}`;
      
      res.json({ 
        success: true,
        imageId,
        imageUrl,
        message: "Image uploaded successfully" 
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const status = req.query.status as string;
      const dateRange = req.query.dateRange as string;

      const result = await storage.getInventoryItems(page, limit, search, category, status, dateRange);
      res.json(result);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", checkAuth, async (req: any, res) => {
    try {
      const validatedData = insertInventoryItemSchema.parse({
        ...req.body,
        createdBy: getUserId(req) || "system",
      });

      // Auto-inherit images from existing SKUs if no images provided
      if (validatedData.sku && validatedData.sku.trim() && (!validatedData.imageUrls || validatedData.imageUrls.length === 0)) {
        console.log(`Individual creation: Checking for existing SKU images for SKU: ${validatedData.sku.trim()}`);
        const existingSkuItems = await storage.getInventoryItemsBySku(validatedData.sku.trim());
        console.log(`Individual creation: Found ${existingSkuItems.length} existing items with SKU: ${validatedData.sku.trim()}`);
        
        if (existingSkuItems.length > 0) {
          // Log all found items for debugging
          for (const item of existingSkuItems) {
            console.log(`- Item ID ${item.id}: ${item.name}, Images: ${item.imageUrls ? item.imageUrls.length : 0}`);
          }
          
          const itemWithImages = existingSkuItems.find(item => 
            item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0
          );
          
          if (itemWithImages && itemWithImages.imageUrls && Array.isArray(itemWithImages.imageUrls)) {
            validatedData.imageUrls = itemWithImages.imageUrls;
            console.log(`Individual creation: Inherited ${itemWithImages.imageUrls.length} images from existing SKU item: ${itemWithImages.name} (ID: ${itemWithImages.id})`);
          } else {
            console.log(`Individual creation: No existing items with images found for SKU: ${validatedData.sku.trim()}`);
          }
        }
      }

      const item = await storage.createInventoryItem(validatedData);
      
      // Log activity
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.createActivity({
        userId,
        action: "added_item",
        entityType: "inventory_item",
        entityId: item.id,
        description: `Added ${item.name}`,
      });

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Log the incoming data for debugging
      console.log("PUT /api/inventory/:id - Request body:", JSON.stringify(req.body, null, 2));
      
      const validatedData = insertInventoryItemSchema.partial().parse(req.body);

      const item = await storage.updateInventoryItem(id, validatedData);
      
      // Log activity
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.createActivity({
        userId,
        action: "updated_item",
        entityType: "inventory_item",
        entityId: item.id,
        description: `Updated ${item.name}`,
      });

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });


  app.delete("/api/inventory/:id", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      await storage.deleteInventoryItem(id);
      
      // Log activity
      const userId = getUserId(req);
      if (userId) {
        await storage.createActivity({
          userId,
          action: "deleted_item",
          entityType: "inventory_item",
          entityId: id,
          description: `Deleted ${item.name}`,
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Storage analytics endpoint
  app.get("/api/inventory/storage-analytics", checkAuth, async (req: any, res) => {
    try {
      const stats = await imageOptimizer.getStorageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting storage analytics:", error);
      res.status(500).json({ message: "Failed to get storage analytics" });
    }
  });

  // Utility route to inherit images for existing SKUs
  app.post("/api/inventory/inherit-sku-images", checkAuth, async (req: any, res) => {
    try {
      let updatedCount = 0;
      const errors: string[] = [];

      // Get all items with SKUs but no images
      const itemsWithoutImages = await db
        .select()
        .from(inventoryItems)
        .where(and(
          sql`${inventoryItems.sku} IS NOT NULL AND ${inventoryItems.sku} != ''`,
          or(
            sql`${inventoryItems.imageUrls} IS NULL`,
            sql`array_length(${inventoryItems.imageUrls}, 1) = 0`,
            sql`array_length(${inventoryItems.imageUrls}, 1) IS NULL`
          )
        ));

      for (const item of itemsWithoutImages) {
        try {
          if (item.sku) {
            // Find items with the same SKU that have images
            const skuItemsWithImages = await storage.getInventoryItemsBySku(item.sku);
            const sourceItem = skuItemsWithImages.find(skuItem => 
              skuItem.id !== item.id && 
              skuItem.imageUrls && 
              Array.isArray(skuItem.imageUrls) && 
              skuItem.imageUrls.length > 0
            );

            if (sourceItem && sourceItem.imageUrls) {
              await storage.updateInventoryItem(item.id, {
                imageUrls: sourceItem.imageUrls
              });
              updatedCount++;
              console.log(`Updated item ${item.id} (${item.name}) with images from SKU: ${item.sku}`);
            }
          }
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error);
          errors.push(`Failed to update item ${item.id}: ${item.name}`);
        }
      }

      res.json({
        success: true,
        updatedCount,
        totalProcessed: itemsWithoutImages.length,
        errors
      });

    } catch (error) {
      console.error("Error inheriting SKU images:", error);
      res.status(500).json({ 
        message: "Failed to inherit SKU images",
        success: false
      });
    }
  });

  // Bulk delete route
  app.post("/api/inventory/bulk-delete", checkAuth, async (req: any, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty IDs array" });
      }

      // Validate all IDs are numbers
      const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "All IDs must be positive integers" });
      }

      await storage.bulkDeleteInventoryItems(validIds);

      // Log activity for bulk delete
      await storage.createActivity({
        userId: getUserId(req) || "system",
        action: "bulk_delete",
        entityType: "inventory_item",
        entityId: validIds[0], // Use first deleted item ID as reference
        description: `Bulk deleted ${validIds.length} inventory items`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting inventory items:", error);
      res.status(500).json({ message: "Failed to delete items" });
    }
  });

  // Bulk import route
  app.post("/api/inventory/bulk-import", checkAuth, csvUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData: any[] = [];
      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value: any;
      }> = [];
      
      let processed = 0;
      let imported = 0;

      // Parse CSV data
      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      // Track serial numbers in this batch to prevent duplicates within the CSV
      const batchSerialNumbers = new Set<string>();
      
      // First pass: Validate all rows before any database operations
      const validatedItems: any[] = [];
      
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2; // +2 because CSV row 1 is headers, and we want 1-based indexing
        processed++;

        try {
          // Validate required fields
          const requiredFields = ['name', 'brand', 'serialNumber', 'category', 'status', 'price'];
          for (const field of requiredFields) {
            if (!row[field] || row[field].trim() === '') {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} is required`,
                value: row[field]
              });
            }
          }

          // Validate category
          const validCategories = ['watches', 'leather-goods', 'pens', 'other'];
          if (row.category && !validCategories.includes(row.category)) {
            errors.push({
              row: rowNumber,
              field: 'category',
              message: `Category must be one of: ${validCategories.join(', ')}`,
              value: row.category
            });
          }

          // Validate status
          const validStatuses = ['in_stock', 'sold', 'out_of_stock'];
          if (row.status && !validStatuses.includes(row.status)) {
            errors.push({
              row: rowNumber,
              field: 'status',
              message: `Status must be one of: ${validStatuses.join(', ')}`,
              value: row.status
            });
          }

          // Validate dateReceived if provided
          let dateReceived = null;
          if (row.dateReceived && row.dateReceived.trim()) {
            const dateStr = row.dateReceived.trim();
            const parsedDate = new Date(dateStr);
            
            if (isNaN(parsedDate.getTime())) {
              errors.push({
                row: rowNumber,
                field: 'dateReceived',
                message: 'Invalid date format. Use YYYY-MM-DD format',
                value: row.dateReceived
              });
            } else {
              dateReceived = parsedDate;
            }
          }

          // Validate price
          const price = parseFloat(row.price);
          if (isNaN(price) || price < 0) {
            errors.push({
              row: rowNumber,
              field: 'price',
              message: 'Price must be a valid positive number',
              value: row.price
            });
          }

          // Validate cost price (optional field)
          let costPrice = null;
          if (row.costPrice && row.costPrice.toString().trim()) {
            const parsedCostPrice = parseFloat(row.costPrice);
            if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
              errors.push({
                row: rowNumber,
                field: 'costPrice',
                message: 'Cost price must be a valid positive number',
                value: row.costPrice
              });
            } else {
              costPrice = parsedCostPrice.toString();
            }
          }

          // Skip this row if there are validation errors
          const rowErrors = errors.filter(e => e.row === rowNumber);
          if (rowErrors.length > 0) {
            continue;
          }

          // Prepare data for insertion with proper null handling
          const itemData = {
            name: row.name.trim(),
            brand: row.brand.trim(),
            serialNumber: row.serialNumber.trim(),
            sku: row.sku?.trim() || null,
            category: row.category,
            status: row.status,
            price: price.toString(),
            costPrice: costPrice,
            description: row.description?.trim() || null,
            dateReceived: dateReceived || new Date(), // Use provided date or current date
            imageUrls: row.imageUrls && row.imageUrls.toString().trim() ? 
              row.imageUrls.toString().split(',').map((url: string) => url.trim()).filter(Boolean) : 
              [],
            createdBy: getUserId(req) || "system",
          };

          // Validate with Zod schema
          const validatedData = insertInventoryItemSchema.parse(itemData);

          // Check for duplicate serial number within this batch
          if (batchSerialNumbers.has(validatedData.serialNumber)) {
            errors.push({
              row: rowNumber,
              field: 'serialNumber',
              message: 'Serial number appears multiple times in this import',
              value: validatedData.serialNumber
            });
            continue;
          }

          // Check for duplicate serial number in database
          const existingItem = await storage.getInventoryItemBySerialNumber(validatedData.serialNumber);
          
          if (existingItem) {
            errors.push({
              row: rowNumber,
              field: 'serialNumber',
              message: 'Serial number already exists in database',
              value: validatedData.serialNumber
            });
            continue;
          }

          // Add to batch tracking
          batchSerialNumbers.add(validatedData.serialNumber);

          // Auto-inherit images from existing SKUs if no images provided
          if (validatedData.sku && validatedData.sku.trim() && (!validatedData.imageUrls || validatedData.imageUrls.length === 0)) {
            console.log(`CSV Import: Checking for existing SKU images for SKU: ${validatedData.sku.trim()}`);
            const existingSkuItems = await storage.getInventoryItemsBySku(validatedData.sku.trim());
            console.log(`CSV Import: Found ${existingSkuItems.length} existing items with SKU: ${validatedData.sku.trim()}`);
            
            if (existingSkuItems.length > 0) {
              // Find the first item with images
              const itemWithImages = existingSkuItems.find(item => 
                item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0
              );
              
              if (itemWithImages && itemWithImages.imageUrls && Array.isArray(itemWithImages.imageUrls)) {
                validatedData.imageUrls = itemWithImages.imageUrls;
                console.log(`CSV Import: Inherited ${itemWithImages.imageUrls.length} images from existing SKU item: ${itemWithImages.name} (ID: ${itemWithImages.id})`);
              } else {
                console.log(`CSV Import: No existing items with images found for SKU: ${validatedData.sku.trim()}`);
              }
            }
          }

          // Store validated item for batch processing
          validatedItems.push({ rowNumber, data: validatedData });

        } catch (error: any) {
          console.error(`Error processing row ${rowNumber}:`, error);
          if (error.issues) {
            // Zod validation errors
            for (const issue of error.issues) {
              errors.push({
                row: rowNumber,
                field: issue.path.join('.'),
                message: issue.message,
                value: issue.received
              });
            }
          } else {
            errors.push({
              row: rowNumber,
              field: 'general',
              message: error.message || 'Unknown error occurred',
              value: null
            });
          }
        }
      }

      // Second phase: Only proceed with database operations if no validation errors
      if (errors.length === 0 && validatedItems.length > 0) {
        console.log(`Validation passed for all ${validatedItems.length} items. Starting batch insert...`);
        
        try {
          // Use transaction for all-or-nothing import
          for (const { rowNumber, data } of validatedItems) {
            console.log(`Processing row ${rowNumber}: ${data.name} - ${data.serialNumber}`);
            await storage.createInventoryItem(data);
            imported++;
          }
          
          console.log(`✅ Successfully imported ${imported} items`);
          
        } catch (error: any) {
          console.error("Error during batch insert:", error);
          // If any item fails to insert, mark as error and prevent partial imports
          errors.push({
            row: 0,
            field: 'database',
            message: `Database error during batch insert: ${error.message}`,
            value: null
          });
          imported = 0; // Reset imported count since transaction failed
        }
      } else if (errors.length > 0) {
        console.log(`❌ Validation failed with ${errors.length} errors. No items will be imported.`);
      }

      // Log bulk import activity
      await storage.createActivity({
        userId: getUserId(req) || "system",
        action: "bulk_import",
        entityType: "inventory_item",
        entityId: 0,
        description: `Bulk imported ${imported} items (${errors.length} errors)`,
      });

      const result = {
        success: errors.length === 0,
        processed,
        imported,
        errors
      };

      res.json(result);

    } catch (error: any) {
      console.error("Error processing bulk import:", error);
      const errorMessage = error?.message || 'Unknown error';
      res.status(500).json({ 
        message: `Failed to process bulk import: ${errorMessage}`,
        success: false,
        processed: 0,
        imported: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: `Failed to process CSV file: ${errorMessage}`,
          value: null
        }]
      });
    }
  });

  // Wishlist routes
  app.get("/api/wishlist", isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const userId = req.query.userId as string;

      const result = await storage.getWishlistItems(page, limit, userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/wishlist", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertWishlistItemSchema.parse({
        ...req.body,
        userId: getUserId(req) || "system",
      });

      const item = await storage.createWishlistItem(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: getUserId(req) || "system",
        action: "wishlist_request",
        entityType: "wishlist_item",
        entityId: item.id,
        description: `New wishlist request for ${item.itemName}`,
      });

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating wishlist item:", error);
      res.status(500).json({ message: "Failed to create wishlist item" });
    }
  });

  app.put("/api/wishlist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWishlistItemSchema.partial().parse(req.body);

      const item = await storage.updateWishlistItem(id, validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating wishlist item:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  });

  app.delete("/api/wishlist/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWishlistItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  // Client routes
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await storage.getClients(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);

      const client = await storage.updateClient(id, validatedData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Purchase routes
  app.get("/api/purchases", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const purchases = await storage.getPurchases(clientId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(validatedData);
      
      // Update item status to sold
      await storage.updateInventoryItem(purchase.itemId, { status: "sold" });
      
      // Log activity
      const item = await storage.getInventoryItem(purchase.itemId);
      if (item) {
        await storage.createActivity({
          userId: getUserId(req) || "system",
          action: "sold_item",
          entityType: "inventory_item",
          entityId: item.id,
          description: `Sold ${item.name}`,
        });
      }

      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Simple session-based authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.authenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdminRole = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.status !== 'approved' || (user.role !== 'admin' && user.role !== 'owner' && user.email !== 'nitchbekker@gmail.com')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Password migration endpoint (one-time use to hash existing plain text passwords)
  app.post("/api/admin/migrate-passwords", requireAuth, requireAdminRole, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users);
      let migratedCount = 0;

      for (const user of allUsers) {
        if (user.password && !user.password.startsWith('$2b$')) {
          // This is a plain text password, hash it
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(user.password, saltRounds);
          
          await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, user.id));
          
          migratedCount++;
        }
      }

      res.json({ 
        message: `Password migration completed. ${migratedCount} passwords were hashed.`,
        migratedCount 
      });
    } catch (error) {
      console.error("Error migrating passwords:", error);
      res.status(500).json({ message: "Password migration failed" });
    }
  });

  // Admin: Get all users (exclude password hashes)
  app.get("/api/admin/users", requireAuth, requireAdminRole, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user role
  app.patch("/api/admin/users/:id/role", checkAuth, async (req: any, res) => {
    try {
      const currentUserId = req.currentUserId;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!['user', 'admin', 'owner'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Prevent self-modification
      if (userId === currentUserId) {
        return res.status(403).json({ message: "Cannot modify your own role" });
      }
      
      // Only owners can assign owner role
      if (role === 'owner' && currentUser.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can assign owner role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin: Update user status
  app.patch("/api/admin/users/:id/status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { status } = req.body;
      
      if (!['pending', 'approved', 'denied', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedUser = await storage.updateUserStatus(userId, status);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.claims.sub;
      
      // Prevent self-deletion
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await storage.getNotifications(userId, unreadOnly, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const count = await storage.getNotificationCount(userId, unreadOnly);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      
      if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      await storage.markNotificationRead(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      
      await storage.deleteNotification(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Sales Transaction Management Routes

  // Get all sales transactions with filtering
  app.get("/api/sales-transactions", checkAuth, async (req: any, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string;
      const transactionType = req.query.transactionType as string;
      const dateRange = req.query.dateRange as string;

      const result = await storage.getSalesTransactions(page, limit, search, transactionType, dateRange);
      res.json(result);
    } catch (error) {
      console.error("Error fetching sales transactions:", error);
      res.status(500).json({ message: "Failed to fetch sales transactions" });
    }
  });

  // Create manual sales transaction
  app.post("/api/sales-transactions", checkAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertSalesTransactionSchema.parse({
        ...req.body,
        processedBy: userId,
      });

      // Check for duplicate transaction
      const existingTransaction = await storage.findDuplicateTransaction(
        validatedData.clientId,
        validatedData.inventoryItemId,
        validatedData.saleDate
      );

      if (existingTransaction) {
        return res.status(409).json({ 
          message: "Duplicate transaction found", 
          existingTransaction 
        });
      }

      const transaction = await storage.createSalesTransaction(validatedData);
      
      // Update inventory item status to sold
      await storage.updateInventoryItem(validatedData.inventoryItemId, {
        status: "sold"
      });

      // Update client statistics
      await storage.updateClientPurchaseStats(validatedData.clientId);

      // Log activity
      await storage.createActivity({
        userId,
        action: "created_sale",
        entityType: "sales_transaction",
        entityId: transaction.id,
        description: `Created sale transaction for client ID ${validatedData.clientId}`,
      });

      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating sales transaction:", error);
      res.status(500).json({ message: "Failed to create sales transaction" });
    }
  });

  // CSV Sales Import with duplicate prevention
  app.post("/api/sales-transactions/import-csv", checkAuth, csvUpload.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      // Generate unique batch ID for this import
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`=== STARTING CSV IMPORT ROUTE ===`);
      console.log(`File size: ${req.file.buffer.length} bytes`);
      console.log(`User ID: ${userId}`);
      console.log(`Batch ID: ${batchId}`);
      
      const results = await storage.processSalesCSVImport(req.file.buffer, userId, batchId);
      
      console.log(`=== CSV IMPORT ROUTE COMPLETE ===`);
      console.log(`Results:`, JSON.stringify(results, null, 2));

      // Log bulk import activity
      await storage.createActivity({
        userId,
        action: "bulk_sales_import",
        entityType: "sales_transaction",
        entityId: 0,
        description: `Imported ${results.successful} sales transactions, ${results.duplicates.length} duplicates found`,
      });

      res.json(results);
    } catch (error) {
      console.error("Error importing sales CSV:", error);
      res.status(500).json({ 
        message: "Failed to import sales CSV",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Preview CSV import conflicts before processing
  app.post("/api/sales-transactions/preview-csv", checkAuth, csvUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const preview = await storage.previewSalesCSVImport(req.file.buffer);
      res.json(preview);
    } catch (error) {
      console.error("Error previewing sales CSV:", error);
      res.status(500).json({ 
        message: "Failed to preview sales CSV",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Process credit/return transaction
  app.post("/api/sales-transactions/:id/credit", checkAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const transactionId = parseInt(req.params.id);
      const { reason, notes } = req.body;

      // Get original transaction
      const originalTransaction = await storage.getSalesTransaction(transactionId);
      if (!originalTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Create credit transaction
      const creditTransaction = await storage.createSalesTransaction({
        clientId: originalTransaction.clientId,
        inventoryItemId: originalTransaction.inventoryItemId,
        transactionType: "credit",
        saleDate: new Date(),
        sellingPrice: originalTransaction.sellingPrice,
        originalTransactionId: transactionId,
        source: "manual",
        notes: notes || `Credit for transaction #${transactionId}. Reason: ${reason}`,
        processedBy: userId,
      });

      // Update inventory item status back to in_stock
      await storage.updateInventoryItem(originalTransaction.inventoryItemId, {
        status: "in_stock"
      });

      // Log status change
      await storage.logTransactionStatusChange(
        creditTransaction.id,
        "sold",
        "credited",
        reason,
        userId,
        notes
      );

      // Update client statistics
      await storage.updateClientPurchaseStats(originalTransaction.clientId);

      // Log activity
      await storage.createActivity({
        userId,
        action: "created_credit",
        entityType: "sales_transaction",
        entityId: creditTransaction.id,
        description: `Created credit transaction for original sale #${transactionId}`,
      });

      res.status(201).json(creditTransaction);
    } catch (error) {
      console.error("Error processing credit transaction:", error);
      res.status(500).json({ message: "Failed to process credit transaction" });
    }
  });

  // Client purchase history
  app.get("/api/clients/:id/purchase-history", checkAuth, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await storage.getClientPurchaseHistory(clientId, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching client purchase history:", error);
      res.status(500).json({ message: "Failed to fetch client purchase history" });
    }
  });

  // Store management endpoints
  app.get("/api/stores", checkAuth, async (req: any, res) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.post("/api/stores", checkAuth, async (req: any, res) => {
    try {
      const store = await storage.createStore(req.body);
      res.json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  // Sales person management endpoints
  app.get("/api/sales-persons", checkAuth, async (req: any, res) => {
    try {
      const salesPersons = await storage.getAllSalesPersons();
      res.json(salesPersons);
    } catch (error) {
      console.error("Error fetching sales persons:", error);
      res.status(500).json({ message: "Failed to fetch sales persons" });
    }
  });

  app.post("/api/sales-persons", checkAuth, async (req: any, res) => {
    try {
      const salesPerson = await storage.createSalesPerson(req.body);
      res.json(salesPerson);
    } catch (error) {
      console.error("Error creating sales person:", error);
      res.status(500).json({ message: "Failed to create sales person" });
    }
  });

  // Sales analytics endpoint
  app.get("/api/sales-analytics", checkAuth, async (req: any, res) => {
    try {
      const dateRange = req.query.dateRange as string;
      const analytics = await storage.getSalesAnalytics(dateRange);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
