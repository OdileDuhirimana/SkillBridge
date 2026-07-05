const User = require('../models/User');
const { sanitizeSearchInput } = require('../utils/sanitize');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const DEFAULT_PAGE_SIZE = 10;
const RESUME_UPLOAD_XP = 50;
const ADD_SKILL_XP = 10;

/**
 * A user may act on a target user's resource if they are that user, or an
 * admin. Centralized here (was previously duplicated inline across every
 * handler in this file) so the rule only needs to change in one place.
 */
const canActOnUser = (requestUser, targetUserId) =>
  requestUser.id === targetUserId || requestUser.role === 'admin';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, DEFAULT_PAGE_SIZE);

    const query = {};
    if (role) query.role = role;
    // See server/utils/sanitize.js — same regex-injection/ReDoS mitigation
    // applied to jobController/companyController search inputs.
    const safeSearch = sanitizeSearchInput(search);
    if (safeSearch) {
      query.$or = [
        { firstName: { $regex: safeSearch, $options: 'i' } },
        { lastName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      pagination: buildPaginationMeta(page, limit, total),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user.id !== req.params.id) {
      user.stats.profileViews += 1;
      await user.save();
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'bio', 'location', 'phone',
      'website', 'linkedin', 'github', 'skills', 'experience',
      'education', 'portfolio', 'preferences'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload avatar
// @route   POST /api/users/:id/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    user.avatar = req.file.path;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload resume
// @route   POST /api/users/:id/resume
// @access  Private
const uploadResume = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a resume file'
      });
    }

    user.resume = {
      url: req.file.path,
      filename: req.file.originalname,
      uploadedAt: new Date()
    };

    const xpResult = user.addXP(RESUME_UPLOAD_XP);
    await user.save();

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resume: user.resume,
        xpGained: RESUME_UPLOAD_XP,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add skill
// @route   POST /api/users/:id/skills
// @access  Private
const addSkill = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, level = 'beginner' } = req.body;

    const existingSkill = user.skills.find(skill =>
      skill.name.toLowerCase() === name.toLowerCase()
    );

    if (existingSkill) {
      return res.status(400).json({
        success: false,
        message: 'Skill already exists'
      });
    }

    user.skills.push({ name, level });
    const xpResult = user.addXP(ADD_SKILL_XP);
    await user.save();

    res.json({
      success: true,
      message: 'Skill added successfully',
      data: user.skills,
      xpGained: ADD_SKILL_XP,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update skill
// @route   PUT /api/users/:id/skills/:skillId
// @access  Private
const updateSkill = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const skill = user.skills.id(req.params.skillId);
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: 'Skill not found'
      });
    }

    skill.level = req.body.level;
    await user.save();

    res.json({
      success: true,
      message: 'Skill updated successfully',
      data: skill
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete skill
// @route   DELETE /api/users/:id/skills/:skillId
// @access  Private
const deleteSkill = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const skill = user.skills.id(req.params.skillId);
    if (!skill) {
      return res.status(404).json({
        success: false,
        message: 'Skill not found'
      });
    }

    // WHY `.deleteOne()` and not `.remove()`: Mongoose 7 removed
    // `Document#remove()` entirely (including on array subdocuments) —
    // `.remove()` here threw "skill.remove is not a function" on every
    // call, meaning this endpoint could never actually succeed. `.deleteOne()`
    // is the Mongoose 7+ replacement and correctly pulls this subdocument
    // out of the parent `skills` array.
    skill.deleteOne();
    await user.save();

    res.json({
      success: true,
      message: 'Skill deleted successfully',
      data: user.skills
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('stats');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    if (!canActOnUser(req.user, req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this account'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
