const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    default: ''
  },
  customerEmail: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  services: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    name: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  staffName: {
    type: String,
    default: ''
  },
  bookingDate: {
    type: Date
  },
  bookingTime: {
    type: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['payfast', 'cash', 'card', 'eft'],
    default: 'payfast'
  },
  numberOfPeople: {
    type: Number,
    default: 1
  },
  bookedFor: {
    type: String,
    enum: ['myself', 'child', 'family', 'other'],
    default: 'myself'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  discount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  specialRequests: {
    type: String,
    default: ''
  },
  whatsappSent: {
    type: Boolean,
    default: false
  },
  whatsappConfirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate booking number before saving
bookingSchema.pre('save', function(next) {
  if (!this.bookingNumber) {
    this.bookingNumber = 'TASSEL-' + Date.now().toString(36).toUpperCase();
  }
  
  // Set booking date to createdAt if not provided
  if (!this.bookingDate) {
    this.bookingDate = this.createdAt || new Date();
  }
  
  next();
});

// Indexes
bookingSchema.index({ 'customer': 1, 'createdAt': -1 });
bookingSchema.index({ 'status': 1 });
bookingSchema.index({ 'bookingDate': -1 });
bookingSchema.index({ 'bookingNumber': 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);