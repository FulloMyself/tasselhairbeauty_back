const { body, param, query } = require('express-validator');

/**
 * Email validation rule
 */
const emailValidator = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email');

/**
 * Password validation rule (min 6 characters)
 */
const passwordValidator = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

/**
 * Name validation rule
 */
const firstNameValidator = body('firstName')
  .trim()
  .notEmpty()
  .withMessage('First name is required')
  .isLength({ min: 2 })
  .withMessage('First name must be at least 2 characters long');

const lastNameValidator = body('lastName')
  .trim()
  .notEmpty()
  .withMessage('Last name is required')
  .isLength({ min: 2 })
  .withMessage('Last name must be at least 2 characters long');

/**
 * Phone validation rule (optional)
 */
const phoneValidator = body('phone')
  .optional()
  .isMobilePhone()
  .withMessage('Please provide a valid phone number');

/**
 * Registration validation rules (exported as array for direct use)
 */
const validateRegistration = [
  emailValidator,
  passwordValidator,
  firstNameValidator,
  lastNameValidator,
  phoneValidator,
];

/**
 * Login validation rules (exported as array for direct use)
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Product creation validation rules
 */
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
  body('sku').optional().trim(),
];

/**
 * Service creation validation rules
 */
const validateService = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('category')
    .isIn(['Kiddies Hair', 'Barber', 'Adult Hair', 'Nails', 'Skin & Beauty'])
    .withMessage('Invalid category'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('estimatedDuration')
    .isInt({ min: 15 })
    .withMessage('Duration must be at least 15 minutes'),
];

/**
 * Booking creation validation rules
 */
const validateBooking = [
  body('serviceId').isMongoId().withMessage('Invalid service ID'),
  body('staffId').isMongoId().withMessage('Invalid staff ID'),
  body('bookingDate')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom(value => {
      if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Booking date must be in the future');
      }
      return true;
    }),
  body('bookingTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (HH:MM)'),
  body('numberOfPeople')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of people must be at least 1'),
  body('specialRequests').optional().trim(),
];

/**
 * Change password validation rules
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
];

// Export as direct arrays (not functions) for easy use in routes
module.exports = {
  // Main validation arrays (used directly in routes)
  validateRegistration,
  validateLogin,
  validateProduct,
  validateService,
  validateBooking,
  validateChangePassword,
  
  // Individual validators (for custom combinations)
  emailValidator,
  passwordValidator,
  firstNameValidator,
  lastNameValidator,
  phoneValidator,
  
  // Helper functions (for backward compatibility)
  registerValidation: () => validateRegistration,
  loginValidation: () => validateLogin,
  createProductValidation: () => validateProduct,
  createServiceValidation: () => validateService,
  createBookingValidation: () => validateBooking,
};