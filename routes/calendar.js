const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Booking = require('../models/Booking');
const LeaveRequest = require('../models/LeaveRequest');
const Order = require('../models/Order');

// @route   GET /api/calendar/events
// @desc    Get calendar events based on role and user
// @access  Private
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { month, year, role, userId } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    let events = [];

    // ADMIN: See all bookings, leave requests, orders
    if (role === 'admin') {
      const [bookings, leaveRequests, orders] = await Promise.all([
        Booking.find({
          $or: [
            { bookingDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }).populate('customer', 'firstName lastName').populate('staff', 'firstName lastName').lean(),
        LeaveRequest.find({
          $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
          ]
        }).populate('staffId', 'firstName lastName').lean(),
        Order.find({
          createdAt: { $gte: startDate, $lte: endDate }
        }).populate('customerId', 'firstName lastName').lean()
      ]);

      // Map bookings
      bookings.forEach(b => {
        const date = b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : new Date(b.createdAt).toISOString().split('T')[0];
        events.push({
          date,
          type: 'booking',
          title: b.services?.[0]?.name || 'Booking',
          description: `${b.customerName || 'Customer'} - ${b.services?.map(s => s.name).join(', ') || 'Service'}`,
          time: b.bookingTime,
          staffName: b.staffName || (b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : 'Unassigned'),
          customerName: b.customerName,
          status: b.status,
          amount: b.totalAmount
        });
      });

      // Map leave requests
      leaveRequests.forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d >= startDate && d <= endDate) {
            events.push({
              date: d.toISOString().split('T')[0],
              type: 'leave',
              title: `${l.staffId?.firstName || 'Staff'} ${l.staffId?.lastName || ''} - Leave`,
              description: `${l.leaveType} leave - ${l.numberOfDays} day(s)`,
              staffName: l.staffId ? `${l.staffId.firstName} ${l.staffId.lastName}` : 'Staff',
              status: l.status,
              leaveType: l.leaveType
            });
          }
        }
      });

      // Map orders
      orders.forEach(o => {
        const date = new Date(o.createdAt).toISOString().split('T')[0];
        events.push({
          date,
          type: 'order',
          title: `Order #${o.orderNumber || o._id.toString().slice(-6)}`,
          description: `${o.customerName || 'Customer'} - ${o.items?.length || 0} item(s)`,
          customerName: o.customerName || (o.customerId ? `${o.customerId.firstName} ${o.customerId.lastName}` : 'Customer'),
          status: o.status,
          amount: o.totalAmount
        });
      });
    }

    // STAFF: See own bookings and leave requests
    else if (role === 'staff') {
      const staffId = req.user.id;
      const [bookings, leaveRequests] = await Promise.all([
        Booking.find({
          staff: staffId,
          $or: [
            { bookingDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }).populate('customer', 'firstName lastName').lean(),
        LeaveRequest.find({
          staffId,
          $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
          ]
        }).lean()
      ]);

      bookings.forEach(b => {
        const date = b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : new Date(b.createdAt).toISOString().split('T')[0];
        events.push({
          date,
          type: 'appointment',
          title: b.services?.[0]?.name || 'Appointment',
          description: `${b.customerName || 'Customer'} - ${b.services?.map(s => s.name).join(', ') || 'Service'}`,
          time: b.bookingTime,
          customerName: b.customerName,
          status: b.status,
          amount: b.totalAmount
        });
      });

      leaveRequests.forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d >= startDate && d <= endDate) {
            events.push({
              date: d.toISOString().split('T')[0],
              type: 'leave',
              title: `${l.leaveType} Leave`,
              description: `${l.numberOfDays} day(s) - ${l.reason || 'No reason'}`,
              status: l.status,
              leaveType: l.leaveType
            });
          }
        }
      });
    }

    // CUSTOMER: See own bookings and orders
    else if (role === 'customer') {
      const customerId = req.user.id;
      const [bookings, orders] = await Promise.all([
        Booking.find({
          customer: customerId,
          $or: [
            { bookingDate: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }).populate('staff', 'firstName lastName').lean(),
        Order.find({
          customerId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean()
      ]);

      bookings.forEach(b => {
        const date = b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : new Date(b.createdAt).toISOString().split('T')[0];
        events.push({
          date,
          type: 'appointment',
          title: b.services?.[0]?.name || 'Appointment',
          description: `${b.staffName || 'Staff'} - ${b.services?.map(s => s.name).join(', ') || 'Service'}`,
          time: b.bookingTime,
          staffName: b.staffName || (b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : 'Unassigned'),
          status: b.status,
          amount: b.totalAmount
        });
      });

      orders.forEach(o => {
        const date = new Date(o.createdAt).toISOString().split('T')[0];
        events.push({
          date,
          type: 'order',
          title: `Order #${o.orderNumber || o._id.toString().slice(-6)}`,
          description: `${o.items?.length || 0} item(s) - R${o.totalAmount?.toFixed(2)}`,
          status: o.status,
          amount: o.totalAmount
        });
      });
    }

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;