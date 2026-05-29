const mongoose = require('mongoose');

const customerLoyaltySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Visit-based rewards
  totalVisits: {
    type: Number,
    default: 0,
    min: 0
  },
  completedVisits: [{
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    visitDate: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  
  // Visit-based reward status
  fifthVisitReward: {
    isEligible: {
      type: Boolean,
      default: false
    },
    isClaimed: {
      type: Boolean,
      default: false
    },
    claimedAt: Date,
    claimedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  },
  
  eleventhVisitReward: {
    isEligible: {
      type: Boolean,
      default: false
    },
    isClaimed: {
      type: Boolean,
      default: false
    },
    claimedAt: Date,
    claimedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  },

  // Referral program
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referralsReceived: [{
    referredCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    referredCustomerName: String,
    referredCustomerEmail: String,
    referralDate: {
      type: Date,
      default: Date.now
    },
    completedServices: {
      type: Number,
      default: 0
    },
    totalAmountSpent: {
      type: Number,
      default: 0
    },
    isQualified: {
      type: Boolean,
      default: false
    },
    qualifiedDate: Date
  }],

  referralReward: {
    isEligible: {
      type: Boolean,
      default: false
    },
    isClaimed: {
      type: Boolean,
      default: false
    },
    claimedAt: Date,
    claimedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    requirementsMet: {
      referralsCount: {
        type: Number,
        default: 0
      },
      qualifiedReferrals: {
        type: Number,
        default: 0
      }
    }
  },

  // Referral code source (who referred this customer)
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Points tracking (for future enhancements)
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  pointsHistory: [{
    action: {
      type: String,
      enum: ['visit', 'referral', 'reward_claimed', 'reward_used']
    },
    points: Number,
    date: {
      type: Date,
      default: Date.now
    },
    reference: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: true
});

// Generate referral code before saving
customerLoyaltySchema.pre('save', function(next) {
  if (!this.referralCode) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = code;
  }
  next();
});

// Method to check if eligible for 5th visit reward
customerLoyaltySchema.methods.checkFifthVisitReward = function() {
  if (this.totalVisits >= 5 && !this.fifthVisitReward.isClaimed) {
    this.fifthVisitReward.isEligible = true;
  }
  return this.fifthVisitReward.isEligible;
};

// Method to check if eligible for 11th visit reward
customerLoyaltySchema.methods.checkEleventhVisitReward = function() {
  if (this.totalVisits >= 11 && !this.eleventhVisitReward.isClaimed) {
    this.eleventhVisitReward.isEligible = true;
  }
  return this.eleventhVisitReward.isEligible;
};

// Method to check if eligible for referral reward
customerLoyaltySchema.methods.checkReferralReward = function() {
  const qualifiedReferrals = this.referralsReceived.filter(r => r.isQualified).length;
  if (qualifiedReferrals >= 3 && !this.referralReward.isClaimed) {
    this.referralReward.isEligible = true;
    this.referralReward.requirementsMet.qualifiedReferrals = qualifiedReferrals;
  }
  return this.referralReward.isEligible;
};

// Method to claim a reward
customerLoyaltySchema.methods.claimReward = function(rewardType, bookingId) {
  const now = new Date();
  
  switch(rewardType) {
    case 'fifth-visit':
      if (this.fifthVisitReward.isEligible && !this.fifthVisitReward.isClaimed) {
        this.fifthVisitReward.isClaimed = true;
        this.fifthVisitReward.claimedAt = now;
        this.fifthVisitReward.claimedBooking = bookingId;
        return true;
      }
      break;
    case 'eleventh-visit':
      if (this.eleventhVisitReward.isEligible && !this.eleventhVisitReward.isClaimed) {
        this.eleventhVisitReward.isClaimed = true;
        this.eleventhVisitReward.claimedAt = now;
        this.eleventhVisitReward.claimedBooking = bookingId;
        return true;
      }
      break;
    case 'referral':
      if (this.referralReward.isEligible && !this.referralReward.isClaimed) {
        this.referralReward.isClaimed = true;
        this.referralReward.claimedAt = now;
        this.referralReward.claimedBooking = bookingId;
        return true;
      }
      break;
  }
  return false;
};

// Method to add a visit
customerLoyaltySchema.methods.addVisit = function(bookingId, amount) {
  this.totalVisits += 1;
  this.completedVisits.push({
    booking: bookingId,
    amount: amount
  });
  this.checkFifthVisitReward();
  this.checkEleventhVisitReward();
  return this.totalVisits;
};

// Method to add a referral
customerLoyaltySchema.methods.addReferral = function(referredCustomerId, referredCustomerName, referredCustomerEmail) {
  this.referralsReceived.push({
    referredCustomer: referredCustomerId,
    referredCustomerName,
    referredCustomerEmail
  });
};

// Method to qualify a referral (when they complete their service)
customerLoyaltySchema.methods.qualifyReferral = function(referredCustomerId) {
  const referral = this.referralsReceived.find(
    r => r.referredCustomer.toString() === referredCustomerId.toString()
  );
  
  if (referral && !referral.isQualified) {
    referral.isQualified = true;
    referral.qualifiedDate = new Date();
    this.checkReferralReward();
  }
};

module.exports = mongoose.model('CustomerLoyalty', customerLoyaltySchema);
