/**
 * Authentication Middleware (Scaffold)
 * 
 * Ready for JWT or Clerk integration when multi-org support is needed.
 * Currently allows all requests (single-org mode).
 */

/**
 * Basic API key authentication for admin endpoints
 * Used by: /api/ai-usage, /api/slack/refresh-all, /api/calendar/refresh-all, /api/notifications/weekly
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // If no API_KEY configured, allow all (development mode)
  if (!process.env.API_KEY) {
    return next();
  }
  
  // Verify API key matches
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ 
      message: 'Unauthorized: Invalid or missing API key',
      hint: 'Include x-api-key header with your API key'
    });
  }
  
  next();
}

/**
 * JWT Authentication (ENABLED)
 * 
 * JWT auth is now active for protected routes.
 * Set JWT_SECRET in environment variables.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      message: 'Unauthorized: No token provided',
      hint: 'Include Authorization: Bearer <token> header'
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, teamId, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Unauthorized: Invalid token',
      error: error.message
    });
  }
}

// Require admin role
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Forbidden: Admin access required'
    });
  }
  next();
}

// Require one of the given roles
export function requireRoles(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role', required: allowed, current: role });
    }
    next();
  };
}

/**
 * Clerk Authentication (Alternative to JWT)
 * 
 * To enable Clerk:
 * 1. npm install @clerk/clerk-sdk-node
 * 2. Create Clerk application at https://clerk.com
 * 3. Uncomment the code below
 * 4. Set CLERK_SECRET_KEY in environment variables
 * 5. Add requireClerkAuth to protected routes
 * 
 * Frontend setup:
 * 1. npm install @clerk/clerk-react
 * 2. Wrap App with <ClerkProvider>
 * 3. Use <SignIn>, <UserButton> components
 */

/*
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export const requireClerkAuth = ClerkExpressRequireAuth({
  onError: (error) => {
    return {
      status: 401,
      message: 'Unauthorized: ' + error.message
    };
  }
});

// Extract user/org from Clerk session
export function getClerkUser(req) {
  return {
    userId: req.auth.userId,
    orgId: req.auth.orgId,
    email: req.auth.sessionClaims?.email
  };
}
*/

/**
 * Organization-based filtering (for multi-org)
 * 
 * When auth is enabled, filter queries by organization:
 */

/*
export function addOrgFilter(req) {
  // If user is authenticated, filter by their org
  if (req.user?.orgId) {
    return { orgId: req.user.orgId };
  }
  // Otherwise return empty filter (single-org mode)
  return {};
}

// Usage in routes:
// const teams = await Team.find(addOrgFilter(req));
*/

export default {
  requireApiKey,
  // requireAuth,  // Uncomment when JWT enabled
  // requireClerkAuth,  // Uncomment when Clerk enabled
};
