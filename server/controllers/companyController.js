const Company = require('../models/Company');
const User = require('../models/User');

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public
const getCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      industry,
      size,
      verified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Apply filters
    if (industry) query.industry = industry;
    if (size) query.size = size;
    if (verified !== undefined) query.isVerified = verified === 'true';

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const companies = await Company.find(query)
      .populate('owner', 'firstName lastName avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      count: companies.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'firstName lastName avatar')
      .populate('team.user', 'firstName lastName avatar role');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Increment profile views
    company.stats.profileViews += 1;
    await company.save();

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create company
// @route   POST /api/companies
// @access  Private/Employer
const createCompany = async (req, res) => {
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
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/Employer
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has permission to update this company
    const isOwner = company.owner.toString() === req.user.id;
    const isTeamMember = company.team.some(member => 
      member.user.toString() === req.user.id && 
      member.permissions.includes('manage_company')
    );

    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
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

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload company logo
// @route   POST /api/companies/:id/logo
// @access  Private/Employer
const uploadLogo = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has permission to update this company
    const isOwner = company.owner.toString() === req.user.id;
    const isTeamMember = company.team.some(member => 
      member.user.toString() === req.user.id && 
      member.permissions.includes('manage_company')
    );

    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
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

    res.json({
      success: true,
      message: 'Logo updated successfully',
      data: {
        logo: company.logo
      }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add team member
// @route   POST /api/companies/:id/team
// @access  Private/Employer
const addTeamMember = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has permission to manage team
    const isOwner = company.owner.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage team'
      });
    }

    const { userId, role, permissions } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a team member
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

    res.json({
      success: true,
      message: 'Team member added successfully',
      data: populatedCompany.team
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove team member
// @route   DELETE /api/companies/:id/team/:memberId
// @access  Private/Employer
const removeTeamMember = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has permission to manage team
    const isOwner = company.owner.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
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

    member.remove();
    await company.save();

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add company review
// @route   POST /api/companies/:id/reviews
// @access  Private
const addReview = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user has already reviewed this company
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

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: company.reviews[company.reviews.length - 1]
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get company reviews
// @route   GET /api/companies/:id/reviews
// @access  Public
const getCompanyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const reviews = company.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      count: reviews.length,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(company.reviews.length / limit),
        total: company.reviews.length
      },
      data: reviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get company industries
// @route   GET /api/companies/industries
// @access  Public
const getCompanyIndustries = async (req, res) => {
  try {
    const industries = await Company.distinct('industry');
    
    res.json({
      success: true,
      data: industries
    });
  } catch (error) {
    console.error('Get industries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Follow/Unfollow company
// @route   POST /api/companies/:id/follow
// @access  Private
const followCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // This would typically be handled by a separate Follow model
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Company followed successfully'
    });
  } catch (error) {
    console.error('Follow company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
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

