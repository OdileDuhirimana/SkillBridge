const express = require('express');
const User = require('../models/User');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user analytics
// @route   GET /api/analytics/user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user stats
    const user = await User.findById(userId).select('stats');
    
    // Get applications data
    const applications = await Application.find({
      applicant: userId,
      createdAt: { $gte: startDate }
    }).populate('job', 'title category type level company')
      .populate('company', 'name industry');

    // Application status distribution
    const statusDistribution = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Applications by category
    const categoryDistribution = applications.reduce((acc, app) => {
      const category = app.job.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Applications by job type
    const typeDistribution = applications.reduce((acc, app) => {
      const type = app.job.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Applications by company industry
    const industryDistribution = applications.reduce((acc, app) => {
      const industry = app.company.industry;
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {});

    // Monthly applications trend
    const monthlyTrend = applications.reduce((acc, app) => {
      const month = app.createdAt.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Response time analysis
    const responseTimes = applications
      .filter(app => app.timeline.length > 1)
      .map(app => {
        const firstUpdate = app.timeline[1];
        return {
          applicationId: app._id,
          responseTime: firstUpdate.changedAt - app.createdAt,
          status: app.status
        };
      });

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, rt) => sum + rt.responseTime, 0) / responseTimes.length
      : 0;

    // Skills analysis
    const userSkills = user.skills.map(skill => skill.name);
    const jobSkills = applications.flatMap(app => 
      app.job.skills.map(skill => skill.name)
    );

    const skillFrequency = jobSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {});

    const topSkills = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    res.json({
      success: true,
      data: {
        period,
        userStats: user.stats,
        applications: {
          total: applications.length,
          statusDistribution,
          categoryDistribution,
          typeDistribution,
          industryDistribution,
          monthlyTrend,
          avgResponseTime: Math.round(avgResponseTime / (1000 * 60 * 60 * 24)) // days
        },
        skills: {
          userSkills,
          topSkills,
          skillFrequency
        },
        insights: {
          mostAppliedCategory: Object.keys(categoryDistribution).reduce((a, b) => 
            categoryDistribution[a] > categoryDistribution[b] ? a : b, ''),
          mostAppliedType: Object.keys(typeDistribution).reduce((a, b) => 
            typeDistribution[a] > typeDistribution[b] ? a : b, ''),
          successRate: statusDistribution['offer-accepted'] / applications.length * 100 || 0
        }
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get company analytics
// @route   GET /api/analytics/company
// @access  Private/Employer
router.get('/company', protect, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { companyId, period = '30d' } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get company data
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get jobs data
    const jobs = await Job.find({
      company: companyId,
      createdAt: { $gte: startDate }
    }).populate('postedBy', 'firstName lastName');

    // Get applications data
    const applications = await Application.find({
      company: companyId,
      createdAt: { $gte: startDate }
    }).populate('applicant', 'firstName lastName skills')
      .populate('job', 'title category type level');

    // Job performance metrics
    const jobMetrics = jobs.map(job => ({
      jobId: job._id,
      title: job.title,
      views: job.stats.views,
      applications: job.stats.applications,
      conversionRate: job.stats.views > 0 ? (job.stats.applications / job.stats.views) * 100 : 0,
      createdAt: job.createdAt
    }));

    // Application status distribution
    const statusDistribution = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Applications by job category
    const categoryDistribution = applications.reduce((acc, app) => {
      const category = app.job.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Applications by job level
    const levelDistribution = applications.reduce((acc, app) => {
      const level = app.job.level;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // Monthly trends
    const monthlyApplications = applications.reduce((acc, app) => {
      const month = app.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const monthlyJobs = jobs.reduce((acc, job) => {
      const month = job.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Top performing jobs
    const topJobs = jobMetrics
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 10);

    // Skills analysis
    const allSkills = applications.flatMap(app => 
      app.applicant.skills.map(skill => skill.name)
    );

    const skillFrequency = allSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {});

    const topSkills = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));

    // Conversion funnel
    const funnel = {
      views: jobs.reduce((sum, job) => sum + job.stats.views, 0),
      applications: applications.length,
      interviews: statusDistribution['interview-scheduled'] || 0,
      offers: statusDistribution['offer-extended'] || 0,
      hires: statusDistribution['offer-accepted'] || 0
    };

    res.json({
      success: true,
      data: {
        period,
        company: {
          name: company.name,
          industry: company.industry,
          size: company.size,
          stats: company.stats
        },
        jobs: {
          total: jobs.length,
          metrics: jobMetrics,
          topJobs,
          categoryDistribution,
          levelDistribution
        },
        applications: {
          total: applications.length,
          statusDistribution,
          monthlyTrend: monthlyApplications
        },
        trends: {
          monthlyJobs,
          monthlyApplications
        },
        skills: {
          topSkills,
          skillFrequency
        },
        funnel,
        insights: {
          avgApplicationsPerJob: jobs.length > 0 ? applications.length / jobs.length : 0,
          conversionRate: funnel.views > 0 ? (funnel.applications / funnel.views) * 100 : 0,
          hireRate: applications.length > 0 ? (funnel.hires / applications.length) * 100 : 0,
          mostPopularCategory: Object.keys(categoryDistribution).reduce((a, b) => 
            categoryDistribution[a] > categoryDistribution[b] ? a : b, ''),
          mostPopularLevel: Object.keys(levelDistribution).reduce((a, b) => 
            levelDistribution[a] > levelDistribution[b] ? a : b, '')
        }
      }
    });
  } catch (error) {
    console.error('Get company analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get platform analytics
// @route   GET /api/analytics/platform
// @access  Private/Admin
router.get('/platform', protect, authorize('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get platform stats
    const totalUsers = await User.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    // Recent activity
    const recentUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const recentCompanies = await Company.countDocuments({ createdAt: { $gte: startDate } });
    const recentJobs = await Job.countDocuments({ createdAt: { $gte: startDate } });
    const recentApplications = await Application.countDocuments({ createdAt: { $gte: startDate } });

    // User distribution by role
    const userDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Job distribution by category
    const jobDistribution = await Job.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Company distribution by industry
    const companyDistribution = await Company.aggregate([
      { $group: { _id: '$industry', count: { $sum: 1 } } }
    ]);

    // Application status distribution
    const applicationStatusDistribution = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly trends
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, 
        count: { $sum: 1 } 
      } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyJobs = await Job.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, 
        count: { $sum: 1 } 
      } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyApplications = await Application.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, 
        count: { $sum: 1 } 
      } },
      { $sort: { _id: 1 } }
    ]);

    // Top companies by applications
    const topCompanies = await Application.aggregate([
      { $group: { _id: '$company', applicationCount: { $sum: 1 } } },
      { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
      { $unwind: '$company' },
      { $project: { 
        companyName: '$company.name', 
        applicationCount: 1 
      } },
      { $sort: { applicationCount: -1 } },
      { $limit: 10 }
    ]);

    // Top job categories
    const topJobCategories = await Job.aggregate([
      { $group: { _id: '$category', jobCount: { $sum: 1 } } },
      { $sort: { jobCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        overview: {
          totalUsers,
          totalCompanies,
          totalJobs,
          totalApplications,
          recentUsers,
          recentCompanies,
          recentJobs,
          recentApplications
        },
        distributions: {
          users: userDistribution,
          jobs: jobDistribution,
          companies: companyDistribution,
          applicationStatus: applicationStatusDistribution
        },
        trends: {
          monthlyUsers,
          monthlyJobs,
          monthlyApplications
        },
        topPerformers: {
          companies: topCompanies,
          jobCategories: topJobCategories
        },
        insights: {
          avgApplicationsPerJob: totalJobs > 0 ? totalApplications / totalJobs : 0,
          avgJobsPerCompany: totalCompanies > 0 ? totalJobs / totalCompanies : 0,
          userGrowthRate: recentUsers / totalUsers * 100,
          jobGrowthRate: recentJobs / totalJobs * 100
        }
      }
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
