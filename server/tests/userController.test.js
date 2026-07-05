const request = require('supertest');
const { createApp } = require('../app');
const User = require('../models/User');
const { createUser } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

/**
 * Integration tests for userController, covering the endpoints that don't
 * require a real file-storage backend (avatar/resume upload routes go
 * through Cloudinary via multer-storage-cloudinary and are out of scope for
 * a hermetic test suite — see server/utils/upload.js).
 *
 * WHY this file exists: per the code-review audit's coverage findings,
 * `userController.js` had ~13% statement coverage — the largest gap in the
 * codebase alongside `companyController.js` — despite containing several
 * security-sensitive authorization checks (`canActOnUser`) that were
 * previously exercised only incidentally, if at all.
 */
describe('Users', () => {
  describe('GET /api/users', () => {
    it('allows an admin to list all users', async () => {
      const { user: admin } = await createUser({ role: 'admin', email: 'users-admin1@example.com' });
      await createUser({ role: 'student', email: 'users-student1@example.com' });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      // Password must never be serialized, even to an admin.
      expect(res.body.data[0].password).toBeUndefined();
    });

    it('rejects a non-admin from listing all users', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'users-student2@example.com' });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader(student));

      expect(res.status).toBe(403);
    });

    it('filters by role and search term', async () => {
      const { user: admin } = await createUser({ role: 'admin', email: 'users-admin2@example.com' });
      await createUser({ role: 'employer', email: 'findme-employer@example.com', firstName: 'Findme' });
      await createUser({ role: 'student', email: 'other-student@example.com', firstName: 'Someone' });

      const res = await request(app)
        .get('/api/users?role=employer&search=Findme')
        .set('Authorization', authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].firstName).toBe('Findme');
    });
  });

  describe('GET /api/users/:id', () => {
    it('allows any authenticated user to view a profile', async () => {
      const { user: viewer } = await createUser({ role: 'student', email: 'users-viewer@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-target@example.com' });

      const res = await request(app)
        .get(`/api/users/${target._id}`)
        .set('Authorization', authHeader(viewer));

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(target._id.toString());
    });

    it("increments profile views when viewed by someone other than the profile's owner", async () => {
      const { user: viewer } = await createUser({ role: 'student', email: 'users-viewer2@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-target2@example.com' });

      await request(app).get(`/api/users/${target._id}`).set('Authorization', authHeader(viewer));

      const updated = await User.findById(target._id);
      expect(updated.stats.profileViews).toBe(1);
    });

    it('does not increment profile views when a user views their own profile', async () => {
      const { user: self } = await createUser({ role: 'student', email: 'users-self@example.com' });

      await request(app).get(`/api/users/${self._id}`).set('Authorization', authHeader(self));

      const updated = await User.findById(self._id);
      expect(updated.stats.profileViews).toBe(0);
    });

    it('returns 404 for a non-existent user', async () => {
      const { user: viewer } = await createUser({ role: 'student', email: 'users-viewer3@example.com' });
      const fakeId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', authHeader(viewer));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('allows a user to update their own profile', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-update-self@example.com' });

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', authHeader(user))
        .send({ bio: 'Full-stack developer looking for new opportunities.' });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Full-stack developer looking for new opportunities.');
    });

    it("rejects a user updating someone else's profile", async () => {
      const { user: actor } = await createUser({ role: 'student', email: 'users-update-actor@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-update-target@example.com' });

      const res = await request(app)
        .put(`/api/users/${target._id}`)
        .set('Authorization', authHeader(actor))
        .send({ bio: 'I should not be able to set this.' });

      expect(res.status).toBe(403);
    });

    it('ignores fields not on the allowed-update list', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-update-restricted@example.com' });

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', authHeader(user))
        .send({ role: 'admin', email: 'hacked@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('student');
      expect(res.body.data.email).toBe('users-update-restricted@example.com');
    });
  });

  describe('POST /api/users/:id/skills', () => {
    it('allows a user to add a skill to their own profile', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-skill-add@example.com' });

      const res = await request(app)
        .post(`/api/users/${user._id}/skills`)
        .set('Authorization', authHeader(user))
        .send({ name: 'TypeScript', level: 'intermediate' });

      expect(res.status).toBe(200);
      expect(res.body.data.some((skill) => skill.name === 'TypeScript')).toBe(true);
      expect(res.body.xpGained).toBeGreaterThan(0);
    });

    it('rejects a duplicate skill name', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-skill-dup@example.com' });

      await request(app)
        .post(`/api/users/${user._id}/skills`)
        .set('Authorization', authHeader(user))
        .send({ name: 'React', level: 'advanced' });

      const res = await request(app)
        .post(`/api/users/${user._id}/skills`)
        .set('Authorization', authHeader(user))
        .send({ name: 'React', level: 'beginner' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid skill level', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-skill-invalid@example.com' });

      const res = await request(app)
        .post(`/api/users/${user._id}/skills`)
        .set('Authorization', authHeader(user))
        .send({ name: 'Rust', level: 'godlike' });

      expect(res.status).toBe(400);
    });

    it("rejects adding a skill to someone else's profile", async () => {
      const { user: actor } = await createUser({ role: 'student', email: 'users-skill-actor@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-skill-target@example.com' });

      const res = await request(app)
        .post(`/api/users/${target._id}/skills`)
        .set('Authorization', authHeader(actor))
        .send({ name: 'Go', level: 'beginner' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT and DELETE /api/users/:id/skills/:skillId', () => {
    it('allows updating and deleting an existing skill', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-skill-update@example.com' });

      const addRes = await request(app)
        .post(`/api/users/${user._id}/skills`)
        .set('Authorization', authHeader(user))
        .send({ name: 'Python', level: 'beginner' });
      const skillId = addRes.body.data[0]._id;

      const updateRes = await request(app)
        .put(`/api/users/${user._id}/skills/${skillId}`)
        .set('Authorization', authHeader(user))
        .send({ level: 'expert' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.level).toBe('expert');

      const deleteRes = await request(app)
        .delete(`/api/users/${user._id}/skills/${skillId}`)
        .set('Authorization', authHeader(user));

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.find((skill) => skill._id === skillId)).toBeUndefined();
    });

    it('returns 404 when updating a skill that does not exist', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-skill-missing@example.com' });
      const fakeSkillId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .put(`/api/users/${user._id}/skills/${fakeSkillId}`)
        .set('Authorization', authHeader(user))
        .send({ level: 'advanced' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/users/:id/stats', () => {
    it("returns the user's stats", async () => {
      const { user } = await createUser({ role: 'student', email: 'users-stats@example.com' });

      const res = await request(app)
        .get(`/api/users/${user._id}/stats`)
        .set('Authorization', authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('level');
      expect(res.body.data).toHaveProperty('xp');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('allows a user to delete their own account', async () => {
      const { user } = await createUser({ role: 'student', email: 'users-delete-self@example.com' });

      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', authHeader(user));

      expect(res.status).toBe(200);
      expect(await User.findById(user._id)).toBeNull();
    });

    it("rejects a user deleting someone else's account", async () => {
      const { user: actor } = await createUser({ role: 'student', email: 'users-delete-actor@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-delete-target@example.com' });

      const res = await request(app)
        .delete(`/api/users/${target._id}`)
        .set('Authorization', authHeader(actor));

      expect(res.status).toBe(403);
      expect(await User.findById(target._id)).not.toBeNull();
    });

    it('allows an admin to delete another user', async () => {
      const { user: admin } = await createUser({ role: 'admin', email: 'users-delete-admin@example.com' });
      const { user: target } = await createUser({ role: 'student', email: 'users-delete-target2@example.com' });

      const res = await request(app)
        .delete(`/api/users/${target._id}`)
        .set('Authorization', authHeader(admin));

      expect(res.status).toBe(200);
      expect(await User.findById(target._id)).toBeNull();
    });
  });
});
