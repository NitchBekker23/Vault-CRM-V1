import type { Request, Response, NextFunction } from 'express';
import { getUserId } from './authHelper';
import { storage } from './storage';

// Enhanced security middleware with role-based access control
export function requireRole(requiredRole: 'admin' | 'user') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (user.status !== 'approved' && user.status !== 'active') {
        return res.status(403).json({ message: 'Account not active' });
      }
      
      if (requiredRole === 'admin' && user.role !== 'admin' && user.role !== 'owner') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // Add user info to request for downstream use
      (req as any).currentUser = user;
      next();
      
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Authorization check failed' });
    }
  };
}

// Resource ownership validation
export function requireOwnership(getResourceUserId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const user = (req as any).currentUser;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Admins can access all resources
      if (user?.role === 'admin') {
        return next();
      }
      
      const resourceUserId = await getResourceUserId(req);
      
      if (!resourceUserId || resourceUserId !== userId) {
        return res.status(403).json({ message: 'Access denied to this resource' });
      }
      
      next();
      
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ message: 'Resource access check failed' });
    }
  };
}

// Input validation and sanitization
export function validateInput(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid input data',
          errors: result.error.errors 
        });
      }
      
      req.body = result.data;
      next();
      
    } catch (error) {
      console.error('Input validation error:', error);
      res.status(400).json({ message: 'Input validation failed' });
    }
  };
}

// Rate limiting per user
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserId(req) || req.ip;
    const now = Date.now();
    
    const userLimit = rateLimitStore.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }
    
    userLimit.count++;
    next();
  };
}

// Activity logging middleware
export function logActivity(action: string, entityType?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      
      if (userId) {
        await storage.createActivity({
          userId,
          action,
          entityType,
          entityId: req.params.id,
          details: {
            method: req.method,
            path: req.path,
            body: req.method !== 'GET' ? req.body : undefined
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't block the request if logging fails
      next();
    }
  };
}