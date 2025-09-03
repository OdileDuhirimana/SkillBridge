const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please add a job description'],
    maxlength: [5000, 'Description cannot be more than 5000 characters']
  },
  requirements: {
    type: String,
    required: [true, 'Please add job requirements'],
    maxlength: [3000, 'Requirements cannot be more than 3000 characters']
  },
  responsibilities: {
    type: String,
    required: [true, 'Please add job responsibilities'],
    maxlength: [3000, 'Responsibilities cannot be more than 3000 characters']
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: [true, 'Job must belong to a company']
  },
  category: {
    type: String,
    required: [true, 'Please add a job category'],
    enum: [
      'Technology', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 
      'Operations', 'Customer Service', 'Healthcare', 'Education', 
      'Engineering', 'Data Science', 'Product', 'Business', 'Other'
    ]
  },
  type: {
    type: String,
    required: [true, 'Please add a job type'],
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary']
  },
  level: {
    type: String,
    required: [true, 'Please add a job level'],
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive']
  },
  location: {
    type: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid'],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    },
    negotiable: {
      type: Boolean,
      default: false
    }
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
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['required', 'preferred', 'nice-to-have'],
      default: 'required'
    },
    years: Number
  }],
  experience: {
    min: {
      type: Number,
      min: 0,
      default: 0
    },
    max: {
      type: Number,
      min: 0
    }
  },
  education: {
    required: {
      type: String,
      enum: ['none', 'high-school', 'associate', 'bachelor', 'master', 'phd'],
      default: 'none'
    },
    preferred: {
      type: String,
      enum: ['none', 'high-school', 'associate', 'bachelor', 'master', 'phd'],
      default: 'none'
    }
  },
  languages: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'native'],
      required: true
    }
  }],
  applicationDeadline: Date,
  startDate: Date,
  duration: {
    type: String,
    maxlength: [50, 'Duration cannot be more than 50 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled'],
    default: 'draft'
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  stats: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  hiringManager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  applicationProcess: {
    steps: [{
      name: {
        type: String,
        required: true
      },
      description: String,
      order: Number,
      estimatedDays: Number
    }],
    requirements: [{
      type: String,
      enum: ['resume', 'cover-letter', 'portfolio', 'references', 'transcript', 'certification'],
      required: true
    }]
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'multiple-choice', 'yes-no', 'file'],
      default: 'text'
    },
    options: [String],
    required: {
      type: Boolean,
      default: false
    }
  }],
  aiAnalysis: {
    skillMatchScore: Number,
    experienceMatchScore: Number,
    educationMatchScore: Number,
    overallMatchScore: Number,
    missingSkills: [String],
    recommendations: [String],
    analyzedAt: Date
  }
}, {
  timestamps: true
});

// Create slug from title
jobSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Index for search
jobSchema.index({ 
  title: 'text', 
  description: 'text', 
  category: 'text',
  'location.address.city': 'text',
  'location.address.country': 'text',
  tags: 'text'
});

// Index for filtering
jobSchema.index({ 
  category: 1, 
  type: 1, 
  level: 1, 
  'location.type': 1, 
  status: 1, 
  isRemote: 1,
  'salary.min': 1,
  'salary.max': 1
});

// Index for company jobs
jobSchema.index({ company: 1, status: 1 });

// Index for trending jobs
jobSchema.index({ 
  'stats.views': -1, 
  'stats.applications': -1, 
  status: 1,
  createdAt: -1 
});

module.exports = mongoose.model('Job', jobSchema);
