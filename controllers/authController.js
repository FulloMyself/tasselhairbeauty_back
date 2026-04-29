const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const user = new User({
            email: email.toLowerCase(),
            passwordHash: password,
            firstName,
            lastName,
            phone,
            role: 'customer',
            customerProfile: { loyaltyPoints: 0, totalSpent: 0 }
        });

        await user.save();

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { user: user.toJSON(), token: accessToken }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt for:', email);

        const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            console.log('❌ Account deactivated:', email);
            return res.status(403).json({ success: false, message: 'Account deactivated' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        const userData = user.toJSON();
        console.log('✅ Login successful for:', userData.email, 'Role:', userData.role);

        res.json({
            success: true,
            message: 'Login successful',
            data: { user: userData, token: accessToken }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

const logout = async (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logout successful' });
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'No refresh token' });
        }

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(403).json({ success: false, message: 'Invalid refresh token' });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(403).json({ success: false, message: 'User not found or inactive' });
        }

        const newAccessToken = generateAccessToken(user._id, user.role);
        res.json({ success: true, data: { token: newAccessToken } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Token refresh failed' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: { user: user.toJSON() } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
};

// @desc    Update user profile (works for all roles)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // ========== BASIC FIELDS (ALL ROLES) ==========
        const basicFields = ['firstName', 'lastName', 'phone'];
        basicFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        // ========== CUSTOMER-SPECIFIC FIELDS ==========
        if (user.role === 'customer') {
            if (!user.customerProfile) {
                user.customerProfile = {};
            }
            const customerFields = ['address', 'city', 'zipCode', 'dateOfBirth'];
            customerFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    user.customerProfile[field] = req.body[field];
                }
            });
            if (req.body.preferredServices) {
                user.customerProfile.preferredServices = req.body.preferredServices;
            }
        }

        // ========== STAFF-SPECIFIC FIELDS ==========
        if (user.role === 'staff') {
            if (!user.staffProfile) {
                user.staffProfile = {};
            }
            const staffFields = {
                bio: 'bio',
                instagram: 'instagram',
                whatsapp: 'whatsapp'
            };
            Object.keys(staffFields).forEach(field => {
                if (req.body[field] !== undefined) {
                    user.staffProfile[staffFields[field]] = req.body[field];
                }
            });
            if (req.body.specializations) {
                user.staffProfile.specializations = req.body.specializations;
            }
        }

        // ========== ADMIN-SPECIFIC FIELDS ==========
        if (user.role === 'admin') {
            // Admin can update their own details
            if (req.body.email && req.body.email !== user.email) {
                // Check if email is already taken
                const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already in use'
                    });
                }
                user.email = req.body.email.toLowerCase();
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password (works for all roles)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+passwordHash');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.passwordHash = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    updateProfile,
    changePassword
};