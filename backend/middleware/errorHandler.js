/**
 * Global Error Handling Middleware
 * 
 * Catches all errors passed to next(error) and unhandled route errors.
 * Provides consistent error responses across the application.
 */

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 - Route not found
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details (but not in test environment)
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Error occurred:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }

  if (err.name === 'CastError') {
    // Mongoose invalid ObjectId
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    // Mongoose duplicate key error
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      status: 'error',
      message: `A record with this ${field} already exists`
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication token has expired'
    });
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Include stack trace in development mode only
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async error wrapper to avoid try-catch blocks in routes
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }))
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
