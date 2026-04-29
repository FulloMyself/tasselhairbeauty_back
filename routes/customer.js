const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { isCustomer } = require('../middleware/authorization');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Service = require('../models/Service');
const Product = require('../models/Product');

// All routes require authentication and customer role
router.use(authenticateToken);
router.use(isCustomer);

// @route   GET /api/customer/stats
// @desc    Get customer dashboard stats
// @access  Private (Customer)
router.get('/stats', async (req, res) => {
  try {
    const customerId = req.user.id;

    const [totalBookings, upcomingBookings, completedBookings, totalOrders, pendingOrders, user] = await Promise.all([
      Booking.countDocuments({ customer: customerId }),
      Booking.countDocuments({ 
        customer: customerId, 
        status: { $in: ['pending', 'confirmed'] },
        bookingDate: { $gte: new Date() }
      }),
      Booking.countDocuments({ customer: customerId, status: 'completed' }),
      Order.countDocuments({ customerId: customerId }),
      Order.countDocuments({ customerId: customerId, status: { $in: ['pending', 'confirmed'] } }),
      User.findById(customerId).select('customerProfile')
    ]);

    const stats = {
      totalBookings,
      upcomingBookings,
      completedBookings,
      totalOrders,
      pendingOrders,
      loyaltyPoints: user?.customerProfile?.loyaltyPoints || 0,
      totalSpent: user?.customerProfile?.totalSpent || 0
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/customer/bookings
// @desc    Get customer bookings
// @access  Private (Customer)
router.get('/bookings', async (req, res) => {
  try {
    const customerId = req.user.id;

    const bookings = await Booking.find({ customer: customerId })
      .populate('staff', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const data = bookings.map(b => ({
      id: b._id,
      bookingNumber: b.bookingNumber,
      service: b.services?.map(s => s.name).join(', ') || 'N/A',
      staff: b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : (b.staffName || 'Unassigned'),
      date: b.bookingDate || b.createdAt,
      time: b.bookingTime || 'N/A',
      duration: b.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
      price: b.totalAmount || 0,
      depositAmount: b.depositAmount || 0,
      depositPaid: b.depositPaid || false,
      status: b.status,
      specialRequests: b.specialRequests || b.notes || '',
      numberOfPeople: b.numberOfPeople || 1,
      paymentMethod: b.paymentMethod || 'N/A',
      createdAt: b.createdAt
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Customer bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/customer/bookings
// @desc    Create a new booking
// @access  Private (Customer)
router.post('/bookings', async (req, res) => {
  try {
    const customerId = req.user.id;
    const { services, bookingDate, bookingTime, numberOfPeople, specialRequests, bookedFor, paymentMethod } = req.body;

    // Get customer details
    const customer = await User.findById(customerId).select('firstName lastName email phone customerProfile');

    if (!services || services.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one service is required' });
    }

    // Calculate total amount
    const totalAmount = services.reduce((sum, s) => sum + (s.price * (s.quantity || 1)), 0);
    const depositAmount = Math.round(totalAmount * 0.5 * 100) / 100; // 50% deposit

    const booking = new Booking({
      customer: customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      services: services.map(s => ({
        service: s.serviceId,
        name: s.name,
        duration: s.duration || 60,
        price: s.price,
        quantity: s.quantity || 1
      })),
      totalAmount,
      depositAmount,
      depositPaid: false,
      paymentMethod: paymentMethod || 'payfast',
      bookingDate: bookingDate || new Date(),
      bookingTime: bookingTime || '10:00',
      numberOfPeople: numberOfPeople || 1,
      bookedFor: bookedFor || 'myself',
      specialRequests: specialRequests || '',
      status: 'pending'
    });

    await booking.save();

    // Update customer loyalty points
    const pointsEarned = Math.floor(totalAmount / 10);
    await User.findByIdAndUpdate(customerId, {
      $inc: {
        'customerProfile.loyaltyPoints': pointsEarned
      }
    });

    // Log activity
    await Activity.log({
      type: 'booking',
      action: 'created',
      description: `New booking: ${booking.bookingNumber} - ${services[0]?.name || 'Service'} by ${customer.firstName} ${customer.lastName}`,
      userId: customerId,
      userName: `${customer.firstName} ${customer.lastName}`,
      targetId: booking._id,
      targetType: 'Booking',
      metadata: { 
        bookingNumber: booking.bookingNumber, 
        amount: totalAmount,
        pointsEarned
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Booking created successfully',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        totalAmount: booking.totalAmount,
        depositAmount: booking.depositAmount,
        pointsEarned
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// @route   PUT /api/customer/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private (Customer)
router.put('/bookings/:id/cancel', async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, customer: customerId, status: { $in: ['pending', 'confirmed'] } },
      { status: 'cancelled' },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or cannot be cancelled' });
    }

    // Log activity
    await Activity.log({
      type: 'booking',
      action: 'cancelled',
      description: `Booking ${booking.bookingNumber} cancelled by customer`,
      userId: customerId,
      userName: `${booking.customerName}`,
      targetId: booking._id,
      targetType: 'Booking'
    });

    res.json({ success: true, message: 'Booking cancelled', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/customer/orders
// @desc    Get customer orders
// @access  Private (Customer)
router.get('/orders', async (req, res) => {
  try {
    const customerId = req.user.id;

    const orders = await Order.find({ customerId: customerId })
      .sort({ createdAt: -1 })
      .lean();

    const data = orders.map(o => ({
      id: o._id,
      items: o.items || [],
      total: o.totalAmount || 0,
      status: o.status || 'pending',
      date: o.createdAt,
      shippingAddress: o.shippingAddress || ''
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Customer orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/customer/services
// @desc    Get available services for booking
// @access  Private (Customer)
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find({ isAvailable: true })
      .sort({ category: 1, name: 1 })
      .lean();

    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/customer/products
// @desc    Get available products
// @access  Private (Customer)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, quantity: { $gt: 0 } })
      .sort({ category: 1, name: 1 })
      .lean();

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/customer/profile
// @desc    Update customer profile
// @access  Private (Customer)
router.put('/profile', async (req, res) => {
  try {
    const customerId = req.user.id;
    const { address, city, zipCode, dateOfBirth, preferredServices } = req.body;

    const updateData = {};
    if (address !== undefined) updateData['customerProfile.address'] = address;
    if (city !== undefined) updateData['customerProfile.city'] = city;
    if (zipCode !== undefined) updateData['customerProfile.zipCode'] = zipCode;
    if (dateOfBirth !== undefined) updateData['customerProfile.dateOfBirth'] = dateOfBirth;
    if (preferredServices !== undefined) updateData['customerProfile.preferredServices'] = preferredServices;

    const user = await User.findByIdAndUpdate(
      customerId, 
      { $set: updateData }, 
      { new: true }
    ).select('customerProfile');

    res.json({ 
      success: true, 
      message: 'Profile updated', 
      data: { customerProfile: user.customerProfile } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/customer/orders
// @desc    Create a new order
// @access  Private (Customer)
router.post('/orders', async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items, totalAmount, notes, shippingAddress } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // Get customer details
    const customer = await User.findById(customerId).select('firstName lastName email phone customerProfile');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Create the order
    const Order = require('../models/Order');
    const order = new Order({
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name || 'Product',
        quantity: item.quantity || 1,
        price: item.price || 0,
        subtotal: (item.price || 0) * (item.quantity || 1)
      })),
      totalAmount: totalAmount || items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0),
      notes: notes || '',
      shippingAddress: shippingAddress || '',
      status: 'pending',
      paymentMethod: 'whatsapp',
      whatsappSent: false
    });

    await order.save();

    // Update customer's total spent for loyalty
    await User.findByIdAndUpdate(customerId, {
      $inc: {
        'customerProfile.totalSpent': order.totalAmount
      }
    });

    // Log activity
    const Activity = require('../models/Activity');
    await Activity.log({
      type: 'order',
      action: 'created',
      description: `New order ${order.orderNumber} placed by ${customer.firstName} ${customer.lastName} - R${order.totalAmount.toFixed(2)}`,
      userId: customerId,
      userName: `${customer.firstName} ${customer.lastName}`,
      targetId: order._id,
      targetType: 'Order',
      metadata: {
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        itemsCount: order.items.length
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

module.exports = router;