const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { isStaff } = require('../middleware/authorization');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Activity = require('../models/Activity');

// All routes require authentication and staff role
router.use(authenticateToken);
router.use(isStaff);

// @route   GET /api/staff/stats
// @desc    Get staff dashboard stats
// @access  Private (Staff)
router.get('/stats', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const staffId = req.user.id;

    const [
      weeklyBookings,
      totalCompleted,
      pendingLeaveCount,
      todayBookings
    ] = await Promise.all([
      Booking.countDocuments({ 
        staff: staffId,
        bookingDate: { 
          $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          $lte: new Date(new Date().setDate(new Date().getDate() + 7))
        }
      }),
      Booking.countDocuments({ staff: staffId, status: 'completed' }),
      LeaveRequest.countDocuments({ staffId, status: 'pending' }),
      Booking.find({ staff: staffId, bookingDate: new Date() }).lean()
    ]);

    // Calculate monthly earnings from completed bookings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const completedThisMonth = await Booking.find({ 
      staff: staffId, 
      status: 'completed',
      createdAt: { $gte: startOfMonth }
    }).lean();
    
    const monthlyEarnings = completedThisMonth.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const stats = {
      weeklyBookings,
      averageRating: '5.0',
      monthlyEarnings,
      completionRate: totalCompleted > 0 ? 100 : 0,
      totalReviews: totalCompleted,
      upcomingBookings: todayBookings.length,
      pendingLeave: pendingLeaveCount
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Staff stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/staff/today-bookings
// @desc    Get today's bookings for staff
// @access  Private (Staff)
router.get('/today-bookings', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await Booking.find({
      staff: req.user.id,
      bookingDate: { $gte: today, $lt: tomorrow }
    })
    .populate('customer', 'firstName lastName')
    .sort({ bookingTime: 1 })
    .lean();

    const data = bookings.map(b => ({
      id: b._id,
      time: b.bookingTime || 'N/A',
      service: b.services?.[0]?.name || 'N/A',
      customer: b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : (b.customerName || 'Walk-in'),
      duration: b.services?.[0]?.duration || 60,
      status: b.status,
      notes: b.specialRequests || ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/staff/schedule
// @desc    Get staff schedule
// @access  Private (Staff)
router.get('/schedule', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({
      staff: req.user.id,
      bookingDate: { $gte: new Date() }
    })
    .sort({ bookingDate: 1, bookingTime: 1 })
    .lean();

    const data = bookings.map(b => ({
      date: b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : 'N/A',
      time: b.bookingTime,
      service: b.services?.[0]?.name,
      customer: b.customerName,
      status: b.status
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/staff/performance
// @desc    Get staff performance metrics
// @access  Private (Staff)
router.get('/performance', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const staffId = req.user.id;

    const [totalCompleted, totalBookings, completedThisMonth] = await Promise.all([
      Booking.countDocuments({ staff: staffId, status: 'completed' }),
      Booking.countDocuments({ staff: staffId }),
      Booking.find({ staff: staffId, status: 'completed' }).lean()
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthlyEarnings = completedThisMonth
      .filter(b => b.createdAt >= startOfMonth)
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const performance = {
      averageRating: '5.0',
      completedBookings: totalCompleted,
      totalBookings,
      totalEarnings: monthlyEarnings,
      punctuality: 100,
      totalReviews: totalCompleted,
      recentReviews: []
    };

    res.json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/staff/leave-requests
// @desc    Get staff leave requests
// @access  Private (Staff)
router.get('/leave-requests', async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ staffId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const data = leaveRequests.map(l => ({
      id: l._id,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      numberOfDays: l.numberOfDays,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approvedBy,
      approvalDate: l.approvalDate,
      comments: l.comments,
      createdAt: l.createdAt
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/staff/leave-request
// @desc    Submit leave request
// @access  Private (Staff)
router.post('/leave-request', async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const staffId = req.user.id;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Get staff details
    const staff = await User.findById(staffId).select('firstName lastName');

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      staffId,
      leaveType: leaveType || 'annual',
      startDate,
      endDate,
      numberOfDays,
      reason: reason || '',
      status: 'pending'
    });

    // Log activity
    await Activity.log({
      type: 'leave',
      action: 'submitted',
      description: `${staff.firstName} ${staff.lastName} submitted a ${leaveType} leave request (${numberOfDays} days)`,
      userId: staffId,
      userName: `${staff.firstName} ${staff.lastName}`,
      targetId: leaveRequest._id,
      targetType: 'LeaveRequest',
      metadata: { leaveType, numberOfDays, staffName: `${staff.firstName} ${staff.lastName}` }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Leave request submitted successfully',
      data: {
        id: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        numberOfDays: leaveRequest.numberOfDays,
        status: leaveRequest.status,
        createdAt: leaveRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

// @route   GET /api/staff/payroll
// @desc    Get staff payroll history
// @access  Private (Staff)
router.get('/payroll', async (req, res) => {
  try {
    const Payroll = require('../models/Payroll');
    const payrolls = await Payroll.find({ staffId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const data = payrolls.map(p => ({
      id: p._id,
      payrollPeriod: p.payrollPeriod,
      baseSalary: p.baseSalary,
      bonuses: p.bonuses,
      deductions: p.deductions,
      leaveDeductions: p.leaveDeductions,
      totalEarnings: p.totalEarnings,
      status: p.status,
      paymentDate: p.paymentDate,
      notes: p.notes
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;