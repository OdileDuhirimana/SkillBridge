const request = require('supertest');
const { createApp } = require('../app');
const { createUser, createCompanyForOwner, createJobForCompany } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

describe('Job CRUD', () => {
  describe('GET /api/jobs', () => {
    it('returns only active jobs with pagination metadata', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      await createJobForCompany(company._id, owner._id, { title: 'Active Job', status: 'active' });
      await createJobForCompany(company._id, owner._id, { title: 'Draft Job', status: 'draft' });

      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Active Job');
      expect(res.body.pagination).toEqual(
        expect.objectContaining({ current: 1, total: 1 })
      );
    });

    // Regression test for a real bug this pass introduced and fixed: without
    // the global `mongoose.set('toJSON', { virtuals: true })` applied in
    // server/config/mongooseConfig.js, API responses only contained `_id`,
    // not `id` — but every frontend page and TypeScript type reads `.id`.
    // That mismatch would have silently broken every link, key, and lookup
    // in the client the moment real data replaced the mock arrays.
    it('serializes documents with an `id` field alongside `_id`', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      await createJobForCompany(company._id, owner._id);

      const res = await request(app).get('/api/jobs');

      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toEqual(expect.any(String));
      expect(res.body.data[0].id).toBe(res.body.data[0]._id);
    });

    // Regression test for the filter-composition bug: location and salary
    // filters used to each assign to `query.$or` independently, so the
    // second filter silently overwrote the first and jobs matching only one
    // of the two criteria could incorrectly appear (or correct matches could
    // vanish) depending on assignment order. Filters must now compose via
    // $and so that supplying both narrows results as expected.
    it('composes location and salary filters with AND semantics instead of overwriting each other', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);

      // Matches both filters: San Francisco AND salary range overlapping 100k-150k
      await createJobForCompany(company._id, owner._id, {
        title: 'SF High Salary',
        location: { type: 'on-site', address: { city: 'San Francisco' } },
        salary: { min: 120000, max: 150000 }
      });

      // Matches location only (salary too low to overlap the requested band)
      await createJobForCompany(company._id, owner._id, {
        title: 'SF Low Salary',
        location: { type: 'on-site', address: { city: 'San Francisco' } },
        salary: { min: 40000, max: 60000 }
      });

      // Matches salary only (wrong city)
      await createJobForCompany(company._id, owner._id, {
        title: 'NYC High Salary',
        location: { type: 'on-site', address: { city: 'New York' } },
        salary: { min: 120000, max: 150000 }
      });

      const res = await request(app)
        .get('/api/jobs')
        .query({ location: 'San Francisco', salaryMin: '100000', salaryMax: '150000' });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((job) => job.title);
      expect(titles).toEqual(['SF High Salary']);
    });

    it('filters by category', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      await createJobForCompany(company._id, owner._id, { title: 'Tech Job', category: 'Technology' });
      await createJobForCompany(company._id, owner._id, { title: 'Design Job', category: 'Design' });

      const res = await request(app).get('/api/jobs').query({ category: 'Design' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Design Job');
    });
  });

  describe('POST /api/jobs', () => {
    it('allows a company owner to create a job', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', authHeader(owner))
        .send({
          title: 'Backend Engineer',
          description: 'Build APIs',
          requirements: 'Node.js experience',
          responsibilities: 'Ship features',
          company: company._id.toString(),
          category: 'Technology',
          type: 'full-time',
          level: 'mid',
          location: { type: 'remote' }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Backend Engineer');
    });

    it('rejects job creation from a user with no relationship to the company', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      const { user: outsider } = await createUser({ role: 'employer', email: 'outsider@example.com' });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', authHeader(outsider))
        .send({
          title: 'Backend Engineer',
          description: 'Build APIs',
          requirements: 'Node.js experience',
          responsibilities: 'Ship features',
          company: company._id.toString(),
          category: 'Technology',
          type: 'full-time',
          level: 'mid',
          location: { type: 'remote' }
        });

      expect(res.status).toBe(403);
    });

    it('rejects job creation from an unauthenticated request', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post('/api/jobs')
        .send({
          title: 'Backend Engineer',
          description: 'Build APIs',
          requirements: 'Node.js experience',
          responsibilities: 'Ship features',
          company: company._id.toString(),
          category: 'Technology',
          type: 'full-time',
          level: 'mid',
          location: { type: 'remote' }
        });

      expect(res.status).toBe(401);
    });

    it('rejects job creation with an invalid category', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', authHeader(owner))
        .send({
          title: 'Backend Engineer',
          description: 'Build APIs',
          requirements: 'Node.js experience',
          responsibilities: 'Ship features',
          company: company._id.toString(),
          category: 'NotARealCategory',
          type: 'full-time',
          level: 'mid'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('allows the owner to update their job', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);

      const res = await request(app)
        .put(`/api/jobs/${job._id}`)
        .set('Authorization', authHeader(owner))
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('rejects updates from a non-owner, non-team-member user', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: outsider } = await createUser({ role: 'employer', email: 'outsider2@example.com' });

      const res = await request(app)
        .put(`/api/jobs/${job._id}`)
        .set('Authorization', authHeader(outsider))
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent job id', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const fakeId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .put(`/api/jobs/${fakeId}`)
        .set('Authorization', authHeader(owner))
        .send({ title: 'Does not matter' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('allows the owner to delete their job', async () => {
      const { user: owner } = await createUser({ role: 'employer' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);

      const res = await request(app)
        .delete(`/api/jobs/${job._id}`)
        .set('Authorization', authHeader(owner));

      expect(res.status).toBe(200);

      const getRes = await request(app).get(`/api/jobs/${job._id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
