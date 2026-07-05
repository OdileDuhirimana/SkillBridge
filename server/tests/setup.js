const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Test-only environment variables. Set before any application module is
// required so that modules reading process.env at import time (e.g. JWT
// signing in User.js) see valid values.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.NODE_ENV = 'test';

let mongoServer;

// Registration and password-reset flows call sendEmail() via nodemailer,
// which requires real SMTP credentials. Mocking it here keeps the test
// suite hermetic (no network calls, no dependency on env secrets) while
// still letting us assert that it was called with the right arguments.
jest.mock('../utils/sendEmail', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  sendBulkEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

// Firebase is never configured in the test environment (no service account
// credentials), so pushNotifications.js would otherwise log a "disabled"
// warning on every test file import. Mocking it keeps test output focused
// on real signal; the module's graceful-degradation behavior itself is not
// under test here.
jest.mock('../utils/pushNotifications', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined)
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Reset all collections between tests so each test starts from a clean
  // database without needing to manually delete documents it created.
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
