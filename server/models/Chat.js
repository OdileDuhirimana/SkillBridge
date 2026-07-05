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
  // WHY no `ref` here: same root cause as `chatSchema.lastMessage` above —
  // this id addresses another entry in the *same* embedded `messages`
  // array (a "replying to this earlier message" relationship within one
  // chat), not a document in a separate `Message` collection that was
  // never registered. `.populate('messages.replyTo')` against this ref
  // (previously present in server/routes/chats.js and
  // server/socket/socketHandlers.js) threw `MissingSchemaError` on every
  // call — a second instance of the exact same bug class as `lastMessage`.
  // Use the `replyToPreview` virtual below instead.
  replyTo: {
    type: mongoose.Schema.ObjectId
  }
}, {
  timestamps: true
});

// Virtual replacement for the removed `.populate('messages.replyTo')` call:
// resolves `replyTo` against the parent chat's own `messages` array. Mongoose
// gives every array subdocument a `.parent()` accessor pointing back to the
// document that owns it (the Chat here, since `messages` is a top-level
// embedded array — not itself nested inside another subdocument).
messageSchema.virtual('replyToPreview').get(function() {
  if (!this.replyTo) return undefined;
  const parentChat = this.parent();
  if (!parentChat || !parentChat.messages) return undefined;
  return parentChat.messages.id(this.replyTo);
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
  // WHY no `ref` here: `lastMessage` stores the `_id` of an entry in the
  // `messages` array above, which is an embedded subdocument array, not a
  // separately registered `mongoose.model()`/top-level collection. A `ref`
  // to a model name ('Message') that Mongoose never compiled would cause
  // `.populate('lastMessage')` to throw `MissingSchemaError` at query time
  // (previously present in server/routes/chats.js — a real bug: messages
  // were intentionally embedded for atomic chat updates, not modeled as a
  // separate collection, so there is nothing valid to populate against).
  // Consumers that need the actual message content should use the
  // `lastMessagePreview` virtual below, which looks the subdocument up by
  // id directly from the already-loaded `messages` array — no extra query,
  // no populate, and no dependency on a model that doesn't exist.
  lastMessage: {
    type: mongoose.Schema.ObjectId
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

// Virtual replacement for the removed `.populate('lastMessage')` call:
// resolves the `lastMessage` id against the already-loaded embedded
// `messages` array instead of issuing (or attempting) a cross-collection
// populate. Returns `undefined` if the chat has no messages yet, which
// callers/consumers should treat as "no preview available".
chatSchema.virtual('lastMessagePreview').get(function() {
  if (!this.lastMessage || !this.messages || this.messages.length === 0) {
    return undefined;
  }
  return this.messages.id(this.lastMessage);
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
