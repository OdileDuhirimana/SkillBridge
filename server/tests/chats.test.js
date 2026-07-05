const request = require('supertest');
const { createApp } = require('../app');
const { createUser, createCompanyForOwner, createJobForCompany } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

/**
 * Integration tests for the chat flow.
 *
 * WHY these tests exist: the code-review audit flagged chat/notification
 * flows as having near-zero test coverage compared to auth/jobs/
 * applications, and separately identified a real bug in this exact
 * feature — `Chat.lastMessage` referenced a Mongoose model ('Message')
 * that was never registered, because chat messages are embedded
 * subdocuments rather than a separate collection. `.populate('lastMessage')`
 * against that ref would throw `MissingSchemaError` at query time. That
 * `ref` has been removed (see server/models/Chat.js) in favor of a
 * `lastMessagePreview` virtual that resolves the id against the chat's own
 * embedded `messages` array. The "sends a message and the chat's preview
 * reflects it" test below is a regression test for that fix — it would
 * have failed outright (500 error) against the old, broken `ref`.
 */
describe('Chats', () => {
  describe('POST /api/chats', () => {
    it('creates a direct chat between two participants', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student1@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer1@example.com' });

      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.participants).toHaveLength(2);
    });

    it('rejects an unauthenticated request', async () => {
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer2@example.com' });

      const res = await request(app)
        .post('/api/chats')
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });

      expect(res.status).toBe(401);
    });

    it('rejects a chat referencing a non-existent participant', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student2@example.com' });
      const fakeUserId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: fakeUserId, role: 'recruiter' }]
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/chats/:id/messages', () => {
    it('sends a message and the chat preview reflects it (regression: lastMessage ref)', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student3@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer3@example.com' });

      const createRes = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });
      const chatId = createRes.body.data._id;

      const messageRes = await request(app)
        .post(`/api/chats/${chatId}/messages`)
        .set('Authorization', authHeader(student))
        .send({ content: 'Hello, is this role still open?' });

      expect(messageRes.status).toBe(201);
      expect(messageRes.body.data.content).toBe('Hello, is this role still open?');

      // Fetching the chat list must not throw despite the chat now having a
      // `lastMessage` id set — this is exactly the code path that would
      // have raised `MissingSchemaError` under the old `ref: 'Message'`.
      const listRes = await request(app)
        .get('/api/chats')
        .set('Authorization', authHeader(student));

      expect(listRes.status).toBe(200);
      const chat = listRes.body.data.find((c) => c._id === chatId);
      expect(chat).toBeDefined();
      expect(chat.lastMessagePreview.content).toBe('Hello, is this role still open?');
    });

    it('rejects a message from a non-participant', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student4@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer4@example.com' });
      const { user: outsider } = await createUser({ role: 'student', email: 'chat-outsider4@example.com' });

      const createRes = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });
      const chatId = createRes.body.data._id;

      const res = await request(app)
        .post(`/api/chats/${chatId}/messages`)
        .set('Authorization', authHeader(outsider))
        .send({ content: 'I should not be able to send this.' });

      expect(res.status).toBe(403);
    });

    it('rejects an empty message body', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student5@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer5@example.com' });

      const createRes = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });
      const chatId = createRes.body.data._id;

      const res = await request(app)
        .post(`/api/chats/${chatId}/messages`)
        .set('Authorization', authHeader(student))
        .send({ content: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chats/:id', () => {
    it('allows a participant to view the chat with populated messages', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student6@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer6@example.com' });

      const createRes = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });
      const chatId = createRes.body.data._id;

      await request(app)
        .post(`/api/chats/${chatId}/messages`)
        .set('Authorization', authHeader(student))
        .send({ content: 'First message' });

      const res = await request(app)
        .get(`/api/chats/${chatId}`)
        .set('Authorization', authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0].sender._id).toBe(student._id.toString());
    });

    it('rejects a non-participant from viewing the chat', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'chat-student7@example.com' });
      const { user: employer } = await createUser({ role: 'employer', email: 'chat-employer7@example.com' });
      const { user: outsider } = await createUser({ role: 'student', email: 'chat-outsider7@example.com' });

      const createRes = await request(app)
        .post('/api/chats')
        .set('Authorization', authHeader(student))
        .send({
          type: 'direct',
          participants: [{ user: employer._id.toString(), role: 'recruiter' }]
        });
      const chatId = createRes.body.data._id;

      const res = await request(app)
        .get(`/api/chats/${chatId}`)
        .set('Authorization', authHeader(outsider));

      expect(res.status).toBe(403);
    });
  });
});
