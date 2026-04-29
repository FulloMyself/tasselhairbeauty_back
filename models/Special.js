const mongoose = require('mongoose');

const specialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Special title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  type: {
    type: String,
    enum: ['service', 'product', 'bundle', 'general'],
    required: true,
    default: 'general'
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  originalPrice: {
    type: Number,
    default: 0
  },
  discountedPrice: {
    type: Number,
    default: 0
  },
  poster: {
    type: String,
    default: null
  },
  posterPublicId: {
    type: String,
    default: null
  },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  termsAndConditions: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
specialSchema.index({ startDate: 1, endDate: 1 });
specialSchema.index({ isActive: 1, isFeatured: 1 });
specialSchema.index({ type: 1 });

// Virtual for checking if special is currently active
specialSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Calculate discounted price before saving
specialSchema.pre('save', function(next) {
  if (this.originalPrice > 0 && this.discountValue > 0) {
    if (this.discountType === 'percentage') {
      this.discountedPrice = this.originalPrice * (1 - this.discountValue / 100);
    } else {
      this.discountedPrice = Math.max(0, this.originalPrice - this.discountValue);
    }
  }
  next();
});

module.exports = mongoose.model('Special', specialSchema);