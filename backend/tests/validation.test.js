/**
 * Unit tests for validation middleware
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const validationResult = jest.fn();

jest.unstable_mockModule('express-validator', () => ({
  validationResult,
  body: jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isBoolean: jest.fn().mockReturnThis(),
  })),
  param: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    isMongoId: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
  })),
}));

const { validateRequest } = await import('../middleware/validation.js');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    validationResult.mockReset();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('should call next() when there are no validation errors', () => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    validateRequest(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 400 with errors when validation fails', () => {
    const mockErrors = [
      { path: 'email', msg: 'Email is required', value: '' },
      { path: 'password', msg: 'Password must be at least 8 characters', value: '123' },
    ];
    validationResult.mockReturnValue({ isEmpty: () => false, array: () => mockErrors });
    validateRequest(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Validation failed',
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'email', message: 'Email is required' }),
        expect.objectContaining({ field: 'password' }),
      ]),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should format validation errors correctly', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'name', msg: 'Name must be between 2 and 100 characters', value: 'a' }],
    });
    validateRequest(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [
          { field: 'name', message: 'Name must be between 2 and 100 characters', value: 'a' },
        ],
      })
    );
  });
});
