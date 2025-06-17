import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { getUserId } from './authHelper';

export interface AuthenticatedRequest extends Request {
  currentUser?: {
    id: string;
    email: string | null;
    role: 'owner' | 'admin' | 'user';
    status: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

// Base authentication check
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ message: "Account not approved" });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication check failed" });
  }
};

// Admin role requirement (admin or owner)
export const requireAdminRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.currentUser.role !== 'admin' && req.currentUser.role !== 'owner') {
    return res.status(403).json({ 
      message: "Admin privileges required",
      required: ["admin", "owner"],
      current: req.currentUser.role
    });
  }

  next();
};

// Owner role requirement (highest level)
export const requireOwnerRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.currentUser.role !== 'owner') {
    return res.status(403).json({ 
      message: "Owner privileges required",
      required: ["owner"],
      current: req.currentUser.role
    });
  }

  next();
};

// Resource ownership check (user can only modify their own resources)
export const requireOwnership = (getResourceUserId: (req: AuthenticatedRequest) => Promise<string | null>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const resourceUserId = await getResourceUserId(req);
      
      // Admin and owner can access any resource
      if (req.currentUser.role === 'admin' || req.currentUser.role === 'owner') {
        return next();
      }

      // Regular users can only access their own resources
      if (resourceUserId !== req.currentUser.id) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

// Combined middleware for admin operations with detailed logging
export const requireAdminAccess = [requireAuth, requireAdminRole];

// Combined middleware for owner operations with detailed logging  
export const requireOwnerAccess = [requireAuth, requireOwnerRole];

// Role hierarchy validation for user management operations
export const validateRoleHierarchy = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { role: newRole } = req.body;
  const currentUserRole = req.currentUser.role;

  // Role hierarchy: owner > admin > user
  const roleHierarchy: Record<string, number> = { owner: 3, admin: 2, user: 1 };

  // Users cannot elevate their own privileges
  if (req.params.id === req.currentUser.id) {
    return res.status(403).json({ message: "Cannot modify your own role" });
  }

  // Only owners can assign owner role
  if (newRole === 'owner' && currentUserRole !== 'owner') {
    return res.status(403).json({ 
      message: "Only owners can assign owner privileges",
      attempted: newRole,
      userRole: currentUserRole
    });
  }

  // Users can only assign roles lower than their own
  if (roleHierarchy[newRole as string] >= roleHierarchy[currentUserRole as string]) {
    return res.status(403).json({ 
      message: "Cannot assign role equal to or higher than your own",
      attempted: newRole,
      userRole: currentUserRole
    });
  }

  next();
};

// Audit logging for sensitive operations
export const auditLog = (operation: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful operations
      if (res.statusCode < 400 && req.currentUser) {
        console.log(`AUDIT: ${operation}`, {
          user: req.currentUser.id,
          role: req.currentUser.role,
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          params: req.params,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};