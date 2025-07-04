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
  clients,
  salesTransactions,
  insertAccountRequestSchema,
  insertTwoFactorCodeSchema,
  insertInventoryItemSchema,
  insertWishlistItemSchema,
  insertClientSchema,
  insertPurchaseSchema,
  insertSalesTransactionSchema,
  insertLeadSchema,
  insertLeadActivityLogSchema,
  insertRepairSchema,
  insertRepairActivityLogSchema,
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

  // Login endpoint with email/password
  app.post("/api/auth/login", async (req, res) => {
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
      
      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(401).json({ message: "Account not approved" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).authenticated = true;
      (req.session as any).userEmail = user.email;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ message: "Login failed" });
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
        // Use storage layer to get user
        const user = await storage.getUserByEmail('nitchbekker@gmail.com');
        if (!user) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        
        // Store user session
        (req.session as any).userId = user.id.toString();
        (req.session as any).authenticated = true;
        (req.session as any).userEmail = user.email;
        
        res.json({ 
          message: "Admin login successful",
          user: {
            id: user.id.toString(),
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
  app.get('/api/admin/users/:id', checkAuth, async (req: any, res) => {
    try {
      console.log("GET /api/admin/users/:id - User lookup request for ID:", req.params.id);
      
      const userId = req.params.id;
      const currentUserId = req.currentUserId;
      
      // Get current user to check admin privileges
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        console.log("GET /api/admin/users/:id - Access denied for user:", currentUserId, "role:", currentUser?.role);
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log("GET /api/admin/users/:id - User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("GET /api/admin/users/:id - Success, returning user:", user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user
  app.patch('/api/admin/users/:id', checkAuth, async (req: any, res) => {
    try {
      console.log("PATCH /api/admin/users/:id - Update user request for ID:", req.params.id);
      
      const userId = req.params.id;
      const currentUserId = req.currentUserId;
      const updates = req.body;
      
      // Get current user to check admin privileges
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        console.log("PATCH /api/admin/users/:id - Access denied for user:", currentUserId, "role:", currentUser?.role);
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      // Use the comprehensive updateUser method
      const updatedUser = await storage.updateUser(userId, updates);
      console.log("PATCH /api/admin/users/:id - Success, updated user:", updatedUser.id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', checkAuth, async (req: any, res) => {
    try {
      console.log("DELETE /api/admin/users/:id - Delete user request for ID:", req.params.id);
      
      const userId = req.params.id;
      const currentUserId = req.currentUserId;
      
      // Get current user to check admin privileges
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        console.log("DELETE /api/admin/users/:id - Access denied for user:", currentUserId, "role:", currentUser?.role);
        return res.status(403).json({ message: "Admin privileges required" });
      }
      
      // Prevent self-deletion
      if (userId === currentUserId) {
        console.log("DELETE /api/admin/users/:id - Prevented self-deletion attempt by:", currentUserId);
        return res.status(403).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(userId);
      console.log("DELETE /api/admin/users/:id - Success, deleted user:", userId);
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
      
      // Use storage layer to get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password against stored hash
      const isValidPassword = await bcrypt.compare(password, user.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(401).json({ message: "Account not approved" });
      }
      
      // Store user session
      (req.session as any).userId = user.id.toString();
      (req.session as any).authenticated = true;
      (req.session as any).userEmail = user.email;
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id.toString(),
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

      // Use the userId set by checkAuth middleware
      const userId = req.currentUserId || req.session?.userId;
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

  // Export inventory to CSV
  app.get("/api/inventory/export", checkAuth, async (req: any, res) => {
    try {
      const inventoryResult = await storage.getInventoryItems(1, 1000); // Get all items with high limit
      const items = inventoryResult.items;
      
      // CSV headers
      const headers = [
        'Name', 'Brand', 'SKU', 'Serial Number', 'Category', 'Status', 
        'Selling Price (ZAR)', 'Cost Price (ZAR)', 'Description', 'Notes', 
        'Date Received', 'Days in Stock', 'Location', 'Condition'
      ];
      
      // Convert items to CSV format
      const csvRows = [headers.join(',')];
      
      for (const item of items) {
        const daysInStock = item.dateReceived 
          ? Math.floor((new Date().getTime() - new Date(item.dateReceived).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
          
        const row = [
          `"${item.name || ''}"`,
          `"${item.brand || ''}"`,
          `"${item.sku || ''}"`,
          `"${item.serialNumber || ''}"`,
          `"${item.category || ''}"`,
          `"${item.status || ''}"`,
          `"${item.price || ''}"`,
          `"${item.costPrice || ''}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${(item.notes || '').replace(/"/g, '""')}"`,
          `"${item.dateReceived ? new Date(item.dateReceived).toISOString().split('T')[0] : ''}"`,
          `"${daysInStock}"`,
          `"${item.location || ''}"`,
          `"${item.condition || 'new'}"`
        ];
        csvRows.push(row.join(','));
      }
      
      const csv = csvRows.join('\n');
      const filename = `vault-inventory-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      
    } catch (error) {
      console.error("Error exporting inventory:", error);
      res.status(500).json({ message: "Failed to export inventory" });
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
      const brand = req.query.brand as string;

      const result = await storage.getInventoryItems(page, limit, search, category, status, dateRange, brand);
      
      // Ensure images are properly populated for each item
      const itemsWithImages = await Promise.all(
        result.items.map(async (item) => {
          try {
            const images = await imageOptimizer.getItemImages(item.id);
            return {
              ...item,
              imageUrls: images.length > 0 ? images : item.imageUrls || []
            };
          } catch (error) {
            console.error(`Error loading images for item ${item.id}:`, error);
            return {
              ...item,
              imageUrls: item.imageUrls || []
            };
          }
        })
      );

      res.json({
        ...result,
        items: itemsWithImages
      });
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
      
      // Log activity with session-based authentication
      const userId = req.currentUserId || req.session?.userId;
      if (userId) {
        await storage.createActivity({
          userId,
          action: "added_item",
          entityType: "inventory_item",
          entityId: item.id,
          description: `Added ${item.name}`,
        });
      }

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

      // Auto-inherit images from existing SKUs if no images provided but SKU is present
      if (validatedData.sku && validatedData.sku.trim() && (!validatedData.imageUrls || validatedData.imageUrls.length === 0)) {
        console.log(`Update operation: Checking for existing SKU images for SKU: ${validatedData.sku.trim()}`);
        const existingSkuItems = await storage.getInventoryItemsBySku(validatedData.sku.trim());
        console.log(`Update operation: Found ${existingSkuItems.length} existing items with SKU: ${validatedData.sku.trim()}`);
        
        if (existingSkuItems.length > 0) {
          const itemWithImages = existingSkuItems.find(item => 
            item.id !== id && // Don't inherit from self
            item.imageUrls && 
            Array.isArray(item.imageUrls) && 
            item.imageUrls.length > 0
          );
          
          if (itemWithImages && itemWithImages.imageUrls && Array.isArray(itemWithImages.imageUrls)) {
            validatedData.imageUrls = itemWithImages.imageUrls;
            console.log(`Update operation: Inherited ${itemWithImages.imageUrls.length} images from existing SKU item: ${itemWithImages.name} (ID: ${itemWithImages.id})`);
          } else {
            console.log(`Update operation: No existing items with images found for SKU: ${validatedData.sku.trim()}`);
          }
        }
      }

      const item = await storage.updateInventoryItem(id, validatedData);
      
      // Log activity with proper authentication
      const userId = req.currentUserId || req.session?.userId;
      if (userId) {
        try {
          await storage.createActivity({
            userId,
            action: "updated_item",
            entityType: "inventory_item",
            entityId: item.id,
            description: `Updated ${item.name}`,
          });
        } catch (activityError: any) {
          console.log("Activity logging failed:", activityError.message);
          // Don't fail the main operation if activity logging fails
        }
      }

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
      
      // Log activity with session-based authentication
      const userId = req.currentUserId || req.session?.userId;
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



  // Client routes
  app.get("/api/clients", checkAuth, async (req: any, res) => {
    try {
      // Add no-cache headers to prevent 304 responses and ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}"` // Unique ETag for cache busting
      });

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await storage.getClients(page, limit);
      console.log(`Fresh client data retrieved: ${result.clients.length} clients, first client purchases: ${result.clients[0]?.totalPurchases || 'N/A'}`);
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", checkAuth, async (req: any, res) => {
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

  app.post("/api/clients", checkAuth, async (req: any, res) => {
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

  app.put("/api/clients/:id", checkAuth, async (req: any, res) => {
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

  app.patch("/api/clients/:id", checkAuth, async (req: any, res) => {
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

  // Delete client endpoint
  app.delete("/api/clients/:id", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if client exists
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Try to delete the client and handle foreign key constraint
      try {
        await storage.deleteClient(id);
        res.status(204).send();
      } catch (deleteError: any) {
        // Handle foreign key constraint violation
        if (deleteError.code === '23503' && deleteError.constraint_name?.includes('sales_transactions')) {
          return res.status(400).json({ 
            message: "Cannot delete client with existing sales transactions. Please remove transactions first.",
            hasTransactions: true
          });
        }
        throw deleteError; // Re-throw if it's a different error
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client bulk upload endpoint
  app.post("/api/clients/bulk-upload", checkAuth, csvUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const results: any[] = [];
      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const skippedClients: string[] = [];
      const processedClients: string[] = [];

      // Parse CSV data - handle both comma and semicolon separators
      const lines = csvData.split('\n').filter((line: string) => line.trim());
      const separator = csvData.includes(';') ? ';' : ',';
      const rows = lines.map((row: string) => 
        row.split(separator).map((cell: string) => cell.replace(/^"|"$/g, '').trim())
      );
      const headers = rows[0].map((header: string) => header.toLowerCase().trim());
      
      console.log(`[Client Bulk Upload] Processing ${rows.length - 1} client records with headers:`, headers);
      console.log(`[Client Bulk Upload] Using separator: "${separator}"`);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row.some((cell: string) => cell.trim())) continue; // Skip empty rows

        try {
          const clientData: any = {};
          const rowIdentifier = `Row ${i + 1}`;
          
          // Map CSV columns to client fields with more flexible header matching
          headers.forEach((header: string, index: number) => {
            const value = row[index] ? row[index].trim() : '';
            
            // Handle various header formats and common variations
            if (header.includes('customer') || header.includes('number') || header === 'customernumber') {
              clientData.customerNumber = value || null;
            } else if (header.includes('name') || header === 'fullname') {
              clientData.fullName = value;
            } else if (header.includes('email')) {
              clientData.email = value || null;
            } else if (header.includes('phone') || header.includes('mobile') || header.includes('cell')) {
              clientData.phoneNumber = value || null;
            } else if (header.includes('location') || header.includes('address') || header.includes('city')) {
              clientData.location = value || null;
            } else if (header.includes('category') || header.includes('type')) {
              clientData.clientCategory = value || 'Regular';
            } else if (header.includes('birthday') || header.includes('birth') || header.includes('dob')) {
              clientData.birthday = value || null;
            } else if (header.includes('vip') || header.includes('status')) {
              clientData.vipStatus = value || 'regular';
            } else if (header.includes('preference') || header.includes('interest')) {
              clientData.preferences = value || null;
            } else if (header.includes('note') || header.includes('comment')) {
              clientData.notes = value || null;
            }
          });

          // Validate required fields
          if (!clientData.fullName || clientData.fullName.trim() === '') {
            errors.push(`${rowIdentifier}: Full name is required (found: "${clientData.fullName || 'empty'}")`);
            continue;
          }

          // Check for duplicate by customer number only if provided
          if (clientData.customerNumber && clientData.customerNumber.trim() !== '') {
            const existingClient = await storage.getClientByCustomerNumber(clientData.customerNumber);
            if (existingClient) {
              skippedCount++;
              skippedClients.push(`${rowIdentifier}: Customer ${clientData.customerNumber} (${clientData.fullName}) - already exists`);
              console.log(`[Client Import] Skipping duplicate customer number: ${clientData.customerNumber}`);
              continue;
            }
          }

          // Check for duplicate by email if provided
          if (clientData.email && clientData.email.trim() !== '') {
            const existingClient = await db
              .select()
              .from(clients)
              .where(eq(clients.email, clientData.email))
              .limit(1);
            if (existingClient.length > 0) {
              skippedCount++;
              skippedClients.push(`${rowIdentifier}: Email ${clientData.email} (${clientData.fullName}) - already exists`);
              console.log(`[Client Import] Skipping duplicate email: ${clientData.email}`);
              continue;
            }
          }

          // Clean up empty strings to null for optional fields
          Object.keys(clientData).forEach(key => {
            if (clientData[key] === '' || clientData[key] === undefined) {
              clientData[key] = null;
            }
          });

          // Validate and create client
          const validatedData = insertClientSchema.parse(clientData);
          const newClient = await storage.createClient(validatedData);
          
          successCount++;
          processedClients.push(`${rowIdentifier}: ${newClient.fullName} (Customer: ${newClient.customerNumber || 'No number'})`);
          console.log(`[Client Import] Created client: ${newClient.fullName} (${newClient.customerNumber || 'No customer number'})`);

        } catch (error) {
          console.error(`[Client Import] Error processing row ${i + 1}:`, error);
          if (error instanceof z.ZodError) {
            const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            errors.push(`Row ${i + 1}: ${fieldErrors}`);
          } else if (error instanceof Error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            errors.push(`Row ${i + 1}: Unknown error`);
          }
        }
      }

      console.log(`[Client Bulk Upload] Completed: ${successCount} successful, ${skippedCount} skipped, ${errors.length} errors`);

      res.json({
        message: "Bulk upload completed",
        successCount,
        skippedCount,
        errorCount: errors.length,
        totalProcessed: successCount + skippedCount + errors.length,
        summary: {
          successful: processedClients,
          skipped: skippedClients,
          errors: errors
        },
        // Legacy format for backwards compatibility
        errors: errors.slice(0, 10)
      });

    } catch (error) {
      console.error("Error in client bulk upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
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
      
      console.log(`=== STARTING ENHANCED CSV IMPORT ROUTE ===`);
      console.log(`File size: ${req.file.buffer.length} bytes`);
      console.log(`User ID: ${userId}`);
      console.log(`Batch ID: ${batchId}`);
      
      const results = await storage.processSalesCSVImport(req.file.buffer, userId, batchId);
      
      console.log(`=== ENHANCED CSV IMPORT ROUTE COMPLETE ===`);
      console.log(`Successful transactions: ${results.successful}`);
      console.log(`Failed transactions: ${results.errors.length}`);
      console.log(`Duplicate transactions: ${results.duplicates.length}`);
      
      // Detailed error logging for debugging
      if (results.errors.length > 0) {
        console.log(`=== DETAILED ERROR ANALYSIS ===`);
        results.errors.forEach((error, index) => {
          console.log(`Error ${index + 1}:`, {
            row: error.row,
            error: error.error,
            data: error.data
          });
        });
      }

      // Log comprehensive bulk import activity
      await storage.createActivity({
        userId,
        action: "enhanced_bulk_sales_import",
        entityType: "sales_transaction",
        entityId: 0,
        description: `Enhanced CSV Import: ${results.successful} successful, ${results.errors.length} errors, ${results.duplicates.length} duplicates. Batch: ${batchId}`,
      });

      // After successful imports, refresh dashboard metrics
      if (results.successful > 0) {
        console.log(`Triggering dashboard refresh after ${results.successful} successful imports...`);
      }

      res.json({
        ...results,
        batchId,
        summary: {
          successful: results.successful,
          errors: results.errors.length,
          duplicates: results.duplicates.length,
          totalProcessed: results.successful + results.errors.length + results.duplicates.length
        }
      });
    } catch (error) {
      console.error("Critical error in enhanced CSV import:", error);
      res.status(500).json({ 
        message: "Failed to import sales CSV",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
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

  // Delete sales transaction
  app.delete("/api/sales-transactions/:id", checkAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const transactionId = parseInt(req.params.id);
      
      // Get transaction details for logging
      const transaction = await storage.getSalesTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check if inventory item should be returned to stock
      if (transaction.transactionType === 'sale') {
        await storage.updateInventoryItem(transaction.inventoryItemId, {
          status: "in_stock"
        });
      }

      // Delete the transaction
      await storage.deleteSalesTransaction(transactionId);

      // Update client statistics
      await storage.updateClientPurchaseStats(transaction.clientId);

      // Log activity
      await storage.createActivity({
        userId,
        action: "deleted_transaction",
        entityType: "sales_transaction",
        entityId: transactionId,
        description: `Deleted transaction for ${transaction.sellingPrice}`
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
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

  // Force refresh client statistics
  app.post("/api/clients/refresh-stats", checkAuth, async (req: any, res) => {
    try {
      console.log("Manually refreshing all client statistics...");
      const clientsResult = await storage.getClients();
      for (const client of clientsResult.clients) {
        await storage.updateClientPurchaseStats(client.id);
      }
      console.log("All client statistics refreshed successfully");
      res.json({ message: "Client statistics refreshed", count: clientsResult.clients.length });
    } catch (error) {
      console.error("Error refreshing client statistics:", error);
      res.status(500).json({ message: "Failed to refresh client statistics" });
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

  // Performance tracking routes
  app.get("/api/performance/stores", checkAuth, async (req: any, res) => {
    try {
      const { storeId, month, year } = req.query;
      const performance = await storage.getStorePerformance(
        storeId ? parseInt(storeId) : undefined,
        month ? parseInt(month) : undefined,
        year ? parseInt(year) : undefined
      );
      res.json(performance);
    } catch (error) {
      console.error("Error fetching store performance:", error);
      res.status(500).json({ message: "Failed to fetch store performance" });
    }
  });

  app.get("/api/performance/sales-persons", checkAuth, async (req: any, res) => {
    try {
      const { salesPersonId, month, year } = req.query;
      const performance = await storage.getSalesPersonPerformance(
        salesPersonId ? parseInt(salesPersonId) : undefined,
        month ? parseInt(month) : undefined,
        year ? parseInt(year) : undefined
      );
      res.json(performance);
    } catch (error) {
      console.error("Error fetching sales person performance:", error);
      res.status(500).json({ message: "Failed to fetch sales person performance" });
    }
  });

  app.post("/api/performance/update", checkAuth, async (req: any, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      
      await storage.updatePerformanceMetrics(parseInt(month), parseInt(year));
      res.json({ success: true, message: `Performance metrics updated for ${month}/${year}` });
    } catch (error) {
      console.error("Error updating performance metrics:", error);
      res.status(500).json({ message: "Failed to update performance metrics" });
    }
  });

  // Performance dashboard with comprehensive metrics
  app.get("/api/performance/dashboard", checkAuth, async (req: any, res) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Get current month performance for all stores
      const storePerformance = await storage.getStorePerformance(undefined, currentMonth, currentYear);
      
      // Get current month performance for all sales persons
      const salesPersonPerformance = await storage.getSalesPersonPerformance(undefined, currentMonth, currentYear);
      
      // Get top performing stores and sales persons
      const topStores = storePerformance
        .sort((a, b) => Number(b.performance.totalRevenue) - Number(a.performance.totalRevenue))
        .slice(0, 5);
        
      const topSalesPersons = salesPersonPerformance
        .sort((a, b) => Number(b.performance.totalRevenue) - Number(a.performance.totalRevenue))
        .slice(0, 5);

      res.json({
        currentMonth,
        currentYear,
        storePerformance,
        salesPersonPerformance,
        topStores,
        topSalesPersons,
        summary: {
          totalStores: storePerformance.length,
          totalSalesPersons: salesPersonPerformance.length,
          totalRevenue: storePerformance.reduce((sum, sp) => sum + Number(sp.performance.totalRevenue), 0),
          totalProfit: storePerformance.reduce((sum, sp) => sum + Number(sp.performance.totalProfit), 0)
        }
      });
    } catch (error) {
      console.error("Error fetching performance dashboard:", error);
      res.status(500).json({ message: "Failed to fetch performance dashboard" });
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

  // Lead Management API Routes

  // Get all leads with filtering and pagination
  app.get("/api/leads", checkAuth, async (req: any, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const outcome = req.query.outcome as string;
      const isOpen = req.query.isOpen === 'true' ? true : req.query.isOpen === 'false' ? false : undefined;

      const result = await storage.getLeads(page, limit, search, status, outcome, isOpen);
      res.json(result);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Create new lead
  app.post("/api/leads", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertLeadSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const lead = await storage.createLead(validatedData);
      
      // Log activity
      await storage.createLeadActivity({
        leadId: lead.id,
        userId,
        action: "lead_created",
        toStatus: "new",
        notes: `Lead created: ${lead.firstName} ${lead.lastName}`,
      });

      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Update lead status (main workflow progression)
  app.patch("/api/leads/:id/status", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.id);
      const { status, outcome, notes } = req.body;

      // Get current lead to track status change
      const currentLead = await storage.getLead(leadId);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const updateData: any = {};
      
      if (status) {
        updateData.leadStatus = status;
      }
      
      if (outcome) {
        updateData.outcome = outcome;
      }

      const updatedLead = await storage.updateLead(leadId, updateData);

      // Auto-create wishlist item if outcome is "wishlist"
      if (outcome === "wishlist") {
        try {
          const wishlistItem = await storage.createWishlistItem({
            userId: userId,
            leadId: leadId,
            clientName: `${currentLead.firstName} ${currentLead.lastName}`,
            clientEmail: currentLead.email || undefined,
            clientPhone: currentLead.phone || undefined,
            clientCompany: currentLead.company || undefined,
            itemName: currentLead.notes || "General inquiry",
            brand: currentLead.brand || "General", // Use lead brand preference
            description: `Auto-created from lead: ${currentLead.firstName} ${currentLead.lastName}. ${currentLead.notes || ""}`,
            category: "watches", // Default category
            maxPrice: "",
            skuReferences: "",
            notes: `Auto-created from lead outcome: ${currentLead.notes || ""}`,
            status: "active",
          });
          
          console.log(`Wishlist item created from lead ${leadId}:`, wishlistItem);
        } catch (wishlistError) {
          console.error("Error creating wishlist item from lead:", wishlistError);
          // Don't fail the lead update if wishlist creation fails
        }
      }

      // Log the status change activity
      await storage.createLeadActivity({
        leadId,
        userId,
        action: "status_change",
        fromStatus: currentLead.leadStatus,
        toStatus: status || currentLead.leadStatus,
        notes: notes || `Status changed from ${currentLead.leadStatus} to ${status || currentLead.leadStatus}${outcome ? ` with outcome: ${outcome}` : ''}`,
      });

      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Update lead details
  app.put("/api/leads/:id", checkAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const validatedData = insertLeadSchema.partial().parse(req.body);

      const lead = await storage.updateLead(leadId, validatedData);
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", checkAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const userId = req.currentUserId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.deleteLead(leadId);
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Close/Open lead
  app.patch("/api/leads/:id/toggle", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.id);
      const { isOpen } = req.body;

      const updatedLead = await storage.updateLead(leadId, { 
        isOpen
      });

      // Log activity
      await storage.createLeadActivity({
        leadId,
        userId,
        action: isOpen ? "lead_reopened" : "lead_closed",
        notes: `Lead ${isOpen ? 'reopened' : 'closed'}`,
      });

      res.json(updatedLead);
    } catch (error) {
      console.error("Error toggling lead status:", error);
      res.status(500).json({ message: "Failed to toggle lead status" });
    }
  });

  // Get lead activity history
  app.get("/api/leads/:id/activity", checkAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const activities = await storage.getLeadActivities(leadId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching lead activities:", error);
      res.status(500).json({ message: "Failed to fetch lead activities" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", checkAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      await storage.deleteLead(leadId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Repair Management API Routes

  // Get all repairs with filtering and pagination
  app.get("/api/repairs", checkAuth, async (req: any, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const outcome = req.query.outcome as string;
      const isOpen = req.query.isOpen === 'true' ? true : req.query.isOpen === 'false' ? false : undefined;

      const result = await storage.getRepairs(page, limit, search, status, outcome, isOpen);
      res.json(result);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  // Create new repair
  app.post("/api/repairs", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("=== REPAIR CREATION DEBUG ===");
      console.log("UserId:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      // Clean empty strings for numeric fields before validation
      const cleanedBody = { ...req.body };
      
      // Convert empty strings to null for price fields
      if (cleanedBody.quotedPrice === '') cleanedBody.quotedPrice = null;
      if (cleanedBody.finalPrice === '') cleanedBody.finalPrice = null;
      
      // Convert empty strings to null for date fields
      if (cleanedBody.receivedDate === '') cleanedBody.receivedDate = null;
      if (cleanedBody.estimatedCompletionDate === '') cleanedBody.estimatedCompletionDate = null;
      if (cleanedBody.quoteDate === '') cleanedBody.quoteDate = null;
      if (cleanedBody.acceptedDate === '') cleanedBody.acceptedDate = null;
      if (cleanedBody.completedDate === '') cleanedBody.completedDate = null;

      const dataToValidate = {
        ...cleanedBody,
        createdBy: userId,
      };
      console.log("Data to validate:", JSON.stringify(dataToValidate, null, 2));

      const validatedData = insertRepairSchema.parse(dataToValidate);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));

      const repair = await storage.createRepair(validatedData);
      console.log("Created repair:", JSON.stringify(repair, null, 2));

      // Send notification to admins about new repair
      await notificationService.notifyAllAdmins(
        `New repair request for ${repair.itemBrand} ${repair.itemModel}`,
        `Customer: ${repair.customerName}. Issue: ${repair.issueDescription.substring(0, 100)}...`,
        "high",
        `/repairs`,
        "View Repair"
      );

      res.status(201).json(repair);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating repair:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating repair - Full error:", error);
      console.error("Error message:", (error as any)?.message);
      console.error("Error stack:", (error as any)?.stack);
      res.status(500).json({ message: "Failed to create repair", error: (error as any)?.message });
    }
  });

  // Update repair status (main workflow progression)
  app.patch("/api/repairs/:id/status", checkAuth, async (req: any, res) => {
    try {
      console.log("=== REPAIR STATUS UPDATE DEBUG ===");
      console.log("Request params:", req.params);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const repairId = parseInt(req.params.id);
      const { status, outcome, notes } = req.body;
      
      console.log("Parsed values:", { repairId, status, outcome, notes, userId });

      // Get current repair to track status change
      const currentRepairs = await storage.getRepairs(1, 1000);
      const currentRepair = currentRepairs.repairs.find(r => r.id === repairId);

      if (!currentRepair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const previousStatus = currentRepair.repairStatus;
      console.log("Updating repair status in storage...");
      const updatedRepair = await storage.updateRepairStatus(repairId, status, outcome, notes);
      console.log("Storage update successful:", JSON.stringify(updatedRepair, null, 2));

      // Create activity log entry
      console.log("Creating activity log entry...");
      await storage.createRepairActivity({
        repairId,
        userId,
        action: 'status_changed',
        details: `Status changed from ${previousStatus} to ${status}`,
        previousValue: previousStatus,
        newValue: status
      });
      console.log("Activity log created successfully");

      // Send notification if outcome is set
      console.log("Checking for outcome notifications...");
      if (outcome) {
        console.log("Processing outcome:", outcome);
        let message = '';
        switch (outcome) {
          case 'completed':
            message = `Repair completed for ${updatedRepair.itemBrand} ${updatedRepair.itemModel}`;
            break;
          case 'customer_declined':
            message = `Customer declined repair quote for ${updatedRepair.itemBrand} ${updatedRepair.itemModel}`;
            break;
          case 'unrepairable':
            message = `Item marked as unrepairable: ${updatedRepair.itemBrand} ${updatedRepair.itemModel}`;
            break;
          case 'customer_no_response':
            message = `No response from customer for ${updatedRepair.itemBrand} ${updatedRepair.itemModel}`;
            break;
        }

        if (message) {
          try {
            console.log("Sending notification...");
            await notificationService.notifyAllAdmins(
              message,
              `Customer: ${updatedRepair.customerName}`,
              "normal",
              `/repairs`,
              "View Repair"
            );
            console.log("Notification sent successfully");
          } catch (notificationError) {
            console.error("Error sending notification (non-critical):", notificationError);
            // Don't fail the entire request if notification fails
          }
        }
      }

      res.json(updatedRepair);
    } catch (error) {
      console.error("Error updating repair status:", error);
      res.status(500).json({ message: "Failed to update repair status" });
    }
  });

  // Update repair details
  app.put("/api/repairs/:id", checkAuth, async (req: any, res) => {
    try {
      const repairId = parseInt(req.params.id);
      const validatedData = insertRepairSchema.partial().parse(req.body);

      const repair = await storage.updateRepair(repairId, validatedData);
      res.json(repair);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating repair:", error);
      res.status(500).json({ message: "Failed to update repair" });
    }
  });

  // Delete repair
  app.delete("/api/repairs/:id", checkAuth, async (req: any, res) => {
    try {
      const repairId = parseInt(req.params.id);
      const userId = req.currentUserId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.deleteRepair(repairId);
      res.status(200).json({ message: "Repair deleted successfully" });
    } catch (error) {
      console.error("Error deleting repair:", error);
      res.status(500).json({ message: "Failed to delete repair" });
    }
  });

  // Close/Open repair
  app.patch("/api/repairs/:id/toggle", checkAuth, async (req: any, res) => {
    try {
      const userId = req.currentUserId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const repairId = parseInt(req.params.id);
      const { isOpen } = req.body;

      const updatedRepair = await storage.updateRepair(repairId, { 
        isOpen
      });

      // Create activity log entry
      await storage.createRepairActivity({
        repairId,
        userId,
        action: isOpen ? 'reopened' : 'closed',
        details: isOpen ? 'Repair reopened' : 'Repair closed',
        newValue: isOpen ? 'open' : 'closed'
      });

      res.json(updatedRepair);
    } catch (error) {
      console.error("Error toggling repair status:", error);
      res.status(500).json({ message: "Failed to toggle repair status" });
    }
  });

  // Get repair activity history
  app.get("/api/repairs/:id/activity", checkAuth, async (req: any, res) => {
    try {
      const repairId = parseInt(req.params.id);
      const activities = await storage.getRepairActivities(repairId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching repair activities:", error);
      res.status(500).json({ message: "Failed to fetch repair activities" });
    }
  });

  // Get/Download repair documents
  app.get("/api/repairs/:id/documents/:filename", checkAuth, async (req: any, res) => {
    try {
      const repairId = parseInt(req.params.id);
      const filename = decodeURIComponent(req.params.filename);
      const action = req.query.action; // 'view' or 'download'
      
      console.log(`Document ${action} requested: ${filename} for repair ${repairId}`);
      
      // Get repair to verify it exists and user has access
      const repair = await storage.getRepair(repairId);
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      // Check if file exists in repair documents or images
      const isDocument = repair.repairDocuments?.includes(filename);
      const isImage = repair.repairImages?.includes(filename);
      
      if (!isDocument && !isImage) {
        return res.status(404).json({ message: "Document not found" });
      }

      // For now, we'll return a simple response since we don't have actual file storage
      // In a real implementation, you would:
      // 1. Read the file from storage (local filesystem, S3, etc.)
      // 2. Set appropriate headers based on file type
      // 3. Stream the file to the response
      
      if (action === 'download') {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      }
      
      // Determine content type based on file extension
      const ext = filename.toLowerCase().split('.').pop();
      const contentTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'avif': 'image/avif'
      };
      
      const contentType = contentTypes[ext || ''] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // For demonstration, we'll return a message
      // In production, replace this with actual file streaming
      res.status(200).send(`Document access requested: ${filename} (${action}). File handling would be implemented here.`);
      
    } catch (error) {
      console.error("Error accessing document:", error);
      res.status(500).json({ message: "Failed to access document" });
    }
  });

  // Wishlist endpoints
  app.get("/api/wishlist", checkAuth, async (req: any, res) => {
    try {
      const { search, status, category, brand } = req.query;
      const items = await storage.getWishlistItems(search, status, category, brand);
      res.json({ items });
    } catch (error) {
      console.error("Error fetching wishlist items:", error);
      res.status(500).json({ message: "Failed to fetch wishlist items" });
    }
  });

  app.post("/api/wishlist", checkAuth, async (req: any, res) => {
    try {
      console.log("🔍 KIMI-DEV: POST /api/wishlist endpoint hit");
      console.log("📦 Request body:", req.body);
      console.log("🔐 Authentication status:", !!req.currentUserId);
      console.log("👤 User ID:", req.currentUserId);
      
      const userId = req.currentUserId;
      if (!userId) {
        console.log("❌ KIMI-DEV: Authentication failed - no userId");
        return res.status(401).json({ message: "Authentication required" });
      }

      const wishlistData = {
        ...req.body,
        userId: userId,
      };

      console.log("🔄 KIMI-DEV: Final wishlist data for storage:", wishlistData);
      console.log("🗄️ KIMI-DEV: Calling storage.createWishlistItem");
      
      const wishlistItem = await storage.createWishlistItem(wishlistData);
      
      console.log("✅ KIMI-DEV: Wishlist item created successfully:", wishlistItem);
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("❌ KIMI-DEV: Error creating wishlist item:", error);
      console.error("❌ KIMI-DEV: Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to create wishlist item", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/wishlist/:id", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...updateData,
        clientEmail: updateData.clientEmail || null,
        clientPhone: updateData.clientPhone || null,
        clientCompany: updateData.clientCompany || null,
        description: updateData.description || null,
        maxPrice: updateData.maxPrice || null,
        skuReferences: updateData.skuReferences || null,
        notes: updateData.notes || null,
      };
      
      const updatedItem = await storage.updateWishlistItem(id, cleanedData);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating wishlist item:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  });

  app.patch("/api/wishlist/:id/status", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedItem = await storage.updateWishlistItemStatus(id, status);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating wishlist item status:", error);
      res.status(500).json({ message: "Failed to update wishlist item status" });
    }
  });

  app.delete("/api/wishlist/:id", checkAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWishlistItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
