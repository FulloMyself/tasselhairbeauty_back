const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Please provide an order ID'],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a customer ID'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'ZAR',
      enum: ['ZAR', 'USD', 'EUR'],
    },
    paymentMethod: {
      type: String,
      enum: ['payfast', 'credit_card', 'debit_card', 'bank_transfer'],
      required: [true, 'Please provide a payment method'],
    },
    paymentReference: String, // PayFast merchant reference
    transactionId: String, // PayFast transaction ID
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentDate: Date,
    errorMessage: String,
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
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
