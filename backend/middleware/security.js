/**
 * Security Middleware - Enterprise-Grade Protection
 * 
 * Implements:
 * - Rate limiting (DDoS protection, brute force prevention)
 * - Input validation & sanitization
 * - Security headers (XSS, clickjacking, MIME sniffing)
 * - Request logging & monitoring
 * - IP-based access control
 */

import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import helmet from 'helmet';

// ============================================
// RATE LIMITING
// ============================================

/**
 * General API rate limiter
 * Prevents DDoS and API abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

/**
 * Strict auth endpoint limiter
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes',
    hint: 'For account recovery, contact support@signaltrue.ai'
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password reset limiter
 * Prevents abuse of password reset functionality
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 reset requests per hour
  message: {
    error: 'Too many password reset requests',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Behavioral intelligence endpoint limiter
 * Prevents bulk data extraction
 */
export const intelligenceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute (reasonable for dashboards)
  message: {
    error: 'Rate limit exceeded for intelligence endpoints',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Admin endpoint limiter
 * Extra protection for sensitive operations
 */
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 requests per 5 minutes
  message: {
    error: 'Admin endpoint rate limit exceeded',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Custom MongoDB injection protection
 * Sanitizes request body and params (not query to avoid setter issues)
 */
export function sanitizeMongoInput(req, res, next) {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('[Security] Sanitization error:', error);
    next(); // Don't block request on sanitization error
  }
}

/**
 * Recursively sanitize an object by removing $ and . characters
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Replace $ and . in keys
    const cleanKey = key.replace(/[\$\.]/g, '_');
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizeObject(value);
    } else {
      sanitized[cleanKey] = value;
    }
    
    // Log if we sanitized something
    if (cleanKey !== key) {
      console.warn('[Security] Sanitized potentially malicious key:', {
        original: key,
        sanitized: cleanKey
      });
    }
  }
  
  return sanitized;
}

/**
 * HTTP Parameter Pollution protection
 * Prevents duplicate query parameters
 */
export const preventParameterPollution = hpp({
  whitelist: [
    'teamId', 
    'orgId', 
    'userId', 
    'startDate', 
    'endDate',
    'status',
    'role',
    'limit',
    'page'
  ]
});

// ============================================
// SECURITY HEADERS
// ============================================

/**
 * Helmet configuration for security headers
 * Protects against XSS, clickjacking, MIME sniffing, etc.
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.signaltrue.ai",
        "https://signaltrue-backend.onrender.com",
        "https://slack.com",
        "https://www.googleapis.com",
        "https://graph.microsoft.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  
  // Strict Transport Security (HTTPS enforcement)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // Prevent MIME sniffing
  noSniff: true,
  
  // XSS Protection (legacy browsers)
  xssFilter: true,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// ============================================
// REQUEST MONITORING
// ============================================

/**
 * Security event logger
 * Logs suspicious activities for monitoring
 */
export function securityLogger(req, res, next) {
  // Log all admin operations
  if (req.path.includes('/admin') || req.user?.role === 'master_admin') {
    console.log('[Security] Admin operation', {
      user: req.user?.email,
      userId: req.user?.userId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }
  
  // Log failed auth attempts
  res.on('finish', () => {
    if (req.path.includes('/auth/') && res.statusCode === 401) {
      console.warn('[Security] Failed authentication attempt', {
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
}

/**
 * Detect suspicious patterns
 * Warns about potential attacks
 */
export function detectSuspiciousActivity(req, res, next) {
  const suspiciousPatterns = [
    // SQL injection attempts
    /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
    // Path traversal
    /\.\.\//,
    // Script tags
    /<script>/i,
    // Command injection
    /(\||&&|;|\$\()/
  ];
  
  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.error('[Security] SUSPICIOUS ACTIVITY DETECTED', {
        pattern: pattern.toString(),
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      // In production, consider blocking the request:
      // return res.status(403).json({ message: 'Forbidden' });
    }
  }
  
  next();
}

// ============================================
// IP FILTERING (Enterprise Feature)
// ============================================

/**
 * IP whitelist/blacklist
 * For enterprise customers who want to restrict access
 */
export function ipFilter(options = {}) {
  const { whitelist = [], blacklist = [] } = options;
  
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      console.warn('[Security] Blocked IP from blacklist', {
        ip: clientIp,
        path: req.path
      });
      return res.status(403).json({ 
        message: 'Access denied',
        reason: 'IP_BLACKLISTED'
      });
    }
    
    // Check whitelist if enabled
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      console.warn('[Security] Blocked IP not in whitelist', {
        ip: clientIp,
        path: req.path
      });
      return res.status(403).json({ 
        message: 'Access denied',
        reason: 'IP_NOT_WHITELISTED'
      });
    }
    
    next();
  };
}

// ============================================
// COMBINED MIDDLEWARE STACK
// ============================================

/**
 * Apply all security middleware in correct order
 */
export function applySecurityMiddleware(app) {
  console.log('🔒 Applying enterprise security middleware...');
  
  // 1. Security headers (must be first)
  app.use(securityHeaders);
  
  // 2. Input sanitization
  app.use(sanitizeMongoInput);
  app.use(preventParameterPollution);
  
  // 3. Monitoring & logging
  app.use(securityLogger);
  app.use(detectSuspiciousActivity);
  
  // 4. Rate limiting (applied to specific routes in server.js)
  // Applied selectively to avoid limiting health checks
  
  console.log('✅ Security middleware active');
}

export default {
  // Rate limiters
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  intelligenceLimiter,
  adminLimiter,
  
  // Sanitization
  sanitizeMongoInput,
  preventParameterPollution,
  
  // Headers
  securityHeaders,
  
  // Monitoring
  securityLogger,
  detectSuspiciousActivity,
  
  // IP filtering
  ipFilter,
  
  // Combined setup
  applySecurityMiddleware
};
