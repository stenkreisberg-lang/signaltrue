/**
 * Input Validation Middleware
 * 
 * Provides reusable validation rules for common input patterns.
 * Uses express-validator for comprehensive input validation and sanitization.
 */

import { body, param, validationResult } from 'express-validator';

/**
 * Middleware to check validation results and return errors
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Common validation rules
 */

// Email validation
export const validateEmail = () =>
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters');

// Password validation
export const validatePassword = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Name validation
export const validateName = (field = 'name') =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ min: 2, max: 100 }).withMessage(`${field} must be between 2 and 100 characters`)
    .matches(/^[a-zA-Z\s'-]+$/).withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);

// MongoDB ObjectId validation
export const validateObjectId = (field = 'id') =>
  param(field)
    .notEmpty().withMessage(`${field} is required`)
    .isMongoId().withMessage(`Invalid ${field} format`);

// Team/Organization name validation
export const validateTeamName = () =>
  body('name')
    .trim()
    .notEmpty().withMessage('Team name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Team name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_&.]+$/).withMessage('Team name contains invalid characters');

// Description validation
export const validateDescription = (field = 'description', required = false) => {
  const validator = body(field).trim();
  
  if (required) {
    validator.notEmpty().withMessage(`${field} is required`);
  } else {
    validator.optional();
  }
  
  return validator.isLength({ max: 500 }).withMessage(`${field} must not exceed 500 characters`);
};

// Role validation
export const validateRole = () =>
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['team_member', 'team_lead', 'hr_admin', 'executive', 'master_admin'])
    .withMessage('Invalid role. Must be one of: team_member, team_lead, hr_admin, executive, master_admin');

// Phone number validation (optional)
export const validatePhone = () =>
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-+()]+$/).withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 }).withMessage('Phone number must be between 10 and 20 characters');

/**
 * Composite validation rules for common operations
 */

// User registration validation
export const validateUserRegistration = [
  validateEmail(),
  validatePassword(),
  validateName('name'),
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name must not exceed 100 characters'),
  body('role')
    .optional()
    .isIn(['team_member', 'team_lead', 'hr_admin', 'executive'])
    .withMessage('Invalid role'),
  validateRequest
];

// Login validation
export const validateLogin = [
  validateEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validateRequest
];

// Team creation validation
export const validateTeamCreation = [
  validateTeamName(),
  validateDescription('description', false),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Industry must not exceed 100 characters'),
  validateRequest
];

// User update validation
export const validateUserUpdate = [
  validateName('name').optional(),
  validateEmail().optional(),
  body('role')
    .optional()
    .isIn(['team_member', 'team_lead', 'hr_admin', 'executive', 'master_admin'])
    .withMessage('Invalid role'),
  validatePhone(),
  validateRequest
];

// Project creation validation
export const validateProjectCreation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters'),
  validateDescription('description', false),
  body('favorite')
    .optional()
    .isBoolean().withMessage('Favorite must be a boolean value'),
  validateRequest
];

// Export all validators
export default {
  validateRequest,
  validateEmail,
  validatePassword,
  validateName,
  validateObjectId,
  validateTeamName,
  validateDescription,
  validateRole,
  validatePhone,
  validateUserRegistration,
  validateLogin,
  validateTeamCreation,
  validateUserUpdate,
  validateProjectCreation
};
