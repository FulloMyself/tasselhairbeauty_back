const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: true  // Changed to true so we can access it
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'customer'],
    default: 'customer'
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  staffProfile: {
    specializations: [String],
    bio: String,
    instagram: String,
    whatsapp: String,
    joinDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'on-leave', 'inactive'],
      default: 'active'
    },
    baseSalary: {
      type: Number,
      min: 0
    }
  },
  customerProfile: {
    address: String,
    city: String,
    zipCode: String,
    dateOfBirth: Date,
    preferredServices: [String],
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔐 Comparing password for:', this.email);
    console.log('   Candidate:', candidatePassword);
    console.log('   Stored hash exists:', !!this.passwordHash);
    
    if (!this.passwordHash) {
      console.error('❌ No password hash stored!');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.passwordHash);
    console.log('   Match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// Remove sensitive data from JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);