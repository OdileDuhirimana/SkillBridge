const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

// Sample data
const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'student',
    bio: 'Passionate software developer with 3 years of experience in full-stack development.',
    location: 'San Francisco, CA',
    skills: [
      { name: 'JavaScript', level: 'advanced' },
      { name: 'React', level: 'advanced' },
      { name: 'Node.js', level: 'intermediate' },
      { name: 'Python', level: 'intermediate' },
      { name: 'MongoDB', level: 'intermediate' }
    ],
    experience: [
      {
        title: 'Software Developer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2023-12-31'),
        current: false,
        description: 'Developed web applications using React and Node.js'
      }
    ],
    education: [
      {
        institution: 'University of California',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: new Date('2017-09-01'),
        endDate: new Date('2021-06-01'),
        current: false,
        gpa: 3.8
      }
    ],
    stats: {
      profileViews: 45,
      applicationsSent: 12,
      interviewsScheduled: 3,
      jobsLanded: 1,
      xp: 1250,
      level: 13
    }
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'employer',
    bio: 'HR Manager at InnovateTech with 5 years of experience in talent acquisition.',
    location: 'New York, NY',
    skills: [
      { name: 'Human Resources', level: 'expert' },
      { name: 'Talent Acquisition', level: 'expert' },
      { name: 'Recruitment', level: 'advanced' },
      { name: 'Team Management', level: 'advanced' }
    ],
    stats: {
      profileViews: 23,
      applicationsSent: 0,
      interviewsScheduled: 0,
      jobsLanded: 0,
      xp: 800,
      level: 8
    }
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    password: 'password123',
    role: 'student',
    bio: 'Recent computer science graduate looking for entry-level software development opportunities.',
    location: 'Austin, TX',
    skills: [
      { name: 'Java', level: 'intermediate' },
      { name: 'Python', level: 'intermediate' },
      { name: 'SQL', level: 'intermediate' },
      { name: 'Git', level: 'beginner' }
    ],
    education: [
      {
        institution: 'University of Texas',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: new Date('2019-09-01'),
        endDate: new Date('2023-05-01'),
        current: false,
        gpa: 3.6
      }
    ],
    stats: {
      profileViews: 18,
      applicationsSent: 8,
      interviewsScheduled: 1,
      jobsLanded: 0,
      xp: 450,
      level: 5
    }
  }
];

const sampleCompanies = [
  {
    name: 'InnovateTech',
    description: 'Leading technology company focused on innovative solutions for modern businesses. We are committed to creating cutting-edge software that transforms industries.',
    industry: 'Technology',
    size: '201-500',
    founded: 2015,
    headquarters: {
      address: '123 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      zipCode: '94105'
    },
    benefits: [
      { name: 'Health Insurance', category: 'health' },
      { name: '401k Matching', category: 'financial' },
      { name: 'Flexible Work Hours', category: 'work-life' },
      { name: 'Professional Development', category: 'professional' }
    ],
    culture: {
      values: ['Innovation', 'Collaboration', 'Excellence', 'Integrity'],
      mission: 'To revolutionize technology and empower businesses worldwide',
      vision: 'A world where technology seamlessly integrates with human potential'
    },
    stats: {
      totalJobs: 15,
      activeJobs: 8,
      totalApplications: 245,
      profileViews: 156,
      followers: 89
    }
  },
  {
    name: 'DataFlow Solutions',
    description: 'Specialized in data analytics and business intelligence solutions. We help companies make data-driven decisions through advanced analytics.',
    industry: 'Data Analytics',
    size: '51-200',
    founded: 2018,
    headquarters: {
      address: '456 Data Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10001'
    },
    benefits: [
      { name: 'Health Insurance', category: 'health' },
      { name: 'Stock Options', category: 'financial' },
      { name: 'Remote Work', category: 'work-life' },
      { name: 'Learning Budget', category: 'professional' }
    ],
    culture: {
      values: ['Data-Driven', 'Innovation', 'Collaboration', 'Growth'],
      mission: 'To unlock the power of data for better business outcomes',
      vision: 'Every business empowered by intelligent data insights'
    },
    stats: {
      totalJobs: 12,
      activeJobs: 6,
      totalApplications: 189,
      profileViews: 134,
      followers: 67
    }
  }
];

const sampleJobs = [
  {
    title: 'Senior Full Stack Developer',
    description: 'We are looking for an experienced full-stack developer to join our growing team. You will be responsible for developing and maintaining web applications using modern technologies.',
    requirements: '5+ years of experience in full-stack development, proficiency in JavaScript, React, Node.js, and databases.',
    responsibilities: 'Develop and maintain web applications, collaborate with cross-functional teams, write clean and maintainable code.',
    category: 'Technology',
    type: 'full-time',
    level: 'senior',
    location: {
      type: 'hybrid',
      address: {
        street: '123 Innovation Drive',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zipCode: '94105'
      }
    },
    salary: {
      min: 120000,
      max: 160000,
      currency: 'USD',
      period: 'yearly'
    },
    skills: [
      { name: 'JavaScript', level: 'required', years: 5 },
      { name: 'React', level: 'required', years: 3 },
      { name: 'Node.js', level: 'required', years: 3 },
      { name: 'MongoDB', level: 'preferred', years: 2 },
      { name: 'AWS', level: 'nice-to-have', years: 1 }
    ],
    experience: {
      min: 5,
      max: 10
    },
    education: {
      required: 'bachelor',
      preferred: 'master'
    },
    benefits: [
      { name: 'Health Insurance', category: 'health' },
      { name: '401k Matching', category: 'financial' },
      { name: 'Flexible Hours', category: 'work-life' }
    ],
    tags: ['javascript', 'react', 'nodejs', 'fullstack', 'senior'],
    isRemote: true,
    isFeatured: true,
    stats: {
      views: 89,
      applications: 23,
      saves: 12,
      shares: 5
    }
  },
  {
    title: 'Data Scientist',
    description: 'Join our data science team to build machine learning models and analyze large datasets. You will work on exciting projects that impact millions of users.',
    requirements: 'PhD or Master\'s in Data Science, Computer Science, or related field. 3+ years of experience in machine learning and data analysis.',
    responsibilities: 'Develop machine learning models, analyze large datasets, collaborate with product teams, present findings to stakeholders.',
    category: 'Data Science',
    type: 'full-time',
    level: 'mid',
    location: {
      type: 'on-site',
      address: {
        street: '456 Data Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001'
      }
    },
    salary: {
      min: 100000,
      max: 140000,
      currency: 'USD',
      period: 'yearly'
    },
    skills: [
      { name: 'Python', level: 'required', years: 3 },
      { name: 'Machine Learning', level: 'required', years: 3 },
      { name: 'SQL', level: 'required', years: 2 },
      { name: 'TensorFlow', level: 'preferred', years: 2 },
      { name: 'PyTorch', level: 'preferred', years: 1 }
    ],
    experience: {
      min: 3,
      max: 7
    },
    education: {
      required: 'master',
      preferred: 'phd'
    },
    benefits: [
      { name: 'Health Insurance', category: 'health' },
      { name: 'Stock Options', category: 'financial' },
      { name: 'Learning Budget', category: 'professional' }
    ],
    tags: ['python', 'machine-learning', 'data-science', 'ai'],
    isRemote: false,
    isFeatured: false,
    stats: {
      views: 67,
      applications: 18,
      saves: 8,
      shares: 3
    }
  },
  {
    title: 'Frontend Developer Intern',
    description: 'Great opportunity for a frontend developer intern to work on real projects and learn from experienced developers.',
    requirements: 'Currently enrolled in Computer Science or related field, basic knowledge of HTML, CSS, and JavaScript.',
    responsibilities: 'Assist in developing user interfaces, learn modern frontend frameworks, participate in code reviews.',
    category: 'Technology',
    type: 'internship',
    level: 'entry',
    location: {
      type: 'remote'
    },
    salary: {
      min: 20,
      max: 25,
      currency: 'USD',
      period: 'hourly'
    },
    skills: [
      { name: 'HTML', level: 'required', years: 1 },
      { name: 'CSS', level: 'required', years: 1 },
      { name: 'JavaScript', level: 'required', years: 1 },
      { name: 'React', level: 'preferred', years: 0 }
    ],
    experience: {
      min: 0,
      max: 2
    },
    education: {
      required: 'bachelor',
      preferred: 'none'
    },
    benefits: [
      { name: 'Mentorship', category: 'professional' },
      { name: 'Flexible Schedule', category: 'work-life' }
    ],
    tags: ['internship', 'frontend', 'javascript', 'react', 'entry-level'],
    isRemote: true,
    isFeatured: false,
    stats: {
      views: 45,
      applications: 12,
      saves: 6,
      shares: 2
    }
  }
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbridge');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    await User.deleteMany({});
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
    }
    
    console.log('✅ Users seeded successfully');
    return await User.find({});
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

const seedCompanies = async (users) => {
  try {
    await Company.deleteMany({});
    
    const employers = users.filter(user => user.role === 'employer');
    
    for (let i = 0; i < sampleCompanies.length; i++) {
      const companyData = {
        ...sampleCompanies[i],
        owner: employers[i % employers.length]._id
      };
      
      const company = new Company(companyData);
      await company.save();
    }
    
    console.log('✅ Companies seeded successfully');
    return await Company.find({});
  } catch (error) {
    console.error('❌ Error seeding companies:', error);
    throw error;
  }
};

const seedJobs = async (companies) => {
  try {
    await Job.deleteMany({});
    
    const users = await User.find({ role: 'employer' });
    
    for (let i = 0; i < sampleJobs.length; i++) {
      const jobData = {
        ...sampleJobs[i],
        company: companies[i % companies.length]._id,
        postedBy: users[i % users.length]._id
      };
      
      const job = new Job(jobData);
      await job.save();
    }
    
    console.log('✅ Jobs seeded successfully');
    return await Job.find({});
  } catch (error) {
    console.error('❌ Error seeding jobs:', error);
    throw error;
  }
};

const seedApplications = async (users, jobs) => {
  try {
    await Application.deleteMany({});
    
    const students = users.filter(user => user.role === 'student');
    
    for (let i = 0; i < Math.min(students.length * 2, jobs.length * 3); i++) {
      const student = students[i % students.length];
      const job = jobs[i % jobs.length];
      const company = await Company.findById(job.company);
      
      const applicationData = {
        job: job._id,
        applicant: student._id,
        company: job.company,
        status: ['applied', 'under-review', 'shortlisted', 'interview-scheduled'][Math.floor(Math.random() * 4)],
        coverLetter: `I am very interested in the ${job.title} position at ${company.name}. I believe my skills and experience make me a great fit for this role.`,
        timeline: [
          {
            status: 'applied',
            message: 'Application submitted',
            changedBy: student._id,
            changedAt: new Date()
          }
        ]
      };
      
      const application = new Application(applicationData);
      await application.save();
    }
    
    console.log('✅ Applications seeded successfully');
    return await Application.find({});
  } catch (error) {
    console.error('❌ Error seeding applications:', error);
    throw error;
  }
};

const seedChats = async (users, applications) => {
  try {
    await Chat.deleteMany({});
    
    for (let i = 0; i < Math.min(applications.length, 5); i++) {
      const application = applications[i];
      const job = await Job.findById(application.job);
      const company = await Company.findById(application.company);
      
      const chatData = {
        participants: [
          {
            user: application.applicant,
            role: 'applicant'
          },
          {
            user: company.owner,
            role: 'recruiter'
          }
        ],
        type: 'application',
        application: application._id,
        job: application.job,
        company: application.company,
        title: `Chat for ${job.title}`,
        messages: [
          {
            sender: application.applicant,
            content: 'Hello! I am very interested in this position and would love to learn more about the role.',
            type: 'text'
          },
          {
            sender: company.owner,
            content: 'Thank you for your interest! We will review your application and get back to you soon.',
            type: 'text'
          }
        ],
        metadata: {
          totalMessages: 2,
          unreadCount: 0
        }
      };
      
      const chat = new Chat(chatData);
      await chat.save();
    }
    
    console.log('✅ Chats seeded successfully');
    return await Chat.find({});
  } catch (error) {
    console.error('❌ Error seeding chats:', error);
    throw error;
  }
};

const seedNotifications = async (users) => {
  try {
    await Notification.deleteMany({});
    
    const students = users.filter(user => user.role === 'student');
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      const notifications = [
        {
          user: student._id,
          type: 'job_match',
          title: 'New Job Match!',
          message: 'We found a job that matches your profile: Senior Full Stack Developer',
          priority: 'medium',
          data: {
            jobId: '507f1f77bcf86cd799439011',
            companyId: '507f1f77bcf86cd799439012'
          }
        },
        {
          user: student._id,
          type: 'badge_earned',
          title: 'Badge Earned!',
          message: 'Congratulations! You earned the "First Application" badge',
          priority: 'low',
          data: {
            badgeName: 'First Application',
            badgeIcon: '🎯'
          }
        }
      ];
      
      for (const notificationData of notifications) {
        const notification = new Notification(notificationData);
        await notification.save();
      }
    }
    
    console.log('✅ Notifications seeded successfully');
    return await Notification.find({});
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    const companies = await seedCompanies(users);
    const jobs = await seedJobs(companies);
    const applications = await seedApplications(users, jobs);
    const chats = await seedChats(users, applications);
    const notifications = await seedNotifications(users);
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded ${users.length} users, ${companies.length} companies, ${jobs.length} jobs, ${applications.length} applications, ${chats.length} chats, ${notifications.length} notifications`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
