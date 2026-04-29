const mongoose = require('mongoose');

const customerAnalyticsSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a customer ID'],
      unique: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseDate: Date,
    lastBookingDate: Date,
    preferredServices: [String],
    preferredStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    loyaltyTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for queries
customerAnalyticsSchema.index({ loyaltyTier: 1 });
customerAnalyticsSchema.index({ totalSpent: -1 });

module.exports = mongoose.model('CustomerAnalytics', customerAnalyticsSchema);
