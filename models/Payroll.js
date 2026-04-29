const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a staff ID'],
    },
    payrollPeriod: {
      type: String, // "2026-04"
      required: [true, 'Please provide a payroll period'],
    },
    baseSalary: {
      type: Number,
      required: [true, 'Please provide a base salary'],
      min: 0,
    },
    bonuses: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaveDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      required: [true, 'Please provide total earnings'],
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft',
    },
    paymentDate: Date,
    notes: String,
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
payrollSchema.index({ staffId: 1, payrollPeriod: 1 });
payrollSchema.index({ status: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
