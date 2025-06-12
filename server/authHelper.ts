import type { Request } from "express";

// Helper function to get user ID from request object
export function getUserId(req: any): string | null {
  if (!req.isAuthenticated() || !req.user) {
    return null;
  }
  
  // Handle different user object structures
  return req.user?.claims?.sub || req.user?.id || null;
}

// Helper function to check if user is authenticated
export function isUserAuthenticated(req: any): boolean {
  return req.isAuthenticated() && !!getUserId(req);
}

// Middleware to add user ID to request
export function addUserContext(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    req.userId = getUserId(req);
  }
  next();
}