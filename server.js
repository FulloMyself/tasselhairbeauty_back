const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database connection
const { connectDB } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    callback(null, true); // Allow all in development
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Optional middleware
try {
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
} catch (e) {
  // Optional
}

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);


// Temporary routes for frontend compatibility
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Haircut & Styling', category: 'Adult Hair', basePrice: 350, estimatedDuration: 60, description: 'Professional haircut and styling' },
      { id: 2, name: 'Color Treatment', category: 'Adult Hair', basePrice: 850, estimatedDuration: 120, description: 'Full color treatment' },
      { id: 3, name: 'Manicure & Pedicure', category: 'Nails', basePrice: 450, estimatedDuration: 90, description: 'Luxury nail care' },
      { id: 4, name: 'Facial Treatment', category: 'Skin & Beauty', basePrice: 550, estimatedDuration: 75, description: 'Deep cleansing facial' },
      { id: 5, name: 'Kids Haircut', category: 'Kiddies Hair', basePrice: 150, estimatedDuration: 30, description: 'Haircut for children under 12' },
      { id: 6, name: 'Beard Trim', category: 'Barber', basePrice: 100, estimatedDuration: 20, description: 'Professional beard grooming' }
    ]
  });
});

app.get('/api/testimonials', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Sarah Johnson', text: 'Amazing service! The staff is professional and friendly.', rating: 5, service: 'Hair Styling' },
      { id: 2, name: 'Michael Chen', text: 'Best salon experience ever. Highly recommend!', rating: 5, service: 'Barber Services' },
      { id: 3, name: 'Emily Williams', text: 'Love my new look! The team really listens to what you want.', rating: 5, service: 'Color Treatment' },
      { id: 4, name: 'David Brown', text: 'Great atmosphere and excellent service.', rating: 4, service: 'Manicure' }
    ]
  });
});

app.post('/api/bookings', (req, res) => {
  res.json({
    success: true,
    message: 'Booking created successfully',
    data: { bookingId: 'temp-' + Date.now(), ...req.body }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    success: true,
    message: 'Server is running',
    database: states[dbState] || 'unknown'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tassel Hair & Beauty Studio API',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close(false, () => process.exit(0));
  });
});

module.exports = app;