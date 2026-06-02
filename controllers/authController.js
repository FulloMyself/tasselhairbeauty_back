const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const CustomerLoyalty = require('../models/CustomerLoyalty');
const Activity = require('../models/Activity');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendWhatsAppMessage } = require('../utils/whatsapp');
const bcrypt = require('bcryptjs');

const normalizePhoneForWhatsApp = (phone) => {
    if (!phone) return phone;
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
        normalized = `27${normalized.slice(1)}`;
    }
    if (!normalized.startsWith('+')) {
        normalized = `+${normalized}`;
    }
    return normalized;
};

const normalizePhoneDigitsForWaMe = (phone) => {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        digits = `27${digits.slice(1)}`;
    }
    return digits;
};

const getBusinessWhatsAppLink = (message) => {
    const businessNumber = process.env.WHATSAPP_NUMBER || '27729605153';
    const digits = normalizePhoneDigitsForWaMe(businessNumber);
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

const generateTempPassword = () => {
    return crypto.randomBytes(5).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
};

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, referralCode } = req.body;
        const normalizedReferralCode = referralCode?.toString().trim().toUpperCase();

        let referrerLoyalty = null;
        if (normalizedReferralCode) {
            // Try exact match first
            referrerLoyalty = await CustomerLoyalty.findOne({ referralCode: normalizedReferralCode });
            
            // Fallback to case-insensitive search if exact match fails
            if (!referrerLoyalty) {
                referrerLoyalty = await CustomerLoyalty.findOne({ 
                    referralCode: { $regex: `^${normalizedReferralCode}$`, $options: 'i' } 
                });
            }
            
            if (!referrerLoyalty) {
                console.warn('❌ Referral code lookup failed:', normalizedReferralCode);
                return res.status(400).json({ success: false, message: 'Invalid referral code' });
            }
            console.log('✅ Referral code found:', normalizedReferralCode, 'for referrer:', referrerLoyalty.customer);
        }

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

        const loyaltyData = { customer: user._id };
        if (referrerLoyalty) {
            loyaltyData.referredBy = referrerLoyalty.customer;
        }

        const newLoyalty = await CustomerLoyalty.create(loyaltyData);
        console.log('✅ Created loyalty record for new customer:', user._id, 'with referralCode:', newLoyalty.referralCode);

        if (referrerLoyalty) {
            referrerLoyalty.addReferral(user._id, `${user.firstName} ${user.lastName}`, user.email);
            await referrerLoyalty.save();
            console.log('✅ Added referral to referrer:', referrerLoyalty.customer, 'Total referrals now:', referrerLoyalty.referralsReceived.length);
        }

        try {
            await Activity.log({
                type: 'user',
                action: 'register',
                description: `New customer registration: ${user.firstName} ${user.lastName} (${user.email})`,
                userId: user._id,
                userName: `${user.firstName} ${user.lastName}`,
                targetId: user._id,
                targetType: 'user',
                metadata: {
                    role: 'customer',
                    referralCode: normalizedReferralCode || null
                }
            });
            console.log('✅ Activity logged for registration:', user.email);
        } catch (err) {
            console.error('❌ Failed to log activity for registration:', err);
        }

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

        try {
            await Activity.log({
                type: 'user',
                action: 'login',
                description: `User login: ${userData.email}`,
                userId: user._id,
                userName: `${userData.firstName} ${userData.lastName}`,
                targetId: user._id,
                targetType: 'user',
                metadata: {
                    role: userData.role
                }
            });
            console.log('✅ Activity logged for login:', userData.email);
        } catch (err) {
            console.error('❌ Failed to log activity for login:', err);
        }

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

const forgotPassword = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const normalizedEmail = email.toLowerCase();
        const normalizedPhone = phone ? phone.replace(/\D/g, '') : null;
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If the details are registered, you will receive password reset instructions shortly.'
            });
        }

        if (!normalizedPhone || normalizedPhone !== user.phone?.replace(/\D/g, '')) {
            return res.status(200).json({
                success: true,
                message: 'If the details are registered, you will receive password reset instructions shortly.'
            });
        }

        const tempPassword = generateTempPassword();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.passwordHash = tempPassword;
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        const whatsAppLink = getBusinessWhatsAppLink(`Hi Tassel Hair & Beauty Studio, I requested a password reset for ${user.email}. Please share the new password.`);

        user.passwordResetHistory = user.passwordResetHistory || [];
        user.passwordResetHistory.push({
            requestedAt: new Date(),
            method: 'whatsapp',
            status: 'pending',
            sentTo: user.phone,
            tempPassword,
            details: {
                resetUrl,
                whatsAppLink,
                channel: 'whatsapp',
                note: 'Admin can share this temporary password with the user via WhatsApp or direct message.'
            }
        });

        const responsePayload = {
            success: true,
            message: 'Temporary password generated. Use the password shown below to log in. You can also contact us on WhatsApp for assistance.',
            tempPassword,
            whatsAppLink
        };

        await user.save({ validateBeforeSave: false });

        try {
            await Activity.log({
                type: 'user',
                action: 'password-reset-request',
                description: `Password reset requested for ${user.email} without Twilio.`,
                userId: user._id,
                userName: `${user.firstName} ${user.lastName}`,
                targetId: user._id,
                targetType: 'user',
                metadata: {
                    phone: user.phone,
                    status: 'not-configured',
                    method: 'whatsapp'
                }
            });
        } catch (activityError) {
            console.error('Failed to log password reset activity:', activityError);
        }

        res.status(200).json(responsePayload);
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Failed to process password reset request' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Password reset token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+passwordHash');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
        }

        user.passwordHash = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};