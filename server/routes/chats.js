const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Application = require('../models/Application');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user chats
// @route   GET /api/chats
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = {
      'participants.user': req.user.id,
      isActive: true
    };

    if (type) query.type = type;

    const chats = await Chat.find(query)
      .populate('participants.user', 'firstName lastName avatar')
      .populate('application', 'status job')
      .populate('job', 'title company')
      .populate('company', 'name logo')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Chat.countDocuments(query);

    res.json({
      success: true,
      count: chats.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      data: chats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single chat
// @route   GET /api/chats/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants.user', 'firstName lastName avatar')
      .populate('application', 'status job')
      .populate('job', 'title company')
      .populate('company', 'name logo')
      .populate('messages.sender', 'firstName lastName avatar')
      .populate('messages.replyTo')
      .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat'
      });
    }

    // Update last seen
    chat.updateLastSeen(req.user.id);
    await chat.save();

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create chat
// @route   POST /api/chats
// @access  Private
router.post('/', protect, [
  body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
  body('type').isIn(['direct', 'group', 'application']).withMessage('Invalid chat type'),
  body('title').optional().isLength({ max: 100 }).withMessage('Title cannot be more than 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { participants, type, title, description, applicationId, jobId, companyId } = req.body;

    // Add current user to participants if not already included
    const allParticipants = [...participants];
    if (!allParticipants.some(p => p.user === req.user.id)) {
      allParticipants.push({
        user: req.user.id,
        role: req.user.role === 'employer' ? 'recruiter' : 'applicant'
      });
    }

    // Check if participants exist
    const userIds = allParticipants.map(p => p.user);
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found'
      });
    }

    // For application chats, verify the application exists and user has access
    if (type === 'application' && applicationId) {
      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check if user has access to this application
      const hasAccess = 
        application.applicant.toString() === req.user.id ||
        (req.user.role === 'employer' && await canUserViewApplication(req.user.id, application.company));

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create chat for this application'
        });
      }
    }

    const chat = await Chat.create({
      participants: allParticipants,
      type,
      title,
      description,
      application: applicationId,
      job: jobId,
      company: companyId
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'firstName lastName avatar')
      .populate('application', 'status job')
      .populate('job', 'title company')
      .populate('company', 'name logo');

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: populatedChat
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send message
// @route   POST /api/chats/:id/messages
// @access  Private
router.post('/:id/messages', protect, [
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'image', 'file', 'system']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat'
      });
    }

    const { content, type = 'text', attachments, replyTo } = req.body;

    const message = {
      sender: req.user.id,
      content,
      type,
      attachments: attachments || [],
      replyTo
    };

    chat.messages.push(message);
    chat.lastMessage = chat.messages[chat.messages.length - 1]._id;
    chat.metadata.totalMessages += 1;

    // Update unread count for other participants
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user.id) {
        chat.metadata.unreadCount += 1;
      }
    });

    await chat.save();

    const populatedMessage = await Chat.findById(chat._id)
      .populate('messages.sender', 'firstName lastName avatar')
      .populate('messages.replyTo')
      .then(chat => chat.messages[chat.messages.length - 1]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this chat'
      });
    }

    // Update last seen
    chat.updateLastSeen(req.user.id);
    chat.metadata.unreadCount = 0;

    await chat.save();

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add reaction to message
// @route   POST /api/chats/:id/messages/:messageId/reactions
// @access  Private
router.post('/:id/messages/:messageId/reactions', protect, [
  body('emoji').trim().notEmpty().withMessage('Emoji is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to react to messages in this chat'
      });
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const { emoji } = req.body;
    message.addReaction(req.user.id, emoji);

    await chat.save();

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: message.reactions
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Remove reaction from message
// @route   DELETE /api/chats/:id/messages/:messageId/reactions
// @access  Private
router.delete('/:id/messages/:messageId/reactions', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove reactions from messages in this chat'
      });
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.removeReaction(req.user.id);
    await chat.save();

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: message.reactions
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add participant to chat
// @route   POST /api/chats/:id/participants
// @access  Private
router.post('/:id/participants', protect, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').optional().isIn(['applicant', 'recruiter', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add participants to this chat'
      });
    }

    const { userId, role = 'applicant' } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    chat.addParticipant(userId, role);
    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Participant added successfully',
      data: populatedChat.participants
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Remove participant from chat
// @route   DELETE /api/chats/:id/participants/:participantId
// @access  Private
router.delete('/:id/participants/:participantId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove participants from this chat'
      });
    }

    const participant = chat.participants.id(req.params.participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    chat.removeParticipant(participant.user);
    await chat.save();

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Archive chat
// @route   PUT /api/chats/:id/archive
// @access  Private
router.put('/:id/archive', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this chat'
      });
    }

    chat.isArchived = true;
    chat.archivedAt = new Date();
    chat.archivedBy = req.user.id;

    await chat.save();

    res.json({
      success: true,
      message: 'Chat archived successfully'
    });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function
async function canUserViewApplication(userId, companyId) {
  const Company = require('../models/Company');
  const company = await Company.findById(companyId);
  if (!company) return false;

  const isOwner = company.owner.toString() === userId;
  const isTeamMember = company.team.some(member => 
    member.user.toString() === userId && 
    member.permissions.includes('view_applications')
  );

  return isOwner || isTeamMember;
}

module.exports = router;
