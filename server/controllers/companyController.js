const Company = require('../models/Company');
const User = require('../models/User');
const { canManageCompany, isCompanyOwner } = require('../utils/authorization');
const { sanitizeTextSearchInput } = require('../utils/sanitize');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { getCached, setCached, deleteCached } = require('../utils/cache');
const { recordAuditLog } = require('../utils/auditLog');

const DEFAULT_PAGE_SIZE = 10;

// Cache namespace for a single company's profile (`GET /api/companies/:id`),
// the second hot read path named alongside job listings for caching. Keyed
// per-company-id rather than per-query since this endpoint has no filter
// params — invalidation on update is therefore a single targeted delete,
// not a prefix scan.
const COMPANY_PROFILE_CACHE_NAMESPACE = 'company:profile';
const COMPANY_PROFILE_CACHE_TTL_SECONDS = 120;

/** Builds this endpoint's cache key for a given company id (see getCompany). */
const companyProfileCacheKey = (companyId) => `${COMPANY_PROFILE_CACHE_NAMESPACE}:${companyId}`;

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public
const getCompanies = async (req, res, next) => {
  try {
    const {
      industry,
      size,
      verified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);
    const query = { isActive: true };

    if (industry) query.industry = industry;
    if (size) query.size = size;
    if (verified !== undefined) query.isVerified = verified === 'true';

    // WHY `$text` instead of a regex `$or`: `server/models/Company.js`
    // already declares a compound text index covering name/description/
    // industry/headquarters — but a `$regex` query cannot use a text index,
    // so this search previously fell back to a full collection scan on
    // every request despite the index sitting unused right next to it (the
    // same gap fixed in jobController's `buildJobQuery`; see that file's
    // comment for the full rationale). `$text` is what actually engages
    // the index.
    const safeTextSearch = sanitizeTextSearchInput(search);
    if (safeTextSearch) {
      query.$text = { $search: safeTextSearch };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const companies = await Company.find(query)
      .populate('owner', 'firstName lastName avatar')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      count: companies.length,
      pagination: buildPaginationMeta(page, limit, total),
      data: companies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public
const getCompany = async (req, res, next) => {
  try {
    const cacheKey = companyProfileCacheKey(req.params.id);

    // WHY `profileViews` is only incremented on a cache miss: this is a
    // deliberate accuracy-vs-performance tradeoff, not an oversight — while
    // a company's profile is served from cache, its view counter is
    // approximate (undercounted) rather than exact, in exchange for not
    // writing to MongoDB on every single profile view. Given `stats.profileViews`
    // is a display metric, not a billing or security-relevant figure, this
    // tradeoff is appropriate; the counter self-corrects the moment the
    // cache entry expires (COMPANY_PROFILE_CACHE_TTL_SECONDS) or is
    // invalidated by an update.
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const company = await Company.findById(req.params.id)
      .populate('owner', 'firstName lastName avatar')
      .populate('team.user', 'firstName lastName avatar role');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.stats.profileViews += 1;
    await company.save();

    const responseBody = {
      success: true,
      data: company
    };

    await setCached(cacheKey, responseBody, COMPANY_PROFILE_CACHE_TTL_SECONDS);

    res.json(responseBody);
  } catch (error) {
    next(error);
  }
};

// @desc    Create company
// @route   POST /api/companies
// @access  Private/Employer
const createCompany = async (req, res, next) => {
  try {
    const company = await Company.create({
      ...req.body,
      owner: req.user.id
    });

    const populatedCompany = await Company.findById(company._id)
      .populate('owner', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: populatedCompany
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/Employer
const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!canManageCompany(company, req.user, 'manage_company')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this company'
      });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName avatar')
     .populate('team.user', 'firstName lastName avatar role');

    await deleteCached(companyProfileCacheKey(req.params.id));

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload company logo
// @route   POST /api/companies/:id/logo
// @access  Private/Employer
const uploadLogo = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!canManageCompany(company, req.user, 'manage_company')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this company'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    company.logo = req.file.path;
    await company.save();

    await deleteCached(companyProfileCacheKey(req.params.id));

    res.json({
      success: true,
      message: 'Logo updated successfully',
      data: {
        logo: company.logo
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member
// @route   POST /api/companies/:id/team
// @access  Private/Employer
const addTeamMember = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!isCompanyOwner(company, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage team'
      });
    }

    const { userId, role, permissions } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const existingMember = company.team.find(member =>
      member.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    company.team.push({
      user: userId,
      role: role,
      permissions: permissions
    });

    await company.save();

    const populatedCompany = await Company.findById(company._id)
      .populate('team.user', 'firstName lastName avatar role');

    await deleteCached(companyProfileCacheKey(req.params.id));

    // Persisted audit trail for a permission-relevant change: granting a
    // user access (and a specific role/permission set) to manage this
    // company. See server/utils/auditLog.js for why this is non-blocking.
    await recordAuditLog({
      actorId: req.user.id,
      action: 'company_team_member_added',
      targetType: 'Company',
      targetId: company._id,
      after: { userId, role, permissions }
    });

    res.json({
      success: true,
      message: 'Team member added successfully',
      data: populatedCompany.team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member
// @route   DELETE /api/companies/:id/team/:memberId
// @access  Private/Employer
const removeTeamMember = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!isCompanyOwner(company, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage team'
      });
    }

    const member = company.team.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Captured before removal — see the audit-log call below, which needs
    // to record who/what was removed after `member` is no longer in the array.
    const removedMemberSnapshot = { userId: member.user.toString(), role: member.role };

    // WHY `.deleteOne()` and not `.remove()`: Mongoose 7 removed
    // `Document#remove()` entirely (including on array subdocuments) —
    // `.remove()` here threw "member.remove is not a function" on every
    // call, meaning this endpoint could never actually succeed. `.deleteOne()`
    // is the Mongoose 7+ replacement and correctly pulls this subdocument
    // out of the parent `team` array.
    member.deleteOne();
    await company.save();

    await deleteCached(companyProfileCacheKey(req.params.id));

    // Persisted audit trail for a permission-relevant change: revoking a
    // user's access to manage this company.
    await recordAuditLog({
      actorId: req.user.id,
      action: 'company_team_member_removed',
      targetType: 'Company',
      targetId: company._id,
      before: removedMemberSnapshot
    });

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add company review
// @route   POST /api/companies/:id/reviews
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const existingReview = company.reviews.find(review =>
      review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this company'
      });
    }

    const review = {
      user: req.user.id,
      rating: req.body.rating,
      title: req.body.title,
      content: req.body.content,
      pros: req.body.pros || [],
      cons: req.body.cons || [],
      workLifeBalance: req.body.workLifeBalance,
      compensation: req.body.compensation,
      management: req.body.management,
      culture: req.body.culture
    };

    company.reviews.push(review);
    company.calculateAverageRating();
    await company.save();

    await deleteCached(companyProfileCacheKey(req.params.id));

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: company.reviews[company.reviews.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get company reviews
// @route   GET /api/companies/:id/reviews
// @access  Public
const getCompanyReviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const reviews = company.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      count: reviews.length,
      pagination: buildPaginationMeta(page, limit, company.reviews.length),
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get company industries
// @route   GET /api/companies/industries
// @access  Public
const getCompanyIndustries = async (req, res, next) => {
  try {
    const industries = await Company.distinct('industry');

    res.json({
      success: true,
      data: industries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Follow/Unfollow company
// @route   POST /api/companies/:id/follow
// @access  Private
const followCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // NOTE (known gap, intentionally not implemented in this pass): following
    // a company requires a persisted Follow relation to track per-user state.
    // Rather than faking a success response with no persisted effect, this
    // endpoint honestly reports as not-yet-implemented. The frontend does not
    // call this endpoint. See docs/architecture.md "Known Technical Debt".
    return res.status(501).json({
      success: false,
      message: 'Following companies is not yet implemented'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
