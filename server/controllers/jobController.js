const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      level,
      location,
      remote,
      salaryMin,
      salaryMax,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      urgent
    } = req.query;

    const query = { status: 'active' };

    // Apply filters
    if (category) query.category = category;
    if (type) query.type = type;
    if (level) query.level = level;
    if (remote !== undefined) query.isRemote = remote === 'true';
    if (featured === 'true') query.isFeatured = true;
    if (urgent === 'true') query.isUrgent = true;

    // Location filter
    if (location) {
      query.$or = [
        { 'location.address.city': { $regex: location, $options: 'i' } },
        { 'location.address.state': { $regex: location, $options: 'i' } },
        { 'location.address.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Salary filter
    if (salaryMin || salaryMax) {
      query.$or = [
        { 'salary.min': { $gte: parseInt(salaryMin) || 0 } },
        { 'salary.max': { $lte: parseInt(salaryMax) || 999999 } }
      ];
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const jobs = await Job.find(query)
      .populate('company', 'name logo industry size headquarters')
      .populate('postedBy', 'firstName lastName avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      count: jobs.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      data: jobs
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name logo industry size headquarters description benefits culture')
      .populate('postedBy', 'firstName lastName avatar')
      .populate('hiringManager', 'firstName lastName avatar');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count
    job.stats.views += 1;
    await job.save();

    // Check if user has already applied
    let hasApplied = false;
    if (req.user) {
      const application = await Application.findOne({
        job: job._id,
        applicant: req.user.id
      });
      hasApplied = !!application;
    }

    res.json({
      success: true,
      data: {
        ...job.toObject(),
        hasApplied
      }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Employer
const createJob = async (req, res) => {
  try {
    const company = await Company.findById(req.body.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has permission to post jobs for this company
    const isOwner = company.owner.toString() === req.user.id;
    const isTeamMember = company.team.some(member => 
      member.user.toString() === req.user.id && 
      member.permissions.includes('create_jobs')
    );

    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to post jobs for this company'
      });
    }

    const job = await Job.create({
      ...req.body,
      postedBy: req.user.id
    });

    // Update company stats
    company.stats.totalJobs += 1;
    company.stats.activeJobs += 1;
    await company.save();

    const populatedJob = await Job.findById(job._id)
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: populatedJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Employer
const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user has permission to update this job
    const company = await Company.findById(job.company);
    const isOwner = company.owner.toString() === req.user.id;
    const isTeamMember = company.team.some(member => 
      member.user.toString() === req.user.id && 
      member.permissions.includes('edit_jobs')
    );

    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('company', 'name logo industry')
     .populate('postedBy', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Employer
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user has permission to delete this job
    const company = await Company.findById(job.company);
    const isOwner = company.owner.toString() === req.user.id;
    const isTeamMember = company.team.some(member => 
      member.user.toString() === req.user.id && 
      member.permissions.includes('delete_jobs')
    );

    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    // Update company stats
    company.stats.totalJobs -= 1;
    company.stats.activeJobs -= 1;
    await company.save();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get trending jobs
// @route   GET /api/jobs/trending
// @access  Public
const getTrendingJobs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const jobs = await Job.find({ status: 'active' })
      .sort({ 'stats.views': -1, 'stats.applications': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName avatar');

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Get trending jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get jobs by company
// @route   GET /api/jobs/company/:companyId
// @access  Public
const getJobsByCompany = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const query = { company: req.params.companyId };
    if (status) query.status = status;

    const jobs = await Job.find(query)
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      count: jobs.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      data: jobs
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Save/unsave job
// @route   POST /api/jobs/:id/save
// @access  Private
const saveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // This would typically be handled by a separate SavedJob model
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get job categories
// @route   GET /api/jobs/categories
// @access  Public
const getJobCategories = async (req, res) => {
  try {
    const categories = await Job.distinct('category');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getTrendingJobs,
  getJobsByCompany,
  saveJob,
  getJobCategories
};

