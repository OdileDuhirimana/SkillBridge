const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job',
    required: [true, 'Application must be for a job']
  },
  applicant: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Application must have an applicant']
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: [true, 'Application must belong to a company']
  },
  status: {
    type: String,
    enum: [
      'applied',           // Initial application
      'under-review',      // Being reviewed by company
      'shortlisted',       // Selected for next round
      'interview-scheduled', // Interview scheduled
      'interview-completed', // Interview completed
      'offer-extended',    // Job offer made
      'offer-accepted',    // Offer accepted by candidate
      'offer-declined',    // Offer declined by candidate
      'rejected',          // Application rejected
      'withdrawn'          // Application withdrawn by candidate
    ],
    default: 'applied'
  },
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot be more than 2000 characters']
  },
  resume: {
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  portfolio: {
    url: String,
    description: String
  },
  answers: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'multiple-choice', 'yes-no', 'file'],
      default: 'text'
    }
  }],
  additionalDocuments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot be more than 1000 characters']
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    status: {
      type: String,
      required: true
    },
    message: String,
    changedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      interviewDate: Date,
      interviewType: String,
      location: String,
      notes: String
    }
  }],
  interview: {
    scheduledDate: Date,
    interviewType: {
      type: String,
      enum: ['phone', 'video', 'in-person', 'technical', 'panel', 'hr']
    },
    location: String,
    meetingLink: String,
    interviewer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    duration: Number, // in minutes
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String,
      strengths: [String],
      areasForImprovement: [String],
      recommendation: {
        type: String,
        enum: ['hire', 'no-hire', 'maybe', 'strong-hire']
      }
    }
  },
  offer: {
    salary: {
      amount: Number,
      currency: String,
      period: String
    },
    benefits: [String],
    startDate: Date,
    endDate: Date,
    terms: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    expiresAt: Date,
    responseDeadline: Date
  },
  aiAnalysis: {
    skillMatchScore: Number,
    experienceMatchScore: Number,
    educationMatchScore: Number,
    overallMatchScore: Number,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    analyzedAt: Date
  },
  source: {
    type: String,
    enum: ['direct', 'referral', 'recruiter', 'job-board', 'social-media', 'other'],
    default: 'direct'
  },
  referral: {
    referrer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    referralCode: String
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add status change to timeline
applicationSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      message: `Status changed to ${this.status}`,
      changedBy: this.updatedBy || this.applicant,
      changedAt: new Date()
    });
  }
  next();
});

// Index for applicant applications
applicationSchema.index({ applicant: 1, createdAt: -1 });

// Index for company applications
applicationSchema.index({ company: 1, status: 1, createdAt: -1 });

// Index for job applications
applicationSchema.index({ job: 1, status: 1 });

// Index for status filtering
applicationSchema.index({ status: 1, createdAt: -1 });

// Compound index for company dashboard
applicationSchema.index({ 
  company: 1, 
  status: 1, 
  createdAt: -1 
});

// Prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
