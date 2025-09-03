const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/upload');
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
router.post('/:id/avatar', protect, upload.single('avatar'), uploadAvatar);

// @desc    Upload resume
// @route   POST /api/users/:id/resume
// @access  Private
router.post('/:id/resume', protect, upload.single('resume'), uploadResume);

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