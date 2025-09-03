const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getTrendingJobs,
  getJobsByCompany,
  saveJob,
  getJobCategories
} = require('../controllers/jobController');

const router = express.Router();

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
router.get('/', optionalAuth, getJobs);

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
router.get('/:id', optionalAuth, getJob);

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Employer
router.post('/', protect, authorize('employer', 'admin'), [
  body('title').trim().notEmpty().withMessage('Job title is required'),
  body('description').trim().notEmpty().withMessage('Job description is required'),
  body('requirements').trim().notEmpty().withMessage('Job requirements are required'),
  body('responsibilities').trim().notEmpty().withMessage('Job responsibilities are required'),
  body('category').isIn([
    'Technology', 'Design', 'Marketing', 'Sales', 'Finance', 'HR',
    'Operations', 'Customer Service', 'Healthcare', 'Education',
    'Engineering', 'Data Science', 'Product', 'Business', 'Other'
  ]).withMessage('Invalid job category'),
  body('type').isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'])
    .withMessage('Invalid job type'),
  body('level').isIn(['entry', 'junior', 'mid', 'senior', 'lead', 'executive'])
    .withMessage('Invalid job level'),
  body('company').isMongoId().withMessage('Valid company ID is required')
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
}, createJob);

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Employer
router.put('/:id', protect, authorize('employer', 'admin'), [
  body('title').optional().trim().notEmpty().withMessage('Job title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Job description cannot be empty'),
  body('category').optional().isIn([
    'Technology', 'Design', 'Marketing', 'Sales', 'Finance', 'HR',
    'Operations', 'Customer Service', 'Healthcare', 'Education',
    'Engineering', 'Data Science', 'Product', 'Business', 'Other'
  ]).withMessage('Invalid job category'),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'temporary'])
    .withMessage('Invalid job type'),
  body('level').optional().isIn(['entry', 'junior', 'mid', 'senior', 'lead', 'executive'])
    .withMessage('Invalid job level')
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
}, updateJob);

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Employer
router.delete('/:id', protect, authorize('employer', 'admin'), deleteJob);

// @desc    Get trending jobs
// @route   GET /api/jobs/trending
// @access  Public
router.get('/trending', getTrendingJobs);

// @desc    Get jobs by company
// @route   GET /api/jobs/company/:companyId
// @access  Public
router.get('/company/:companyId', getJobsByCompany);

// @desc    Save/unsave job
// @route   POST /api/jobs/:id/save
// @access  Private
router.post('/:id/save', protect, saveJob);

// @desc    Get job categories
// @route   GET /api/jobs/categories
// @access  Public
router.get('/categories', getJobCategories);

module.exports = router;