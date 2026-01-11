/**
 * Unit tests for error handling middleware
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { errorHandler, notFoundHandler, AppError, catchAsync } from '../middleware/errorHandler.js';

describe('Error Handling Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      originalUrl: '/api/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('AppError', () => {
    test('should create error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    test('should create error with custom values', () => {
      const error = new AppError('Not found', 404, false);
      
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('notFoundHandler', () => {
    test('should create 404 error for undefined routes', () => {
      req.method = 'POST';
      req.originalUrl = '/api/nonexistent';

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route not found: POST /api/nonexistent',
        })
      );
    });
  });

  describe('errorHandler', () => {
    test('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Something went wrong',
        })
      );
    });

    test('should handle AppError with custom status code', () => {
      const error = new AppError('Bad request', 400);
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bad request',
        })
      );
    });

    test('should handle Mongoose ValidationError', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
          email: { message: 'Email is invalid' },
        },
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors: expect.arrayContaining([
            'Name is required',
            'Email is invalid',
          ]),
        })
      );
    });

    test('should handle Mongoose CastError', () => {
      const error = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id',
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid ID format',
        })
      );
    });

    test('should handle duplicate key error (11000)', () => {
      const error = {
        code: 11000,
        keyPattern: { email: 1 },
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'A record with this email already exists',
        })
      );
    });

    test('should handle JWT errors', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'invalid token',
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid authentication token',
        })
      );
    });

    test('should handle expired JWT', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication token has expired',
        })
      );
    });

    test('should include user ID in logs when available', () => {
      req.user = { _id: 'user123' };
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('catchAsync', () => {
    test('should execute async function and pass result', async () => {
      const asyncFn = jest.fn(async (req, res) => {
        res.json({ success: true });
      });

      const wrappedFn = catchAsync(asyncFn);
      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    test('should catch errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn(async () => {
        throw error;
      });

      const wrappedFn = catchAsync(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle rejected promises', async () => {
      const error = new Error('Promise rejection');
      const asyncFn = jest.fn(() => Promise.reject(error));

      const wrappedFn = catchAsync(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
