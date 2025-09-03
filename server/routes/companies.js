const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  uploadLogo,
  addTeamMember,
  removeTeamMember,
  addReview,
  getCompanyReviews,
  getCompanyIndustries,
  followCompany
} = require('../controllers/companyController');

const router = express.Router();

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public
router.get('/', getCompanies);

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public
router.get('/:id', getCompany);

// @desc    Create company
// @route   POST /api/companies
// @access  Private/Employer
router.post('/', protect, authorize('employer', 'admin'), [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('description').trim().notEmpty().withMessage('Company description is required'),
  body('industry').trim().notEmpty().withMessage('Industry is required'),
  body('size').isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
    .withMessage('Invalid company size'),
  body('founded').optional().isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Invalid founded year')
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
}, createCompany);

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/Employer
router.put('/:id', protect, [
  body('name').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Company description cannot be empty'),
  body('industry').optional().trim().notEmpty().withMessage('Industry cannot be empty'),
  body('size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
    .withMessage('Invalid company size')
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
}, updateCompany);

// @desc    Upload company logo
// @route   POST /api/companies/:id/logo
// @access  Private/Employer
router.post('/:id/logo', protect, upload.single('logo'), uploadLogo);

// @desc    Add team member
// @route   POST /api/companies/:id/team
// @access  Private/Employer
router.post('/:id/team', protect, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('permissions').isArray().withMessage('Permissions must be an array')
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
}, addTeamMember);

// @desc    Remove team member
// @route   DELETE /api/companies/:id/team/:memberId
// @access  Private/Employer
router.delete('/:id/team/:memberId', protect, removeTeamMember);

// @desc    Add company review
// @route   POST /api/companies/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Review title is required'),
  body('content').trim().notEmpty().withMessage('Review content is required')
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
}, addReview);

// @desc    Get company reviews
// @route   GET /api/companies/:id/reviews
// @access  Public
router.get('/:id/reviews', getCompanyReviews);

// @desc    Get company industries
// @route   GET /api/companies/industries
// @access  Public
router.get('/industries', getCompanyIndustries);

// @desc    Follow/Unfollow company
// @route   POST /api/companies/:id/follow
// @access  Private
router.post('/:id/follow', protect, followCompany);

module.exports = router;