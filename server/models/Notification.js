const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Notification must belong to a user']
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'job_match',           // New job matches user's profile
      'application_update',  // Application status changed
      'interview_scheduled', // Interview scheduled
      'message_received',    // New message in chat
      'application_received', // New application for company
      'job_posted',          // New job posted by followed company
      'profile_viewed',      // Someone viewed your profile
      'connection_request',  // New connection request
      'skill_endorsement',   // Someone endorsed your skill
      'badge_earned',        // New badge earned
      'xp_milestone',        // XP milestone reached
      'reminder',            // General reminder
      'system'               // System notification
    ]
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  data: {
    // Flexible data object for different notification types
    jobId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Job'
    },
    applicationId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Application'
    },
    companyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Company'
    },
    chatId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat'
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    interviewDate: Date,
    interviewType: String,
    location: String,
    meetingLink: String,
    badgeName: String,
    badgeIcon: String,
    xpAmount: Number,
    level: Number,
    customData: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isPushed: {
    type: Boolean,
    default: false
  },
  pushedAt: Date,
  isEmailed: {
    type: Boolean,
    default: false
  },
  emailedAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  actionUrl: {
    type: String,
    maxlength: [500, 'Action URL cannot be more than 500 characters']
  },
  actionText: {
    type: String,
    maxlength: [50, 'Action text cannot be more than 50 characters']
  },
  image: {
    type: String,
    maxlength: [500, 'Image URL cannot be more than 500 characters']
  },
  icon: {
    type: String,
    maxlength: [100, 'Icon cannot be more than 100 characters']
  },
  color: {
    type: String,
    maxlength: [20, 'Color cannot be more than 20 characters']
  },
  tags: [String],
  metadata: {
    source: {
      type: String,
      enum: ['system', 'user', 'company', 'ai', 'automated'],
      default: 'system'
    },
    campaign: String,
    template: String,
    version: String
  }
}, {
  timestamps: true
});

// Index for user notifications
notificationSchema.index({ user: 1, createdAt: -1 });

// Index for unread notifications
notificationSchema.index({ user: 1, isRead: 1, isActive: 1 });

// Index for notification type
notificationSchema.index({ type: 1, createdAt: -1 });

// Index for priority and expiration
notificationSchema.index({ 
  priority: 1, 
  expiresAt: 1, 
  isActive: 1 
});

// Index for push notifications
notificationSchema.index({ 
  isPushed: 1, 
  user: 1, 
  createdAt: -1 
});

// Index for email notifications
notificationSchema.index({ 
  isEmailed: 1, 
  user: 1, 
  createdAt: -1 
});

// Compound index for user dashboard
notificationSchema.index({ 
  user: 1, 
  isRead: 1, 
  priority: 1, 
  createdAt: -1 
});

// Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
};

notificationSchema.methods.markAsPushed = function() {
  this.isPushed = true;
  this.pushedAt = new Date();
};

notificationSchema.methods.markAsEmailed = function() {
  this.isEmailed = true;
  this.emailedAt = new Date();
};

notificationSchema.methods.archive = function() {
  this.isActive = false;
};

// Static methods
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    isRead,
    priority,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = { user: userId, isActive: true };
  
  if (type) query.type = type;
  if (isRead !== undefined) query.isRead = isRead;
  if (priority) query.priority = priority;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const notifications = await this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('data.jobId', 'title company')
    .populate('data.applicationId', 'status')
    .populate('data.companyId', 'name logo')
    .populate('data.userId', 'firstName lastName avatar');

  const total = await this.countDocuments(query);

  return {
    notifications,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  };
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    user: userId,
    isRead: false,
    isActive: true
  });
};

notificationSchema.statics.cleanupExpired = async function() {
  return await this.updateMany(
    { expiresAt: { $lt: new Date() }, isActive: true },
    { isActive: false }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
