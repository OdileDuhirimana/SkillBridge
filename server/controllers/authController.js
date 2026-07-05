const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const logger = require('../utils/logger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role = 'student' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role
    });

    // Generate email verification token and persist it. This save() call is
    // exactly the scenario the password-double-hashing bug (fixed in
    // User.js's pre('save') hook) used to corrupt: without the `return`
    // before the early-exit `next()`, this second save() would silently
    // re-hash the already-hashed password from User.create() above.
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = verificationToken;
    await user.save();

    // Send verification email. Email delivery failures must not fail
    // registration itself — the account is already created and usable via
    // the JWT issued below, so we log and continue rather than surfacing a
    // 500 to a user whose registration actually succeeded. This is
    // deliberately NOT awaited: sendEmail() makes a real network call to
    // an external SMTP server (see server/utils/sendEmail.js), and with no
    // real EMAIL_* credentials configured (or even with real ones, under
    // slow/unreliable network conditions) that call's latency is
    // unbounded and observed in practice to range from ~1s to 20s+ for
    // the same bad-credentials failure. Awaiting it here means the
    // register HTTP response — and therefore the client's login/register
    // redirect to /dashboard — is held hostage by that external call's
    // latency even though its outcome has zero bearing on whether
    // registration succeeded. Firing it and handling the rejection
    // out-of-band keeps the response fast and deterministic while
    // preserving the existing log-and-continue behavior on failure.
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    sendEmail({
      email: user.email,
      subject: 'Verify your SkillBridge account',
      template: 'emailVerification',
      data: {
        firstName: user.firstName,
        verificationUrl
      }
    }).catch((emailError) => {
      logger.error('Registration email send failed', { error: emailError.message, stack: emailError.stack });
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        phone: user.phone,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        skills: user.skills,
        experience: user.experience,
        education: user.education,
        resume: user.resume,
        portfolio: user.portfolio,
        preferences: user.preferences,
        stats: user.stats,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Not awaited — see the identical rationale on the register() email
    // send above: this is a real external SMTP call with unbounded
    // latency, and the outcome of sending the notification email has no
    // bearing on whether the password-reset token itself was issued.
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    sendEmail({
      email: user.email,
      subject: 'Reset your SkillBridge password',
      template: 'passwordReset',
      data: {
        firstName: user.firstName,
        resetUrl
      }
    }).catch((emailError) => {
      logger.error('Forgot-password email send failed', { error: emailError.message, stack: emailError.stack });
    });

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // Stateless JWT auth: there is no server-side session to destroy. A
    // token-blacklist (e.g. short-lived tokens + a revocation store) would
    // be required for true server-side logout; out of scope for this pass.
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updatePassword,
  logout
};
