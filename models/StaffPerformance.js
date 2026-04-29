const mongoose = require('mongoose');

const staffPerformanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a staff ID'],
    },
    month: {
      type: String, // "2026-04"
      required: [true, 'Please provide a month'],
    },
    completedBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    customerRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    punctuality: {
      type: Number, // Percentage
      default: 100,
      min: 0,
      max: 100,
    },
    customerComments: [String],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for queries
staffPerformanceSchema.index({ staffId: 1, month: -1 });

module.exports = mongoose.model('StaffPerformance', staffPerformanceSchema);
