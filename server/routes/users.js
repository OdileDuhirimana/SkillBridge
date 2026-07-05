const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../utils/upload');
const {
  getUsers,
  getUser,
  updateUser,
  uploadAvatar,
  uploadResume,
  addSkill,
  updateSkill,
  deleteSkill,
  getUserStats,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), getUsers);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, getUser);

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot be more than 500 characters'),
  body('location').optional().isLength({ max: 100 }).withMessage('Location cannot be more than 100 characters'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone cannot be more than 20 characters'),
  body('website').optional().isURL().withMessage('Please provide a valid website URL'),
  body('linkedin').optional().isURL().withMessage('Please provide a valid LinkedIn URL'),
  body('github').optional().isURL().withMessage('Please provide a valid GitHub URL')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, updateUser);

// @desc    Upload avatar
// @route   POST /api/users/:id/avatar
// @access  Private
//
// WHY `handleUploadError` is mounted right after `upload.single(...)`:
// multer's `fileFilter`/file-size rejections (see server/utils/upload.js)
// surface as a plain `Error` passed to `next(error)`, which — without this
// handler catching it first — falls through to the generic
// `server/middleware/errorHandler.js`. That handler only special-cases
// Mongoose/JWT error shapes, so an unrecognized plain `Error` defaults to
// `statusCode = 500`, turning a client mistake (wrong file type, file too
// large) into a misleading "500 Internal Server Error" instead of the 400
// `handleUploadError` was written to produce. `handleUploadError` existed
// in utils/upload.js already but was never wired into any route — dead
// code that silently defeated its own purpose.
router.post('/:id/avatar', protect, upload.single('avatar'), handleUploadError, uploadAvatar);

// @desc    Upload resume
// @route   POST /api/users/:id/resume
// @access  Private
router.post('/:id/resume', protect, upload.single('resume'), handleUploadError, uploadResume);

// @desc    Add skill
// @route   POST /api/users/:id/skills
// @access  Private
router.post('/:id/skills', protect, [
  body('name').trim().notEmpty().withMessage('Skill name is required'),
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, addSkill);

// @desc    Update skill
// @route   PUT /api/users/:id/skills/:skillId
// @access  Private
router.put('/:id/skills/:skillId', protect, [
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, updateSkill);

// @desc    Delete skill
// @route   DELETE /api/users/:id/skills/:skillId
// @access  Private
router.delete('/:id/skills/:skillId', protect, deleteSkill);

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private
router.get('/:id/stats', protect, getUserStats);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, deleteUser);

module.exports = router;