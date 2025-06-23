import type { Request } from "express";

// Helper function to get user ID from request object
export function getUserId(req: any): string | null {
  try {
    // Check session-based authentication first
    if (req.session?.userId && req.session?.authenticated) {
      return req.session.userId;
    }
    
    // Fallback to Passport authentication if available
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return req.user?.claims?.sub || req.user?.id || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

// Helper function to check if user is authenticated
export function isUserAuthenticated(req: any): boolean {
  // Check session-based authentication first
  if (req.session?.userId && req.session?.authenticated) {
    return true;
  }
  
  // Fallback to Passport authentication
  return req.isAuthenticated && req.isAuthenticated() && !!getUserId(req);
}

// Middleware to add user ID to request
export function addUserContext(req: any, res: any, next: any) {
  // Add user ID from session or Passport authentication
  req.userId = getUserId(req);
  next();
}