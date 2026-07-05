const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { canManageCompany } = require('../utils/authorization');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { recordAuditLog } = require('../utils/auditLog');

const router = express.Router();

const APPLICATION_XP = 25;
const DEFAULT_PAGE_SIZE = 10;

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job applications submitted by students and reviewed by employers
 */

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: List applications visible to the current user
 *     description: >
 *       Students see only their own applications; employers see applications
 *       to companies they own or are a team member of; admins see all.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: A paginated list of applications
 *       401:
 *         description: Not authorized
 */
// @desc    Get all applications
// @route   GET /api/applications
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      status,
      jobId,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);
    const query = {};

    if (req.user.role === 'student') {
      query.applicant = req.user.id;
    } else if (req.user.role === 'employer') {
      query.company = { $in: await getCompanyIdsForUser(req.user.id) };
    }

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
      .limit(limit)
      .skip(skip);

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      count: applications.length,
      pagination: buildPaginationMeta(page, limit, total),
      data: applications
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
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

    const canView =
      application.applicant._id.toString() === req.user.id ||
      (req.user.role === 'employer' && await canUserViewApplication(req.user, application.company)) ||
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
    next(error);
  }
});

/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Submit an application to a job (students only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId]
 *             properties:
 *               jobId: { type: string }
 *               coverLetter: { type: string, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Already applied, or job is not accepting applications
 *       403:
 *         description: Only students may apply to jobs
 */
// @desc    Create application
// @route   POST /api/applications
// @access  Private/Student
router.post('/', protect, authorize('student'), [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('coverLetter').optional().isLength({ max: 2000 }).withMessage('Cover letter cannot be more than 2000 characters')
], runValidation, async (req, res, next) => {
  try {
    const { jobId, coverLetter, answers } = req.body;

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

    const company = await Company.findById(job.company);

    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      company: job.company,
      coverLetter,
      answers: answers || []
    });

    job.stats.applications += 1;
    await job.save();

    company.stats.totalApplications += 1;
    await company.save();

    const user = await User.findById(req.user.id);
    user.stats.applicationsSent += 1;
    const xpResult = user.addXP(APPLICATION_XP);
    await user.save();

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
      xpGained: APPLICATION_XP,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel
    });
  } catch (error) {
    next(error);
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
], runValidation, async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const canUpdate =
      (req.user.role === 'employer' && await canUserViewApplication(req.user, application.company)) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    const { status, message } = req.body;
    const previousStatus = application.status;

    application.status = status;
    application.timeline.push({
      status: status,
      message: message || `Status changed to ${status}`,
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await application.save();

    // Persisted audit trail (server/models/AuditLog.js) for a sensitive
    // state transition: who changed a candidate's application status, from
    // what, to what, and when. This is deliberately non-blocking — see
    // server/utils/auditLog.js for why a logging failure must not fail the
    // status update itself.
    await recordAuditLog({
      actorId: req.user.id,
      action: 'application_status_changed',
      targetType: 'Application',
      targetId: application._id,
      before: { status: previousStatus },
      after: { status },
      metadata: { message: message || null }
    });

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
    next(error);
  }
});

// @desc    Add note to application
// @route   POST /api/applications/:id/notes
// @access  Private/Employer
router.post('/:id/notes', protect, authorize('employer', 'admin'), [
  body('content').trim().notEmpty().withMessage('Note content is required'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean')
], runValidation, async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const canAddNote =
      (req.user.role === 'employer' && await canUserViewApplication(req.user, application.company)) ||
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
    next(error);
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
], runValidation, async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const canSchedule =
      (req.user.role === 'employer' && await canUserViewApplication(req.user, application.company)) ||
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
    next(error);
  }
});

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private/Student
router.put('/:id/withdraw', protect, authorize('student'), async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

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
    next(error);
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

async function canUserViewApplication(user, companyId) {
  const company = await Company.findById(companyId);
  return canManageCompany(company, user, 'view_applications');
}

module.exports = router;
