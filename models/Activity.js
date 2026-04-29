const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['booking', 'order', 'user', 'staff', 'service', 'product', 'payment', 'leave', 'payroll'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: 'System'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  targetType: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  icon: {
    type: String,
    default: 'info-circle'
  }
}, {
  timestamps: true
});

// Index for fast queries
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });

// Static method to log activity
activitySchema.statics.log = async function(data) {
  try {
    const icons = {
      booking: 'calendar-check',
      order: 'shopping-cart',
      user: 'user-plus',
      staff: 'user-tie',
      service: 'cut',
      product: 'box',
      payment: 'money-bill',
      leave: 'umbrella-beach',
      payroll: 'file-invoice'
    };

    const activity = await this.create({
      ...data,
      icon: data.icon || icons[data.type] || 'info-circle'
    });
    
    return activity;
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

// Auto-delete activities older than 30 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;