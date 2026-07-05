const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');

const VALID_PASSWORD = 'Password123!';

/**
 * Creates a persisted User document with sane defaults, allowing overrides.
 * Returns both the document and the plain-text password used (since the
 * hashed value on the document is useless for logging in during tests).
 */
const createUser = async (overrides = {}) => {
  const password = overrides.password || VALID_PASSWORD;
  const user = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password,
    role: 'student',
    ...overrides,
    password // ensure override doesn't accidentally get double-applied oddly
  });
  return { user, password };
};

const createCompanyForOwner = async (ownerId, overrides = {}) => {
  return Company.create({
    name: `Test Company ${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: 'A company used for testing purposes.',
    industry: 'Technology',
    size: '11-50',
    owner: ownerId,
    ...overrides
  });
};

const createJobForCompany = async (companyId, postedById, overrides = {}) => {
  // Job.slug is derived from title and has a unique index, so a fixed
  // default title across many tests in the same in-memory database would
  // collide. Suffixing with a random token keeps the default collision-free
  // while still being overridable by tests that need a specific title.
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  return Job.create({
    title: `Software Engineer ${uniqueSuffix}`,
    description: 'Build great software.',
    requirements: '3+ years of experience.',
    responsibilities: 'Write code, review PRs.',
    company: companyId,
    category: 'Technology',
    type: 'full-time',
    level: 'mid',
    location: { type: 'remote' },
    status: 'active',
    postedBy: postedById,
    ...overrides
  });
};

module.exports = {
  VALID_PASSWORD,
  createUser,
  createCompanyForOwner,
  createJobForCompany
};
