const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Product = require('../models/Product');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin, isStaff, isCustomer } = require('../middleware/authorization');

const buildWhatsAppUrl = (phoneNumber, message) => {
  const cleanNumber = String(phoneNumber || '').replace(/^\+/, '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber || '27729605153'}?text=${encoded}`;
};

router.get('/services', async (req, res, next) => {
  try {
    const services = await Service.find({ isAvailable: true }).lean();
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

router.get('/services/:id', async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).lean();
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
});

router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).lean();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

router.post('/bookings', authenticateToken, isCustomer, async (req, res, next) => {
  try {
    const { serviceId, bookingDate, bookingTime, numberOfPeople = 1, specialRequests = '' } = req.body;

    if (!serviceId || !bookingDate || !bookingTime) {
      return res.status(400).json({ success: false, message: 'Service, date and time are required' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const staffId = service.staffAssignments?.[0];
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff assigned to this service yet' });
    }

    const booking = await Booking.create({
      customerId: req.user.id,
      serviceId,
      staffId,
      bookingDate: new Date(bookingDate),
      bookingTime,
      numberOfPeople,
      specialRequests,
      whatsappMessage: req.body.whatsappMessage || ''
    });

    res.status(201).json({ success: true, message: 'Booking created successfully', data: booking });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', authenticateToken, isCustomer, async (req, res, next) => {
  try {
    const { items = [], notes = '' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required to place an order' });
    }

    const productIds = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const orderItems = items.map((item) => {
      const product = products.find((product) => String(product._id) === String(item.productId));
      return {
        productId: product ? product._id : item.productId,
        quantity: item.quantity,
        price: product ? product.price : item.price,
        subtotal: item.quantity * (product ? product.price : item.price)
      };
    });
    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await Order.create({
      customerId: req.user.id,
      items: orderItems,
      totalAmount,
      notes,
      status: 'pending'
    });

    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'customerProfile.totalSpent': totalAmount
      }
    });

    res.status(201).json({ success: true, message: 'Order created successfully', data: order });
  } catch (error) {
    next(error);
  }
});

router.get('/customer/bookings', authenticateToken, isCustomer, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customerId: req.user.id })
      .populate('serviceId', 'name basePrice estimatedDuration category')
      .populate('staffId', 'firstName lastName')
      .sort({ bookingDate: -1 })
      .lean();

    const formatted = bookings.map((booking) => ({
      id: booking._id,
      service: booking.serviceId?.name || 'Unknown service',
      category: booking.serviceId?.category,
      price: booking.serviceId?.basePrice,
      duration: booking.serviceId?.estimatedDuration,
      staff: booking.staffId ? `${booking.staffId.firstName} ${booking.staffId.lastName}` : 'Unassigned',
      date: booking.bookingDate,
      time: booking.bookingTime,
      status: booking.status,
      numberOfPeople: booking.numberOfPeople,
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/customer/orders', authenticateToken, isCustomer, async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .populate('items.productId', 'name image')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((order) => ({
      id: order._id,
      items: order.items.map((item) => ({
        id: item.productId?._id || item.productId,
        name: item.productId?.name || 'Product',
        image: item.productId?.image || null,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      total: order.totalAmount,
      status: order.status,
      date: order.createdAt,
      notes: order.notes
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/customer/stats', authenticateToken, isCustomer, async (req, res, next) => {
  try {
    const now = new Date();
    const upcomingBookings = await Booking.countDocuments({
      customerId: req.user.id,
      bookingDate: { $gte: now },
      status: { $ne: 'cancelled' }
    });
    const totalBookings = await Booking.countDocuments({ customerId: req.user.id });
    const totalOrders = await Order.countDocuments({ customerId: req.user.id });
    const pendingOrders = await Order.countDocuments({ customerId: req.user.id, status: 'pending' });

    res.json({
      success: true,
      data: {
        upcomingBookings,
        totalBookings,
        totalOrders,
        pendingOrders
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/stats', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalStaff = await User.countDocuments({ role: 'staff' });
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayBookings = await Booking.countDocuments({ bookingDate: { $gte: startOfDay, $lt: endOfDay }, status: { $ne: 'cancelled' } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueData = await Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $in: ['paid', 'confirmed', 'shipped', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const monthlyRevenue = monthlyRevenueData[0]?.total || 0;
    const recentActivity = [
      { type: 'booking', icon: 'calendar-check', description: 'New booking requests are ready to assign', time: 'Just now' },
      { type: 'order', icon: 'shopping-cart', description: 'Customer placed a new product order', time: '1 hour ago' },
      { type: 'leave', icon: 'umbrella-beach', description: 'Pending leave requests need review', time: '3 hours ago' }
    ];
    const growth = 6;

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalStaff,
        todayBookings,
        pendingOrders,
        monthlyRevenue,
        growth,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/users', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/bookings', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('serviceId', 'name category')
      .populate('customerId', 'firstName lastName phone email')
      .populate('staffId', 'firstName lastName')
      .sort({ bookingDate: -1 })
      .lean();

    const formatted = bookings.map((booking) => ({
      id: booking._id,
      service: booking.serviceId?.name || 'Unknown',
      category: booking.serviceId?.category,
      customer: booking.customerId ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : 'Guest',
      customerPhone: booking.customerId?.phone || '',
      staff: booking.staffId ? `${booking.staffId.firstName} ${booking.staffId.lastName}` : 'Unassigned',
      status: booking.status,
      date: booking.bookingDate,
      time: booking.bookingTime,
      specialRequests: booking.specialRequests
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/bookings/:id/assign', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const staff = await User.findOne({ _id: staffId, role: 'staff' });
    if (!staff) {
      return res.status(400).json({ success: false, message: 'Staff member not found' });
    }
    booking.staffId = staffId;
    if (booking.status === 'pending') {
      booking.status = 'confirmed';
    }
    await booking.save();
    res.json({ success: true, message: 'Booking assigned', data: { bookingId: booking._id, staffId } });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'firstName lastName email phone')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((order) => ({
      id: order._id,
      customer: order.customerId ? `${order.customerId.firstName} ${order.customerId.lastName}` : 'Unknown',
      customerPhone: order.customerId?.phone || '',
      items: order.items.map((item) => ({
        name: item.productId?.name || 'Product',
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      total: order.totalAmount,
      status: order.status,
      date: order.createdAt
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/orders/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (status) {
      order.status = status;
    }
    await order.save();
    res.json({ success: true, message: 'Order updated', data: order });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/leave-requests/pending', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ status: 'pending' })
      .populate('staffId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests.map((request) => ({
      id: request._id,
      staff: request.staffId ? `${request.staffId.firstName} ${request.staffId.lastName}` : 'Unknown',
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      numberOfDays: request.numberOfDays,
      reason: request.reason,
      status: request.status
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/payroll', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const payroll = await Payroll.find()
      .populate('staffId', 'firstName lastName')
      .sort({ payrollPeriod: -1 })
      .lean();

    const formatted = payroll.map((record) => ({
      id: record._id,
      staff: record.staffId ? `${record.staffId.firstName} ${record.staffId.lastName}` : 'Unknown',
      payrollPeriod: record.payrollPeriod,
      baseSalary: record.baseSalary,
      bonuses: record.bonuses,
      deductions: record.deductions,
      leaveDeductions: record.leaveDeductions,
      totalEarnings: record.totalEarnings,
      status: record.status,
      paymentDate: record.paymentDate
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/analytics', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const pipeline = [
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', sold: { $sum: '$items.quantity' } } },
      { $sort: { sold: -1 } },
      { $limit: 5 }
    ];
    const topProducts = await Order.aggregate(pipeline);
    const topServiceResults = await Booking.aggregate([
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topServices = await Service.find({ _id: { $in: topServiceResults.map((item) => item._id) } }, 'name').lean();

    res.json({
      success: true,
      data: {
        topProductCount: topProducts.length,
        topServiceCount: topServices.length,
        topServices: topServices.map((service) => ({ id: service._id, name: service.name })),
        topProducts: topProducts
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/stats', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const weeklyBookings = await Booking.countDocuments({
      staffId: req.user.id,
      bookingDate: { $gte: weekStart },
      status: { $ne: 'cancelled' }
    });
    const monthlyEarningsData = await Booking.aggregate([
      { $match: { staffId: new require('mongoose').Types.ObjectId(req.user.id), bookingDate: { $gte: currentMonthStart }, status: { $in: ['confirmed', 'completed'] } } },
      { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: '$service.basePrice' } } }
    ]);
    const monthlyEarnings = monthlyEarningsData[0]?.total || 0;

    const stats = {
      weeklyBookings,
      averageRating: 4.8,
      monthlyEarnings,
      completionRate: 95
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/today-bookings', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const bookings = await Booking.find({
      staffId: req.user.id,
      bookingDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $ne: 'cancelled' }
    })
      .populate('serviceId', 'name estimatedDuration')
      .populate('customerId', 'firstName lastName')
      .sort({ bookingTime: 1 })
      .lean();

    const formatted = bookings.map((booking) => ({
      id: booking._id,
      service: booking.serviceId?.name || 'Service',
      customer: booking.customerId ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : 'Customer',
      time: booking.bookingTime,
      duration: booking.serviceId?.estimatedDuration || 0,
      notes: booking.specialRequests,
      status: booking.status
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/schedule', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const schedule = await Booking.find({ staffId: req.user.id, status: { $ne: 'cancelled' } })
      .populate('serviceId', 'name estimatedDuration')
      .sort({ bookingDate: 1, bookingTime: 1 })
      .lean();

    const formatted = schedule.map((booking) => ({
      id: booking._id,
      date: booking.bookingDate.toISOString().split('T')[0],
      service: booking.serviceId?.name || 'Service',
      time: booking.bookingTime,
      duration: booking.serviceId?.estimatedDuration || 0,
      customer: booking.customerId?.firstName ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : 'Customer',
      status: booking.status
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/performance', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const completedBookings = await Booking.countDocuments({ staffId: req.user.id, status: 'completed' });
    const totalReviews = Math.max(1, completedBookings);
    const performance = {
      averageRating: 4.9,
      completedBookings,
      totalEarnings: completedBookings * 300,
      punctuality: 96,
      recentReviews: [
        { rating: 5, date: new Date().toISOString(), comment: 'Lovely service and great communication.', customer: 'Thandi' },
        { rating: 5, date: new Date().toISOString(), comment: 'Excellent experience from start to finish.', customer: 'Sipho' }
      ]
    };

    res.json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/leave-requests', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const leaveRequests = await LeaveRequest.find({ staffId: req.user.id }).sort({ createdAt: -1 }).lean();
    const formatted = leaveRequests.map((request) => ({
      id: request._id,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      numberOfDays: request.numberOfDays,
      reason: request.reason,
      status: request.status,
      approvedBy: request.approvedBy,
      approvalDate: request.approvalDate,
      comments: request.comments
    }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.post('/staff/leave-request', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All leave request fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const leaveRequest = await LeaveRequest.create({
      staffId: req.user.id,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays: diffDays,
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Leave request submitted', data: leaveRequest });
  } catch (error) {
    next(error);
  }
});

router.get('/staff/payroll', authenticateToken, isStaff, async (req, res, next) => {
  try {
    const payroll = await Payroll.find({ staffId: req.user.id }).sort({ payrollPeriod: -1 }).lean();
    const formatted = payroll.map((record) => ({
      id: record._id,
      payrollPeriod: record.payrollPeriod,
      baseSalary: record.baseSalary,
      bonuses: record.bonuses,
      deductions: record.deductions,
      leaveDeductions: record.leaveDeductions,
      totalEarnings: record.totalEarnings,
      status: record.status,
      paymentDate: record.paymentDate
    }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
