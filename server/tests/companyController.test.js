const request = require('supertest');
const { createApp } = require('../app');
const Company = require('../models/Company');
const { createUser, createCompanyForOwner } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

/**
 * Integration tests for companyController, covering the endpoints that
 * don't require a real file-storage backend (logo upload goes through
 * Cloudinary via multer-storage-cloudinary and is out of scope for a
 * hermetic test suite — see server/utils/upload.js).
 *
 * WHY this file exists: per the code-review audit's coverage findings,
 * `companyController.js` had ~13% statement coverage — tied with
 * `userController.js` as the largest gap in the codebase — despite being
 * where the security-sensitive `canManageCompany`/`isCompanyOwner` checks
 * are actually invoked in a full HTTP request cycle (as opposed to the
 * pure-function unit tests in authorization.test.js, which never exercise
 * the surrounding route/controller wiring).
 */
describe('Companies', () => {
  describe('GET /api/companies', () => {
    it('lists active companies with pagination metadata', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-owner1@example.com' });
      await createCompanyForOwner(owner._id, { name: 'Acme Robotics' });

      const res = await request(app).get('/api/companies');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toEqual(
        expect.objectContaining({ current: 1, total: expect.any(Number), pages: expect.any(Number) })
      );
    });

    it('filters by industry and search term', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-owner2@example.com' });
      await createCompanyForOwner(owner._id, { name: 'Findme Robotics', industry: 'Robotics' });
      await createCompanyForOwner(owner._id, { name: 'Other Co', industry: 'Finance' });

      const res = await request(app).get('/api/companies?industry=Robotics&search=Findme');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Findme Robotics');
    });

    it('does not error on a regex-metacharacter search input (ReDoS/injection guard)', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-owner3@example.com' });
      await createCompanyForOwner(owner._id, { name: 'Safe Co' });

      const res = await request(app).get('/api/companies?search=' + encodeURIComponent('(a+)+$'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/companies/industries', () => {
    it('returns the list of distinct industries (regression: route order vs. GET /:id)', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-owner4@example.com' });
      await createCompanyForOwner(owner._id, { industry: 'Aerospace' });

      const res = await request(app).get('/api/companies/industries');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toContain('Aerospace');
    });
  });

  describe('GET /api/companies/:id', () => {
    it('returns a single company and increments its profile view count', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-owner5@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app).get(`/api/companies/${company._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(company._id.toString());

      const updated = await Company.findById(company._id);
      expect(updated.stats.profileViews).toBe(1);
    });

    it('returns 404 for a non-existent company', async () => {
      const fakeId = '64b64b64b64b64b64b64b64b';
      const res = await request(app).get(`/api/companies/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/companies', () => {
    it('allows an employer to create a company', async () => {
      const { user: employer } = await createUser({ role: 'employer', email: 'companies-create1@example.com' });

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', authHeader(employer))
        .send({
          name: 'New Startup Inc',
          description: 'We build things.',
          industry: 'Technology',
          size: '1-10'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.owner._id).toBe(employer._id.toString());
    });

    it('rejects a student from creating a company', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'companies-create2@example.com' });

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', authHeader(student))
        .send({
          name: 'Should Not Exist',
          description: 'N/A',
          industry: 'Technology',
          size: '1-10'
        });

      expect(res.status).toBe(403);
    });

    it('rejects an invalid company size', async () => {
      const { user: employer } = await createUser({ role: 'employer', email: 'companies-create3@example.com' });

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', authHeader(employer))
        .send({
          name: 'Bad Size Co',
          description: 'N/A',
          industry: 'Technology',
          size: 'huge'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('allows the owner to update their company', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-update1@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .put(`/api/companies/${company._id}`)
        .set('Authorization', authHeader(owner))
        .send({ description: 'An updated description of what we do.' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('An updated description of what we do.');
    });

    it('rejects an unrelated employer from updating the company', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-update2@example.com' });
      const { user: outsider } = await createUser({ role: 'employer', email: 'companies-update-outsider@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .put(`/api/companies/${company._id}`)
        .set('Authorization', authHeader(outsider))
        .send({ description: 'I should not be able to set this.' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/companies/:id/team', () => {
    it('allows the owner to add a team member', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-team-owner@example.com' });
      const { user: newMember } = await createUser({ role: 'employer', email: 'companies-team-member@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(owner))
        .send({ userId: newMember._id.toString(), role: 'recruiter', permissions: ['view_applications'] });

      expect(res.status).toBe(200);
      expect(res.body.data.some((member) => member.user._id === newMember._id.toString())).toBe(true);
    });

    it('writes a persisted audit log entry when a team member is added', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-team-audit-owner@example.com' });
      const { user: newMember } = await createUser({ role: 'employer', email: 'companies-team-audit-member@example.com' });
      const company = await createCompanyForOwner(owner._id);

      await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(owner))
        .send({ userId: newMember._id.toString(), role: 'recruiter', permissions: ['view_applications'] });

      const AuditLog = require('../models/AuditLog');
      const entry = await AuditLog.findOne({
        targetType: 'Company',
        targetId: company._id,
        action: 'company_team_member_added'
      });

      expect(entry).not.toBeNull();
      expect(entry.actor.toString()).toBe(owner._id.toString());
      expect(entry.after.userId).toBe(newMember._id.toString());
    });

    it('rejects a non-owner from adding a team member', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-team-owner2@example.com' });
      const { user: outsider } = await createUser({ role: 'employer', email: 'companies-team-outsider@example.com' });
      const { user: newMember } = await createUser({ role: 'employer', email: 'companies-team-member2@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(outsider))
        .send({ userId: newMember._id.toString(), role: 'recruiter', permissions: [] });

      expect(res.status).toBe(403);
    });

    it('rejects adding the same team member twice', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-team-owner3@example.com' });
      const { user: newMember } = await createUser({ role: 'employer', email: 'companies-team-member3@example.com' });
      const company = await createCompanyForOwner(owner._id);

      await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(owner))
        .send({ userId: newMember._id.toString(), role: 'recruiter', permissions: [] });

      const res = await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(owner))
        .send({ userId: newMember._id.toString(), role: 'recruiter', permissions: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/companies/:id/team/:memberId', () => {
    it('allows the owner to remove a team member', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-team-remove-owner@example.com' });
      const { user: member } = await createUser({ role: 'employer', email: 'companies-team-remove-member@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const addRes = await request(app)
        .post(`/api/companies/${company._id}/team`)
        .set('Authorization', authHeader(owner))
        .send({ userId: member._id.toString(), role: 'recruiter', permissions: [] });
      const memberId = addRes.body.data[0]._id;

      const res = await request(app)
        .delete(`/api/companies/${company._id}/team/${memberId}`)
        .set('Authorization', authHeader(owner));

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/companies/:id/reviews', () => {
    it('allows a user to leave a review', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-review-owner@example.com' });
      const { user: reviewer } = await createUser({ role: 'student', email: 'companies-reviewer@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post(`/api/companies/${company._id}/reviews`)
        .set('Authorization', authHeader(reviewer))
        .send({ rating: 5, title: 'Great place', content: 'Loved working here.' });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
    });

    it('rejects a duplicate review from the same user', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-review-owner2@example.com' });
      const { user: reviewer } = await createUser({ role: 'student', email: 'companies-reviewer2@example.com' });
      const company = await createCompanyForOwner(owner._id);

      await request(app)
        .post(`/api/companies/${company._id}/reviews`)
        .set('Authorization', authHeader(reviewer))
        .send({ rating: 4, title: 'Good place', content: 'Solid experience.' });

      const res = await request(app)
        .post(`/api/companies/${company._id}/reviews`)
        .set('Authorization', authHeader(reviewer))
        .send({ rating: 2, title: 'Changed my mind', content: 'Actually not great.' });

      expect(res.status).toBe(400);
    });

    it('rejects a rating outside 1-5', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-review-owner3@example.com' });
      const { user: reviewer } = await createUser({ role: 'student', email: 'companies-reviewer3@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post(`/api/companies/${company._id}/reviews`)
        .set('Authorization', authHeader(reviewer))
        .send({ rating: 9, title: 'Too good', content: 'Off the charts.' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/companies/:id/reviews', () => {
    it('returns paginated reviews for a company', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-reviews-list-owner@example.com' });
      const { user: reviewer } = await createUser({ role: 'student', email: 'companies-reviews-list-reviewer@example.com' });
      const company = await createCompanyForOwner(owner._id);

      await request(app)
        .post(`/api/companies/${company._id}/reviews`)
        .set('Authorization', authHeader(reviewer))
        .send({ rating: 4, title: 'Nice', content: 'Pretty good overall.' });

      const res = await request(app).get(`/api/companies/${company._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('POST /api/companies/:id/follow', () => {
    it('reports not-yet-implemented rather than a fake success', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'companies-follow-owner@example.com' });
      const { user: follower } = await createUser({ role: 'student', email: 'companies-follower@example.com' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post(`/api/companies/${company._id}/follow`)
        .set('Authorization', authHeader(follower));

      expect(res.status).toBe(501);
    });
  });
});
