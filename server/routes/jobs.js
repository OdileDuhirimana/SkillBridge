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

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job listing, search, and management
 */

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List active jobs with filtering, sorting, and pagination
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: Free-text match against city/state/country
 *       - in: query
 *         name: salaryMin
 *         schema: { type: integer }
 *       - in: query
 *         name: salaryMax
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: A paginated list of active jobs
 */
router.get('/', optionalAuth, getJobs);

// WHY these are registered before `GET /:id`: Express matches routes in
// registration order, and `/:id` matches any single path segment —
// including literal segments like `trending` or `categories`. Both were
// previously registered AFTER `GET /:id`, so `GET /api/jobs/trending` was
// actually being handled by the `/:id` route with `id = 'trending'`, which
// fails Mongoose's ObjectId cast and surfaces as an unrelated 404 instead
// of the trending-jobs list. Same bug class as the one fixed in
// server/routes/notifications.js and server/routes/companies.js.

// @desc    Get trending jobs
// @route   GET /api/jobs/trending
// @access  Public
router.get('/trending', getTrendingJobs);

// @desc    Get job categories
// @route   GET /api/jobs/categories
// @access  Public
router.get('/categories', getJobCategories);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get a single job by id
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The requested job, including whether the current user has already applied
 *       404:
 *         description: Job not found
 */
router.get('/:id', optionalAuth, getJob);

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job posting for a company the user owns or manages
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, requirements, responsibilities, category, type, level, company]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               requirements: { type: string }
 *               responsibilities: { type: string }
 *               category: { type: string }
 *               type: { type: string }
 *               level: { type: string }
 *               company: { type: string, description: Company id }
 *     responses:
 *       201:
 *         description: Job created successfully
 *       403:
 *         description: Not authorized to post jobs for this company
 */
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

// @desc    Get jobs by company
// @route   GET /api/jobs/company/:companyId
// @access  Public
router.get('/company/:companyId', getJobsByCompany);

// @desc    Save/unsave job
// @route   POST /api/jobs/:id/save
// @access  Private
router.post('/:id/save', protect, saveJob);

module.exports = router;