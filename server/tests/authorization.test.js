const { isCompanyOwner, isCompanyTeamMemberWithPermission, canManageCompany } = require('../utils/authorization');

describe('authorization helpers (pure unit tests, no DB)', () => {
  const ownerId = '507f1f77bcf86cd799439011';
  const teamMemberId = '507f1f77bcf86cd799439012';
  const outsiderId = '507f1f77bcf86cd799439013';

  const company = {
    owner: { toString: () => ownerId },
    team: [
      {
        user: { toString: () => teamMemberId },
        permissions: ['create_jobs', 'view_applications']
      }
    ]
  };

  describe('isCompanyOwner', () => {
    it('returns true for the owner', () => {
      expect(isCompanyOwner(company, ownerId)).toBe(true);
    });

    it('returns false for a non-owner', () => {
      expect(isCompanyOwner(company, outsiderId)).toBe(false);
    });

    it('returns false when company is missing', () => {
      expect(isCompanyOwner(null, ownerId)).toBe(false);
    });
  });

  describe('isCompanyTeamMemberWithPermission', () => {
    it('returns true when the team member holds the permission', () => {
      expect(isCompanyTeamMemberWithPermission(company, teamMemberId, 'create_jobs')).toBe(true);
    });

    it('returns false when the team member lacks the permission', () => {
      expect(isCompanyTeamMemberWithPermission(company, teamMemberId, 'delete_jobs')).toBe(false);
    });

    it('returns false for a user not on the team', () => {
      expect(isCompanyTeamMemberWithPermission(company, outsiderId, 'create_jobs')).toBe(false);
    });
  });

  describe('canManageCompany', () => {
    it('always allows admins', () => {
      expect(canManageCompany(company, { id: outsiderId, role: 'admin' }, 'delete_jobs')).toBe(true);
    });

    it('allows the owner regardless of permission argument', () => {
      expect(canManageCompany(company, { id: ownerId, role: 'employer' })).toBe(true);
    });

    it('allows a team member with the right permission', () => {
      expect(canManageCompany(company, { id: teamMemberId, role: 'employer' }, 'view_applications')).toBe(true);
    });

    it('denies a team member without the right permission', () => {
      expect(canManageCompany(company, { id: teamMemberId, role: 'employer' }, 'manage_company')).toBe(false);
    });

    it('denies an outsider', () => {
      expect(canManageCompany(company, { id: outsiderId, role: 'employer' }, 'view_applications')).toBe(false);
    });

    it('denies when no permission is specified and user is a non-owner team member', () => {
      expect(canManageCompany(company, { id: teamMemberId, role: 'employer' })).toBe(false);
    });
  });
});

describe('buildJobQuery (pure unit tests, no DB)', () => {
  // Imported lazily so this file can run even if jobController has other
  // module-level dependencies; require at top would be fine too, kept here
  // for clarity that this is the function under test.
  const { buildJobQuery } = require('../controllers/jobController');

  it('always scopes to active jobs', () => {
    const query = buildJobQuery({});
    expect(query.status).toBe('active');
    expect(query.$and).toBeUndefined();
  });

  it('adds a single $and clause for a single filter', () => {
    const query = buildJobQuery({ location: 'Austin' });
    expect(query.$and).toHaveLength(1);
  });

  it('composes multiple filters as independent $and clauses instead of overwriting each other', () => {
    const query = buildJobQuery({ location: 'Austin', salaryMin: '50000', search: 'engineer' });
    expect(query.$and).toHaveLength(3);
  });

  it('applies simple equality filters directly on the query', () => {
    const query = buildJobQuery({ category: 'Design', type: 'contract', level: 'senior' });
    expect(query.category).toBe('Design');
    expect(query.type).toBe('contract');
    expect(query.level).toBe('senior');
  });
});
