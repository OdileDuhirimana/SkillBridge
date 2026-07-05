const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/pushNotifications');

const router = express.Router();

// WHY route order matters here: Express matches routes in registration
// order, and `/:id` matches ANY single path segment — including literal
// segments like `unread-count` or `preferences`. Those static routes were
// previously registered AFTER `GET /:id`/`PUT /:id`, so a request to
// `GET /api/notifications/unread-count` was actually handled by the `/:id`
// route with `id = 'unread-count'`, which fails Mongoose's ObjectId cast
// and surfaces as an unrelated 404. Worse, `PUT /api/notifications/preferences`
// was shadowed by the *admin-only* `PUT /:id` route, meaning every
// non-admin user calling this endpoint got an incorrect 403 instead of
// updating their preferences. All static-path routes are grouped and
// registered before any `/:id`-shaped route to prevent this class of bug
// from recurring as new routes are added.

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      priority,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('type').isIn([
    'job_match', 'application_update', 'interview_scheduled', 'message_received',
    'application_received', 'job_posted', 'profile_viewed', 'connection_request',
    'skill_endorsement', 'badge_earned', 'xp_milestone', 'reminder', 'system'
  ]).withMessage('Invalid notification type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // WHY the explicit `user: req.body.userId` mapping: the request/
    // validator use `userId` (matching the client's naming convention for
    // a foreign-key field in a request body), but the Notification schema's
    // field is `user` (matching every other model's ref-field naming in
    // this codebase). Passing `req.body` straight through to
    // `createNotification` previously left `user` undefined on every call,
    // which failed the schema's `required` validator on every single
    // request — this endpoint could never successfully create a
    // notification. Destructuring and renaming here keeps the request
    // body's public field name stable while satisfying the schema.
    const { userId, ...notificationFields } = req.body;
    const notification = await Notification.createNotification({
      ...notificationFields,
      user: userId
    });

    // Send push notification if user has FCM token
    const user = await User.findById(req.body.userId);
    if (user && user.fcmToken) {
      await sendPushNotification(user.fcmToken, {
        title: req.body.title,
        body: req.body.message,
        data: {
          notificationId: notification._id.toString(),
          type: req.body.type
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
router.get('/preferences', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');

    res.json({
      success: true,
      data: user.preferences.notifications
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
router.put('/preferences', protect, [
  body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
  body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
  body('sms').optional().isBoolean().withMessage('SMS preference must be boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, push, sms } = req.body;

    const updateData = {};
    if (email !== undefined) updateData['preferences.notifications.email'] = email;
    if (push !== undefined) updateData['preferences.notifications.push'] = push;
    if (sms !== undefined) updateData['preferences.notifications.sms'] = sms;

    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update FCM token
// @route   PUT /api/notifications/fcm-token
// @access  Private
router.put('/fcm-token', protect, [
  body('token').trim().notEmpty().withMessage('FCM token is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    await User.findByIdAndUpdate(req.user.id, { fcmToken: token });

    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cleanup expired notifications
// @route   POST /api/notifications/cleanup
// @access  Private/Admin
router.post('/cleanup', protect, authorize('admin'), async (req, res, next) => {
  try {
    const result = await Notification.cleanupExpired();

    res.json({
      success: true,
      message: 'Expired notifications cleaned up successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('data.jobId', 'title company')
      .populate('data.applicationId', 'status')
      .populate('data.companyId', 'name logo')
      .populate('data.userId', 'firstName lastName avatar');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    notification.markAsRead();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update notification
// @route   PUT /api/notifications/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('message').optional().trim().notEmpty().withMessage('Message cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Notification updated successfully',
      data: updatedNotification
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification or is admin
    if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
router.put('/:id/archive', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this notification'
      });
    }

    notification.archive();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification archived successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
