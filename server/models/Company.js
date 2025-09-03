const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please add a company description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  logo: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    maxlength: [200, 'Website URL cannot be more than 200 characters']
  },
  industry: {
    type: String,
    required: [true, 'Please add an industry'],
    maxlength: [50, 'Industry cannot be more than 50 characters']
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: [true, 'Please add company size']
  },
  founded: {
    type: Number,
    min: [1800, 'Founded year cannot be before 1800'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future']
  },
  headquarters: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  locations: [{
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    type: {
      type: String,
      enum: ['headquarters', 'office', 'remote'],
      default: 'office'
    }
  }],
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  benefits: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    category: {
      type: String,
      enum: ['health', 'financial', 'work-life', 'professional', 'other'],
      default: 'other'
    }
  }],
  culture: {
    values: [String],
    mission: String,
    vision: String,
    workEnvironment: String
  },
  stats: {
    totalJobs: {
      type: Number,
      default: 0
    },
    activeJobs: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  team: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      required: true
    },
    permissions: [{
      type: String,
      enum: ['view_jobs', 'create_jobs', 'edit_jobs', 'delete_jobs', 'view_applications', 'manage_applications', 'view_analytics', 'manage_company']
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: true,
      maxlength: [100, 'Review title cannot be more than 100 characters']
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Review content cannot be more than 1000 characters']
    },
    pros: [String],
    cons: [String],
    workLifeBalance: {
      type: Number,
      min: 1,
      max: 5
    },
    compensation: {
      type: Number,
      min: 1,
      max: 5
    },
    management: {
      type: Number,
      min: 1,
      max: 5
    },
    culture: {
      type: Number,
      min: 1,
      max: 5
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    helpful: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create slug from name
companySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Calculate average rating
companySchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.totalReviews = 0;
    return;
  }

  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10;
  this.totalReviews = this.reviews.length;
};

// Index for search
companySchema.index({ 
  name: 'text', 
  description: 'text', 
  industry: 'text',
  'headquarters.city': 'text',
  'headquarters.country': 'text'
});

// Index for filtering
companySchema.index({ industry: 1, size: 1, isVerified: 1, isActive: 1 });

module.exports = mongoose.model('Company', companySchema);
