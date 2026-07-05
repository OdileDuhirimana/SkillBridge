const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const { canManageCompany } = require('../utils/authorization');
const { sanitizeSearchInput, sanitizeTextSearchInput } = require('../utils/sanitize');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { buildCacheKey, getCached, setCached, invalidateByPrefix } = require('../utils/cache');

// Named constant replaces the previously inlined "10" default-page-size
// magic value scattered across multiple controllers.
const DEFAULT_PAGE_SIZE = 10;

// Cache namespace for `GET /api/jobs` listings. Job search results change
// whenever any job is created/updated/deleted or its status transitions
// (e.g. filled/closed), so a short TTL plus explicit invalidation on every
// write (see createJob/updateJob/deleteJob below) keeps staleness bounded
// even if an invalidation call site is ever missed.
const JOBS_LIST_CACHE_NAMESPACE = 'jobs:list';
const JOBS_LIST_CACHE_TTL_SECONDS = 60;

/**
 * Build the Mongoose query for job filtering.
 *
 * WHY this is a separate function: the original implementation assigned to
 * `query.$or` independently for the location filter, the salary filter, and
 * the search filter. Because each assignment overwrote the previous one,
 * supplying more than one of {location, salary, search} silently dropped
 * all but the last filter — a real, demonstrable bug in the core job-listing
 * endpoint (confirmed by the portfolio audit, SCALE-03). Each filter now
 * contributes its own independent `$or` clause into a top-level `$and`
 * array, so filters compose correctly regardless of how many are supplied.
 */
const buildJobQuery = ({ category, type, level, remote, featured, urgent, location, salaryMin, salaryMax, search }) => {
  const query = { status: 'active' };
  const andConditions = [];

  if (category) query.category = category;
  if (type) query.type = type;
  if (level) query.level = level;
  if (remote !== undefined) query.isRemote = remote === 'true';
  if (featured === 'true') query.isFeatured = true;
  if (urgent === 'true') query.isUrgent = true;

  // WHY sanitize here: `location`/`search` are user-controlled strings that
  // flow directly into `$regex`/`new RegExp()`. Escaping regex metacharacters
  // and capping length closes both a regex-injection surface (a value like
  // `.*` matching everything) and a ReDoS surface (catastrophic backtracking
  // from a crafted pattern) — see server/utils/sanitize.js for full rationale.
  const safeLocation = sanitizeSearchInput(location);
  if (safeLocation) {
    andConditions.push({
      $or: [
        { 'location.address.city': { $regex: safeLocation, $options: 'i' } },
        { 'location.address.state': { $regex: safeLocation, $options: 'i' } },
        { 'location.address.country': { $regex: safeLocation, $options: 'i' } }
      ]
    });
  }

  if (salaryMin || salaryMax) {
    const salaryConditions = {};
    if (salaryMin) salaryConditions['salary.max'] = { $gte: parseInt(salaryMin, 10) };
    if (salaryMax) salaryConditions['salary.min'] = { ...(salaryConditions['salary.min'] || {}), $lte: parseInt(salaryMax, 10) };
    andConditions.push(salaryConditions);
  }

  // WHY `$text` instead of a regex `$or` across title/description/category/
  // tags: `server/models/Job.js` already declares a compound text index
  // covering exactly those fields (`jobSchema.index({ title: 'text', ... })`)
  // — but the regex version of this query could never use it (MongoDB
  // cannot use a text index to serve a `$regex` match), so every search
  // request degraded to a full collection scan regardless of the index
  // sitting unused right next to it. `$text` is the query operator that
  // actually engages that index, so this is a real query-optimization
  // change, not just a syntax swap. Note this does change match semantics
  // from "substring anywhere" to "matches indexed word stems" — a expected,
  // standard tradeoff of moving to indexed full-text search.
  const safeTextSearch = sanitizeTextSearchInput(search);
  if (safeTextSearch) {
    andConditions.push({ $text: { $search: safeTextSearch } });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res, next) => {
  try {
    const {
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

    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);

    // `GET /api/jobs` is the platform's highest-traffic read (per
    // docs/architecture.md), and its result depends only on the request's
    // own query params — an ideal, low-risk candidate for caching. The
    // cache key is a hash of every param that affects the result, so
    // different filter/sort/page combinations never collide.
    const cacheKey = buildCacheKey(JOBS_LIST_CACHE_NAMESPACE, {
      page, limit, category, type, level, location, remote, salaryMin, salaryMax, search, sortBy, sortOrder, featured, urgent
    });
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const query = buildJobQuery({ category, type, level, remote, featured, urgent, location, salaryMin, salaryMax, search });

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const jobs = await Job.find(query)
      .populate('company', 'name logo industry size headquarters')
      .populate('postedBy', 'firstName lastName avatar')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Job.countDocuments(query);

    const responseBody = {
      success: true,
      count: jobs.length,
      pagination: buildPaginationMeta(page, limit, total),
      data: jobs
    };

    await setCached(cacheKey, responseBody, JOBS_LIST_CACHE_TTL_SECONDS);

    res.json(responseBody);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
const getJob = async (req, res, next) => {
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
    next(error);
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Employer
const createJob = async (req, res, next) => {
  try {
    const company = await Company.findById(req.body.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!canManageCompany(company, req.user, 'create_jobs')) {
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

    // Every cached `GET /api/jobs` listing may now be stale (a new active
    // job could match any filter combination), so drop all of them rather
    // than trying to reason about which specific cached queries this job
    // would have matched.
    await invalidateByPrefix(JOBS_LIST_CACHE_NAMESPACE);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: populatedJob
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Employer
const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const company = await Company.findById(job.company);
    if (!canManageCompany(company, req.user, 'edit_jobs')) {
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

    await invalidateByPrefix(JOBS_LIST_CACHE_NAMESPACE);

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Employer
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const company = await Company.findById(job.company);
    if (!canManageCompany(company, req.user, 'delete_jobs')) {
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

    await invalidateByPrefix(JOBS_LIST_CACHE_NAMESPACE);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending jobs
// @route   GET /api/jobs/trending
// @access  Public
const getTrendingJobs = async (req, res, next) => {
  try {
    const { limit = DEFAULT_PAGE_SIZE } = req.query;

    const jobs = await Job.find({ status: 'active' })
      .sort({ 'stats.views': -1, 'stats.applications': -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName avatar');

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get jobs by company
// @route   GET /api/jobs/company/:companyId
// @access  Public
const getJobsByCompany = async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);

    const query = { company: req.params.companyId };
    if (status) query.status = status;

    const jobs = await Job.find(query)
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      count: jobs.length,
      pagination: buildPaginationMeta(page, limit, total),
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/unsave job
// @route   POST /api/jobs/:id/save
// @access  Private
const saveJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // NOTE (known gap, intentionally not implemented in this pass): saving
    // jobs requires a persisted SavedJob relation (or a `savedBy` array on
    // Job/User) to actually track state per-user. Until that model exists,
    // this endpoint is intentionally left unimplemented rather than faking
    // a success response with no persisted effect — the frontend does not
    // call this endpoint. See docs/architecture.md "Known Technical Debt".
    return res.status(501).json({
      success: false,
      message: 'Saving jobs is not yet implemented'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job categories
// @route   GET /api/jobs/categories
// @access  Public
const getJobCategories = async (req, res, next) => {
  try {
    const categories = await Job.distinct('category');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
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
  getJobCategories,
  buildJobQuery
};
