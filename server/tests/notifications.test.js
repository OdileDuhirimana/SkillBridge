const request = require('supertest');
const { createApp } = require('../app');
const Notification = require('../models/Notification');
const { createUser } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

/**
 * Integration tests for the notification flow.
 *
 * WHY these tests exist: per the code-review audit's coverage findings,
 * notifications had effectively no dedicated test coverage (only
 * incidental coverage from `applications.test.js` exercising the
 * "notification created as a side effect of applying to a job" path).
 * These tests exercise the notification endpoints directly: listing a
 * user's own notifications, the read/unread lifecycle, and the
 * authorization boundary that prevents one user from reading or mutating
 * another user's notifications.
 */
describe('Notifications', () => {
  describe('GET /api/notifications', () => {
    it("returns only the requesting user's own notifications", async () => {
      const { user: userA } = await createUser({ role: 'student', email: 'notif-userA@example.com' });
      const { user: userB } = await createUser({ role: 'student', email: 'notif-userB@example.com' });

      await Notification.create({
        user: userA._id,
        type: 'system',
        title: 'Welcome to SkillBridge',
        message: 'Thanks for joining!'
      });
      await Notification.create({
        user: userB._id,
        type: 'system',
        title: 'Welcome to SkillBridge',
        message: 'Thanks for joining!'
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', authHeader(userA));

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].user).toBe(userA._id.toString());
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('marks a notification as read for its owner', async () => {
      const { user } = await createUser({ role: 'student', email: 'notif-read-owner@example.com' });
      const notification = await Notification.create({
        user: user._id,
        type: 'system',
        title: 'Test notification',
        message: 'This is a test.'
      });

      const res = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', authHeader(user));

      expect(res.status).toBe(200);

      const updated = await Notification.findById(notification._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it("rejects marking another user's notification as read", async () => {
      const { user: owner } = await createUser({ role: 'student', email: 'notif-read-owner2@example.com' });
      const { user: intruder } = await createUser({ role: 'student', email: 'notif-read-intruder@example.com' });
      const notification = await Notification.create({
        user: owner._id,
        type: 'system',
        title: 'Private notification',
        message: 'Only the owner should be able to act on this.'
      });

      const res = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', authHeader(intruder));

      expect(res.status).toBe(403);

      const unchanged = await Notification.findById(notification._id);
      expect(unchanged.isRead).toBe(false);
    });

    it('returns 404 for a non-existent notification', async () => {
      const { user } = await createUser({ role: 'student', email: 'notif-read-missing@example.com' });
      const fakeId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .put(`/api/notifications/${fakeId}/read`)
        .set('Authorization', authHeader(user));

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('counts only unread, active notifications for the requesting user', async () => {
      const { user } = await createUser({ role: 'student', email: 'notif-unread-count@example.com' });

      await Notification.create({ user: user._id, type: 'system', title: 'Unread 1', message: 'msg' });
      await Notification.create({ user: user._id, type: 'system', title: 'Unread 2', message: 'msg' });
      await Notification.create({ user: user._id, type: 'system', title: 'Already read', message: 'msg', isRead: true });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('POST /api/notifications', () => {
    it('allows an admin to create a notification for a user', async () => {
      const { user: admin } = await createUser({ role: 'admin', email: 'notif-admin@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'notif-target@example.com' });

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', authHeader(admin))
        .send({
          userId: target._id.toString(),
          type: 'system',
          title: 'Account update',
          message: 'Your account settings were updated.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toBe(target._id.toString());
    });

    it('rejects a non-admin attempting to create a notification', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'notif-nonadmin@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'notif-target2@example.com' });

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', authHeader(student))
        .send({
          userId: target._id.toString(),
          type: 'system',
          title: 'Account update',
          message: 'Your account settings were updated.'
        });

      expect(res.status).toBe(403);
    });

    it('rejects an invalid notification type', async () => {
      const { user: admin } = await createUser({ role: 'admin', email: 'notif-admin2@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'notif-target3@example.com' });

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', authHeader(admin))
        .send({
          userId: target._id.toString(),
          type: 'not-a-real-type',
          title: 'Account update',
          message: 'Your account settings were updated.'
        });

      expect(res.status).toBe(400);
    });
  });
});
