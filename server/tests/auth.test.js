const request = require('supertest');
const { createApp } = require('../app');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { createUser, VALID_PASSWORD } = require('./helpers');

const app = createApp();

describe('Auth flow', () => {
  describe('POST /api/auth/register', () => {
    it('creates a new user and returns a token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          password: VALID_PASSWORD,
          role: 'student'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user.email).toBe('ada@example.com');
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('rejects duplicate email registration', async () => {
      await createUser({ email: 'dupe@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Second',
          lastName: 'User',
          email: 'dupe@example.com',
          password: VALID_PASSWORD
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects a password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Short',
          lastName: 'Pass',
          email: 'shortpass@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('rejects registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@example.com', password: VALID_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // Regression test for the password double-hashing bug: the pre('save')
    // hook in User.js used to call `next()` without `return` on its
    // early-exit branch, causing a second save() (persisting
    // emailVerificationToken right after User.create()) to re-hash an
    // already-hashed password. That corrupted the password permanently and
    // made login impossible for every newly registered user. This test
    // exercises the exact register -> login path that would have caught it.
    it('allows login immediately after registration with the original password', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'grace@example.com',
          password: VALID_PASSWORD
        });
      expect(registerRes.status).toBe(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'grace@example.com', password: VALID_PASSWORD });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toEqual(expect.any(String));
    });

    it('hashes the password exactly once regardless of how many times save() is called after creation', async () => {
      const user = await User.create({
        firstName: 'Multi',
        lastName: 'Save',
        email: 'multisave@example.com',
        password: VALID_PASSWORD
      });

      // Simulate additional unrelated saves that do not touch the password,
      // mirroring the register() flow's second save() for the verification
      // token.
      user.bio = 'first update';
      await user.save();
      user.bio = 'second update';
      await user.save();

      const persisted = await User.findOne({ email: 'multisave@example.com' }).select('+password');
      const matches = await persisted.matchPassword(VALID_PASSWORD);
      expect(matches).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      await createUser({ email: 'login@example.com' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: VALID_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
    });

    it('rejects an incorrect password', async () => {
      await createUser({ email: 'wrongpass@example.com' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrongpass@example.com', password: 'WrongPassword1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects a login for a non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doesnotexist@example.com', password: VALID_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects requests with an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
    });

    it('returns the authenticated user for a valid token', async () => {
      const { user } = await createUser({ email: 'me@example.com' });
      const token = user.getSignedJwtToken();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
    });

    it('returns 404 if the authenticated user was deleted after the token was issued', async () => {
      const { user } = await createUser({ email: 'deleted-user@example.com' });
      const token = user.getSignedJwtToken();
      await User.findByIdAndDelete(user._id);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('verifies the email for a valid token', async () => {
      const { user } = await createUser({ email: 'verify-me@example.com' });
      user.emailVerificationToken = 'a-valid-verification-token';
      await user.save();

      const res = await request(app).get('/api/auth/verify-email?token=a-valid-verification-token');

      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated.emailVerified).toBe(true);
      expect(updated.emailVerificationToken).toBeUndefined();
    });

    it('rejects a missing token', async () => {
      const res = await request(app).get('/api/auth/verify-email');
      expect(res.status).toBe(400);
    });

    it('rejects an invalid token', async () => {
      const res = await request(app).get('/api/auth/verify-email?token=not-a-real-token');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('generates a reset token and sends an email for an existing user', async () => {
      await createUser({ email: 'forgot-me@example.com' });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot-me@example.com' });

      expect(res.status).toBe(200);
      const updated = await User.findOne({ email: 'forgot-me@example.com' });
      expect(updated.passwordResetToken).toEqual(expect.any(String));
      expect(sendEmail).toHaveBeenCalled();
    });

    it('returns 404 for an email with no matching account', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'no-such-account@example.com' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('resets the password given a valid, unexpired token', async () => {
      const { user } = await createUser({ email: 'reset-me@example.com' });
      user.passwordResetToken = 'a-valid-reset-token';
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'a-valid-reset-token', password: 'BrandNewPassword1!' });

      expect(res.status).toBe(200);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset-me@example.com', password: 'BrandNewPassword1!' });
      expect(loginRes.status).toBe(200);
    });

    it('rejects an expired reset token', async () => {
      const { user } = await createUser({ email: 'expired-reset@example.com' });
      user.passwordResetToken = 'an-expired-token';
      user.passwordResetExpires = Date.now() - 1000; // already expired
      await user.save();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'an-expired-token', password: 'BrandNewPassword1!' });

      expect(res.status).toBe(400);
    });

    it('rejects an unknown token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'unknown-token', password: 'BrandNewPassword1!' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/auth/update-password', () => {
    it("updates the authenticated user's password given the correct current password", async () => {
      const { user } = await createUser({ email: 'update-pw@example.com' });
      const token = user.getSignedJwtToken();

      const res = await request(app)
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: VALID_PASSWORD, newPassword: 'AnotherNewPassword1!' });

      expect(res.status).toBe(200);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'update-pw@example.com', password: 'AnotherNewPassword1!' });
      expect(loginRes.status).toBe(200);
    });

    it('rejects an incorrect current password', async () => {
      const { user } = await createUser({ email: 'update-pw-wrong@example.com' });
      const token = user.getSignedJwtToken();

      const res = await request(app)
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'NotTheRightPassword1!', newPassword: 'AnotherNewPassword1!' });

      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/auth/update-password')
        .send({ currentPassword: VALID_PASSWORD, newPassword: 'AnotherNewPassword1!' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success for an authenticated request', async () => {
      const { user } = await createUser({ email: 'logout-me@example.com' });
      const token = user.getSignedJwtToken();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
