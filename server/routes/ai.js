const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const natural = require('natural');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

// Initialize OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey
    })
  : null;

const ensureOpenAIConfigured = (res) => {
  if (openai) {
    return true;
  }

  res.status(503).json({
    success: false,
    message: 'AI features are currently unavailable. Configure OPENAI_API_KEY to enable this endpoint.'
  });
  return false;
};

// @desc    Analyze resume
// @route   POST /api/ai/analyze-resume
// @access  Private
router.post('/analyze-resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!ensureOpenAIConfigured(res)) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a resume file'
      });
    }

    // Parse PDF resume
    const resumeBuffer = fs.readFileSync(req.file.path);
    const resumeData = await pdfParse(resumeBuffer);
    const resumeText = resumeData.text;

    // Extract skills using NLP
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(resumeText.toLowerCase());
    
    // Common technical skills
    const technicalSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'mongodb', 'sql',
      'html', 'css', 'git', 'docker', 'aws', 'azure', 'kubernetes',
      'machine learning', 'data science', 'artificial intelligence',
      'project management', 'agile', 'scrum', 'devops', 'ci/cd'
    ];

    const foundSkills = technicalSkills.filter(skill => 
      resumeText.toLowerCase().includes(skill.toLowerCase())
    );

    // Analyze resume structure and content
    const analysis = {
      wordCount: resumeText.split(' ').length,
      skills: foundSkills,
      hasContactInfo: /email|phone|contact/i.test(resumeText),
      hasEducation: /education|university|college|degree/i.test(resumeText),
      hasExperience: /experience|work|employment|job/i.test(resumeText),
      hasSkills: /skills|technologies|tools/i.test(resumeText),
      hasProjects: /projects|portfolio|github/i.test(resumeText)
    };

    // Calculate resume score
    let score = 0;
    if (analysis.hasContactInfo) score += 10;
    if (analysis.hasEducation) score += 15;
    if (analysis.hasExperience) score += 25;
    if (analysis.hasSkills) score += 20;
    if (analysis.hasProjects) score += 15;
    if (analysis.wordCount > 200 && analysis.wordCount < 1000) score += 15;

    // Generate AI feedback using OpenAI
    const prompt = `
    Analyze this resume and provide feedback:
    
    Resume Text: ${resumeText.substring(0, 2000)}
    
    Please provide:
    1. Overall assessment (1-10)
    2. Strengths
    3. Areas for improvement
    4. Missing elements
    5. Suggestions for enhancement
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional resume reviewer. Provide constructive feedback to help improve the resume."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500
    });

    const aiFeedback = completion.choices[0].message.content;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        analysis,
        score,
        aiFeedback,
        recommendations: [
          'Include a professional summary',
          'Quantify your achievements with numbers',
          'Use action verbs to describe your experience',
          'Tailor your resume to the job you\'re applying for',
          'Include relevant keywords from the job description'
        ]
      }
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during resume analysis'
    });
  }
});

// @desc    Get job recommendations
// @route   POST /api/ai/job-recommendations
// @access  Private
router.post('/job-recommendations', protect, [
  body('skills').isArray().withMessage('Skills must be an array'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive integer'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    if (!ensureOpenAIConfigured(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { skills, experience = 0, preferences = {} } = req.body;

    // Get user profile
    const User = require('../models/User');
    const Job = require('../models/Job');
    
    const user = await User.findById(req.user.id);
    const userSkills = user.skills.map(skill => skill.name.toLowerCase());

    // Find matching jobs
    const jobs = await Job.find({ status: 'active' })
      .populate('company', 'name logo industry')
      .populate('postedBy', 'firstName lastName');

    // Calculate job match scores
    const jobMatches = jobs.map(job => {
      const jobSkills = job.skills.map(skill => skill.name.toLowerCase());
      const matchingSkills = userSkills.filter(skill => 
        jobSkills.some(jobSkill => 
          jobSkill.includes(skill) || skill.includes(jobSkill)
        )
      );

      const skillMatchScore = jobSkills.length > 0 
        ? (matchingSkills.length / jobSkills.length) * 100 
        : 0;

      const experienceMatch = job.experience.min <= experience && 
        (job.experience.max || 999) >= experience;

      const locationMatch = preferences.location ? 
        job.location.address.city?.toLowerCase().includes(preferences.location.toLowerCase()) ||
        job.location.address.country?.toLowerCase().includes(preferences.location.toLowerCase()) ||
        job.isRemote : true;

      const typeMatch = preferences.jobType ? 
        job.type === preferences.jobType : true;

      const overallScore = (skillMatchScore * 0.6) + 
        (experienceMatch ? 20 : 0) + 
        (locationMatch ? 10 : 0) + 
        (typeMatch ? 10 : 0);

      return {
        job: job,
        matchScore: Math.round(overallScore),
        skillMatch: Math.round(skillMatchScore),
        matchingSkills,
        missingSkills: jobSkills.filter(skill => 
          !matchingSkills.some(userSkill => 
            userSkill.includes(skill) || skill.includes(userSkill)
          )
        )
      };
    });

    // Sort by match score
    const sortedMatches = jobMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    // Generate AI insights
    const topSkills = userSkills.slice(0, 5);
    const prompt = `
    Based on the user's skills: ${topSkills.join(', ')} and experience: ${experience} years,
    provide career advice and job search tips.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a career advisor. Provide helpful career guidance and job search tips."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300
    });

    const careerAdvice = completion.choices[0].message.content;

    res.json({
      success: true,
      data: {
        recommendations: sortedMatches,
        careerAdvice,
        userProfile: {
          skills: userSkills,
          experience,
          preferences
        }
      }
    });
  } catch (error) {
    console.error('Job recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during job recommendations'
    });
  }
});

// @desc    Analyze application match
// @route   POST /api/ai/analyze-application
// @access  Private
router.post('/analyze-application', protect, [
  body('applicationId').isMongoId().withMessage('Valid application ID is required')
], async (req, res) => {
  try {
    if (!ensureOpenAIConfigured(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { applicationId } = req.body;

    const Application = require('../models/Application');
    const application = await Application.findById(applicationId)
      .populate('job', 'title description requirements skills experience education')
      .populate('applicant', 'skills experience education resume');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user has permission to view this analysis
    if (application.applicant.toString() !== req.user.id && req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this analysis'
      });
    }

    const job = application.job;
    const applicant = application.applicant;

    // Skill matching analysis
    const applicantSkills = applicant.skills.map(skill => skill.name.toLowerCase());
    const jobSkills = job.skills.map(skill => skill.name.toLowerCase());

    const matchingSkills = applicantSkills.filter(skill => 
      jobSkills.some(jobSkill => 
        jobSkill.includes(skill) || skill.includes(jobSkill)
      )
    );

    const skillMatchScore = jobSkills.length > 0 
      ? (matchingSkills.length / jobSkills.length) * 100 
      : 0;

    // Experience matching
    const applicantExperience = applicant.experience.length;
    const requiredExperience = job.experience.min || 0;
    const experienceMatchScore = applicantExperience >= requiredExperience ? 100 : 
      (applicantExperience / requiredExperience) * 100;

    // Education matching
    const applicantEducation = applicant.education.length;
    const educationMatchScore = applicantEducation > 0 ? 100 : 0;

    // Overall match score
    const overallScore = (skillMatchScore * 0.5) + 
      (experienceMatchScore * 0.3) + 
      (educationMatchScore * 0.2);

    // Generate AI analysis
    const prompt = `
    Analyze this job application match:
    
    Job: ${job.title}
    Job Requirements: ${job.requirements}
    Job Skills: ${jobSkills.join(', ')}
    
    Applicant Skills: ${applicantSkills.join(', ')}
    Applicant Experience: ${applicantExperience} positions
    Applicant Education: ${applicantEducation} entries
    
    Provide:
    1. Overall assessment (1-10)
    2. Strengths
    3. Areas of concern
    4. Recommendations for improvement
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a hiring manager analyzing a job application. Provide objective feedback."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400
    });

    const aiAnalysis = completion.choices[0].message.content;

    // Update application with AI analysis
    application.aiAnalysis = {
      skillMatchScore: Math.round(skillMatchScore),
      experienceMatchScore: Math.round(experienceMatchScore),
      educationMatchScore: Math.round(educationMatchScore),
      overallMatchScore: Math.round(overallScore),
      strengths: matchingSkills,
      weaknesses: jobSkills.filter(skill => 
        !matchingSkills.some(applicantSkill => 
          applicantSkill.includes(skill) || skill.includes(applicantSkill)
        )
      ),
      recommendations: [
        'Consider gaining experience in missing skills',
        'Highlight relevant projects in your portfolio',
        'Tailor your cover letter to the job requirements'
      ],
      analyzedAt: new Date()
    };

    await application.save();

    res.json({
      success: true,
      data: {
        matchScores: {
          skill: Math.round(skillMatchScore),
          experience: Math.round(experienceMatchScore),
          education: Math.round(educationMatchScore),
          overall: Math.round(overallScore)
        },
        analysis: {
          matchingSkills,
          missingSkills: jobSkills.filter(skill => 
            !matchingSkills.some(applicantSkill => 
              applicantSkill.includes(skill) || skill.includes(applicantSkill)
            )
          ),
          aiAnalysis
        },
        recommendations: application.aiAnalysis.recommendations
      }
    });
  } catch (error) {
    console.error('Application analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during application analysis'
    });
  }
});

// @desc    Generate cover letter
// @route   POST /api/ai/generate-cover-letter
// @access  Private
router.post('/generate-cover-letter', protect, [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('tone').optional().isIn(['professional', 'casual', 'enthusiastic']).withMessage('Invalid tone')
], async (req, res) => {
  try {
    if (!ensureOpenAIConfigured(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId, tone = 'professional' } = req.body;

    const Job = require('../models/Job');
    const User = require('../models/User');

    const job = await Job.findById(jobId).populate('company', 'name industry');
    const user = await User.findById(req.user.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const prompt = `
    Generate a ${tone} cover letter for this job application:
    
    Job Title: ${job.title}
    Company: ${job.company.name}
    Job Description: ${job.description.substring(0, 1000)}
    Job Requirements: ${job.requirements.substring(0, 500)}
    
    Applicant Name: ${user.firstName} ${user.lastName}
    Applicant Skills: ${user.skills.map(s => s.name).join(', ')}
    Applicant Experience: ${user.experience.length} positions
    
    Write a compelling cover letter that highlights relevant skills and experience.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional career advisor. Generate a ${tone} cover letter that is personalized and compelling.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800
    });

    const coverLetter = completion.choices[0].message.content;

    res.json({
      success: true,
      data: {
        coverLetter,
        job: {
          title: job.title,
          company: job.company.name
        }
      }
    });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during cover letter generation'
    });
  }
});

// @desc    Get career insights
// @route   GET /api/ai/career-insights
// @access  Private
router.get('/career-insights', protect, async (req, res) => {
  try {
    if (!ensureOpenAIConfigured(res)) {
      return;
    }

    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    const skills = user.skills.map(skill => skill.name);
    const experience = user.experience.length;
    const education = user.education.length;

    const prompt = `
    Provide career insights for a professional with:
    Skills: ${skills.join(', ')}
    Experience: ${experience} positions
    Education: ${education} entries
    Role: ${user.role}
    
    Provide:
    1. Career path recommendations
    2. Skills to develop
    3. Industry trends
    4. Salary expectations
    5. Growth opportunities
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a career advisor. Provide personalized career insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600
    });

    const insights = completion.choices[0].message.content;

    res.json({
      success: true,
      data: {
        insights,
        userProfile: {
          skills,
          experience,
          education,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Career insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during career insights generation'
    });
  }
});

module.exports = router;
