const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Validation rules
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone required')
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// Routes
router.post('/register', validateRegistration, validateRequest, register);
router.post('/login', validateLogin, validateRequest, login);
router.post('/logout', authenticateToken, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;