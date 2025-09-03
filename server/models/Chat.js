const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  readBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    emoji: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['applicant', 'recruiter', 'admin'],
      default: 'applicant'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  type: {
    type: String,
    enum: ['direct', 'group', 'application'],
    default: 'direct'
  },
  application: {
    type: mongoose.Schema.ObjectId,
    ref: 'Application'
  },
  job: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job'
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company'
  },
  title: {
    type: String,
    maxlength: [100, 'Chat title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Chat description cannot be more than 500 characters']
  },
  messages: [messageSchema],
  lastMessage: {
    type: mongoose.Schema.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    muteNotifications: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      mutedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Update last message and metadata
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessage = this.messages[this.messages.length - 1]._id;
    this.metadata.totalMessages = this.messages.length;
  }
  next();
});

// Index for user chats
chatSchema.index({ 'participants.user': 1, isActive: 1 });

// Index for application chats
chatSchema.index({ application: 1, isActive: 1 });

// Index for company chats
chatSchema.index({ company: 1, isActive: 1 });

// Index for last message sorting
chatSchema.index({ lastMessage: -1, isActive: 1 });

// Index for unread messages
chatSchema.index({ 
  'participants.user': 1, 
  'metadata.unreadCount': 1,
  isActive: 1 
});

// Virtual for unread count per user
chatSchema.virtual('unreadCountForUser').get(function() {
  return (userId) => {
    const participant = this.participants.find(p => p.user.toString() === userId.toString());
    if (!participant) return 0;
    
    // Count messages after lastSeen
    const lastSeen = participant.lastSeen || new Date(0);
    return this.messages.filter(msg => 
      msg.createdAt > lastSeen && 
      msg.sender.toString() !== userId.toString() &&
      !msg.isDeleted
    ).length;
  };
});

// Message schema methods
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
};

messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    addedAt: new Date()
  });
};

messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
};

// Chat schema methods
chatSchema.methods.addParticipant = function(userId, role = 'applicant') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
  }
};

chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
};

chatSchema.methods.updateLastSeen = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastSeen = new Date();
  }
};

chatSchema.methods.muteForUser = function(userId) {
  const existingMute = this.settings.muteNotifications.find(m => m.user.toString() === userId.toString());
  if (!existingMute) {
    this.settings.muteNotifications.push({
      user: userId,
      mutedAt: new Date()
    });
  }
};

chatSchema.methods.unmuteForUser = function(userId) {
  this.settings.muteNotifications = this.settings.muteNotifications.filter(
    m => m.user.toString() !== userId.toString()
  );
};

module.exports = mongoose.model('Chat', chatSchema);
