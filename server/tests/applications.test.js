const request = require('supertest');
const { createApp } = require('../app');
const { createUser, createCompanyForOwner, createJobForCompany } = require('./helpers');

const app = createApp();

const authHeader = (user) => `Bearer ${user.getSignedJwtToken()}`;

describe('Applications', () => {
  describe('POST /api/applications', () => {
    it('allows a student to apply to an active job', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner1@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student1@example.com' });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString(), coverLetter: 'I would love this role.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job._id).toBe(job._id.toString());
      expect(res.body.xpGained).toBe(25);
    });

    it('rejects a duplicate application to the same job by the same student', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner2@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student2@example.com' });

      await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });

      expect(res.status).toBe(400);
    });

    it('rejects applications from a non-student role', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner3@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: employer } = await createUser({ role: 'employer', email: 'employer3@example.com' });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(employer))
        .send({ jobId: job._id.toString() });

      expect(res.status).toBe(403);
    });

    it('rejects applying to a non-active (e.g. draft) job', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner4@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id, { status: 'draft' });
      const { user: student } = await createUser({ role: 'student', email: 'student4@example.com' });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });

      expect(res.status).toBe(400);
    });

    it('rejects an application referencing a non-existent job', async () => {
      const { user: student } = await createUser({ role: 'student', email: 'student5@example.com' });
      const fakeJobId = '64b64b64b64b64b64b64b64b';

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: fakeJobId });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/applications', () => {
    it('scopes results to the student’s own applications', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner6@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);

      const { user: studentA } = await createUser({ role: 'student', email: 'studentA@example.com' });
      const { user: studentB } = await createUser({ role: 'student', email: 'studentB@example.com' });

      await request(app).post('/api/applications').set('Authorization', authHeader(studentA)).send({ jobId: job._id.toString() });
      await request(app).post('/api/applications').set('Authorization', authHeader(studentB)).send({ jobId: job._id.toString() });

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', authHeader(studentA));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].applicant.email).toBe('studenta@example.com');
    });

    it('scopes results to companies owned/managed by an employer', async () => {
      const { user: ownerA } = await createUser({ role: 'employer', email: 'ownerA@example.com' });
      const { user: ownerB } = await createUser({ role: 'employer', email: 'ownerB@example.com' });
      const companyA = await createCompanyForOwner(ownerA._id, { name: 'Company A' });
      const companyB = await createCompanyForOwner(ownerB._id, { name: 'Company B' });
      const jobA = await createJobForCompany(companyA._id, ownerA._id);
      const jobB = await createJobForCompany(companyB._id, ownerB._id);

      const { user: student } = await createUser({ role: 'student', email: 'studentC@example.com' });
      await request(app).post('/api/applications').set('Authorization', authHeader(student)).send({ jobId: jobA._id.toString() });
      await request(app).post('/api/applications').set('Authorization', authHeader(student)).send({ jobId: jobB._id.toString() });

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', authHeader(ownerA));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].company.name).toBe('Company A');
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/applications');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/applications/:id/status', () => {
    it('allows the hiring company owner to update application status', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner7@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student7@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', authHeader(owner))
        .send({ status: 'under-review' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('under-review');
    });

    // Regression/feature test for the persisted audit trail
    // (server/models/AuditLog.js) added to close the SEC-06 gap flagged by
    // both prior audits: sensitive state transitions previously left no
    // durable, queryable record of who changed what and when.
    it('writes a persisted audit log entry recording the status transition', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner-audit@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student-audit@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', authHeader(owner))
        .send({ status: 'shortlisted', message: 'Strong candidate.' });

      const AuditLog = require('../models/AuditLog');
      const entry = await AuditLog.findOne({
        targetType: 'Application',
        targetId: applicationId,
        action: 'application_status_changed'
      });

      expect(entry).not.toBeNull();
      expect(entry.actor.toString()).toBe(owner._id.toString());
      expect(entry.before.status).toBe('applied');
      expect(entry.after.status).toBe('shortlisted');
    });

    it('rejects status updates from an unrelated employer', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner8@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student8@example.com' });
      const { user: unrelatedEmployer } = await createUser({ role: 'employer', email: 'unrelated8@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', authHeader(unrelatedEmployer))
        .send({ status: 'rejected' });

      expect(res.status).toBe(403);
    });

    it('rejects an invalid status value', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner9@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student9@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', authHeader(owner))
        .send({ status: 'not-a-real-status' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/applications/:id/withdraw', () => {
    it('allows the applicant to withdraw their own application', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner10@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student10@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', authHeader(student));

      expect(res.status).toBe(200);
    });

    it('rejects withdrawal by a different student', async () => {
      const { user: owner } = await createUser({ role: 'employer', email: 'owner11@example.com' });
      const company = await createCompanyForOwner(owner._id);
      const job = await createJobForCompany(company._id, owner._id);
      const { user: student } = await createUser({ role: 'student', email: 'student11@example.com' });
      const { user: otherStudent } = await createUser({ role: 'student', email: 'other11@example.com' });

      const createRes = await request(app)
        .post('/api/applications')
        .set('Authorization', authHeader(student))
        .send({ jobId: job._id.toString() });
      const applicationId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', authHeader(otherStudent));

      expect(res.status).toBe(403);
    });
  });
});
