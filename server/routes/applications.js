const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by user role
    if (req.user.role === 'student') {
      query.applicant = req.user.id;
    } else if (req.user.role === 'employer') {
      query.company = { $in: await getCompanyIdsForUser(req.user.id) };
    }

    // Apply additional filters
    if (status) query.status = status;
    if (jobId) query.job = jobId;
    if (companyId) query.company = companyId;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const applications = await Application.find(query)
      .populate('job', 'title company category type level location salary')
      .populate('applicant', 'firstName lastName email avatar skills')
      .populate('company', 'name logo industry')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      count: applications.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company category type level location salary requirements responsibilities')
      .populate('applicant', 'firstName lastName email avatar skills experience education resume')
      .populate('company', 'name logo industry')
      .populate('notes.author', 'firstName lastName avatar');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to view this application
    const canView = 
      application.applicant.toString() === req.user.id ||
      (req.user.role === 'employer' && await canUserViewApplication(req.user.id, application.company)) ||
      req.user.role === 'admin';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create application
// @route   POST /api/applications
// @access  Private/Student
router.post('/', protect, authorize('student'), [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('coverLetter').optional().isLength({ max: 2000 }).withMessage('Cover letter cannot be more than 2000 characters')
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

    const { jobId, coverLetter, answers } = req.body;

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Job is not currently accepting applications'
      });
    }

    // Check if user has already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Get company
    const company = await Company.findById(job.company);

    // Create application
    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      company: job.company,
      coverLetter,
      answers: answers || []
    });

    // Update job stats
    job.stats.applications += 1;
    await job.save();

    // Update company stats
    company.stats.totalApplications += 1;
    await company.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    user.stats.applicationsSent += 1;
    const xpResult = user.addXP(25);
    await user.save();

    // Create notification for company
    await Notification.create({
      user: company.owner,
      type: 'application_received',
      title: 'New Application Received',
      message: `${user.firstName} ${user.lastName} has applied for ${job.title}`,
      data: {
        applicationId: application._id,
        jobId: job._id,
        userId: user._id
      },
      priority: 'medium'
    });

    const populatedApplication = await Application.findById(application._id)
      .populate('job', 'title company category type level location')
      .populate('applicant', 'firstName lastName email avatar')
      .populate('company', 'name logo industry');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: populatedApplication,
      xpGained: 25,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private/Employer
router.put('/:id/status', protect, authorize('employer', 'admin'), [
  body('status').isIn([
    'applied', 'under-review', 'shortlisted', 'interview-scheduled',
    'interview-completed', 'offer-extended', 'offer-accepted',
    'offer-declined', 'rejected', 'withdrawn'
  ]).withMessage('Invalid status'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message cannot be more than 500 characters')
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

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to update this application
    const canUpdate = 
      (req.user.role === 'employer' && await canUserViewApplication(req.user.id, application.company)) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    const { status, message } = req.body;
    const oldStatus = application.status;

    application.status = status;
    application.timeline.push({
      status: status,
      message: message || `Status changed to ${status}`,
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await application.save();

    // Create notification for applicant
    await Notification.create({
      user: application.applicant,
      type: 'application_update',
      title: 'Application Status Updated',
      message: `Your application status has been updated to ${status}`,
      data: {
        applicationId: application._id,
        jobId: application.job,
        status: status
      },
      priority: 'high'
    });

    const populatedApplication = await Application.findById(application._id)
      .populate('job', 'title company')
      .populate('applicant', 'firstName lastName email')
      .populate('company', 'name logo');

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: populatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add note to application
// @route   POST /api/applications/:id/notes
// @access  Private/Employer
router.post('/:id/notes', protect, authorize('employer', 'admin'), [
  body('content').trim().notEmpty().withMessage('Note content is required'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean')
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

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to add notes
    const canAddNote = 
      (req.user.role === 'employer' && await canUserViewApplication(req.user.id, application.company)) ||
      req.user.role === 'admin';

    if (!canAddNote) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add notes to this application'
      });
    }

    const { content, isPrivate = false } = req.body;

    application.notes.push({
      author: req.user.id,
      content,
      isPrivate
    });

    await application.save();

    const populatedApplication = await Application.findById(application._id)
      .populate('notes.author', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: populatedApplication.notes
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Schedule interview
// @route   POST /api/applications/:id/interview
// @access  Private/Employer
router.post('/:id/interview', protect, authorize('employer', 'admin'), [
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('interviewType').isIn(['phone', 'video', 'in-person', 'technical', 'panel', 'hr'])
    .withMessage('Invalid interview type'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
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

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to schedule interview
    const canSchedule = 
      (req.user.role === 'employer' && await canUserViewApplication(req.user.id, application.company)) ||
      req.user.role === 'admin';

    if (!canSchedule) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to schedule interview for this application'
      });
    }

    const {
      scheduledDate,
      interviewType,
      location,
      meetingLink,
      interviewer,
      duration
    } = req.body;

    application.interview = {
      scheduledDate: new Date(scheduledDate),
      interviewType,
      location,
      meetingLink,
      interviewer,
      duration,
      status: 'scheduled'
    };

    application.status = 'interview-scheduled';
    application.timeline.push({
      status: 'interview-scheduled',
      message: `Interview scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
      changedBy: req.user.id,
      changedAt: new Date(),
      metadata: {
        interviewDate: new Date(scheduledDate),
        interviewType,
        location,
        notes: `Interview scheduled for ${duration} minutes`
      }
    });

    await application.save();

    // Create notification for applicant
    await Notification.create({
      user: application.applicant,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `Your interview has been scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
      data: {
        applicationId: application._id,
        jobId: application.job,
        interviewDate: new Date(scheduledDate),
        interviewType,
        location,
        meetingLink
      },
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application.interview
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private/Student
router.put('/:id/withdraw', protect, authorize('student'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.applicant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }

    if (application.status === 'withdrawn') {
      return res.status(400).json({
        success: false,
        message: 'Application has already been withdrawn'
      });
    }

    application.status = 'withdrawn';
    application.timeline.push({
      status: 'withdrawn',
      message: 'Application withdrawn by applicant',
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await application.save();

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper functions
async function getCompanyIdsForUser(userId) {
  const companies = await Company.find({
    $or: [
      { owner: userId },
      { 'team.user': userId }
    ]
  }).select('_id');
  
  return companies.map(company => company._id);
}

async function canUserViewApplication(userId, companyId) {
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
