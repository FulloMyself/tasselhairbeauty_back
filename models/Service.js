const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Kiddies Hair', 'Barber', 'Adult Hair', 'Nails', 'Skin & Beauty']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  basePrice: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  image: {
    type: String,
    default: null
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  staffAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  availability: {
    daysOfWeek: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '17:00'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
serviceSchema.index({ category: 1 });
serviceSchema.index({ isAvailable: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);