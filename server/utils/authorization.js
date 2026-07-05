/**
 * Shared company-authorization helpers.
 *
 * WHY this exists: `isOwner`/`isTeamMember` ownership checks were previously
 * duplicated near-verbatim across companyController.js (4 call sites),
 * jobController.js (2 call sites), and the inline route handlers in
 * applications.js and chats.js. Any change to "who can manage a company"
 * (e.g. adding a new role, changing the permission model) required editing
 * every call site in lockstep — a maintainability risk flagged in both the
 * code-review and portfolio audits. Centralizing it here means the rule is
 * defined once and every caller stays in sync automatically.
 *
 * These are pure functions (no I/O) so they are trivially unit-testable in
 * isolation from Express/Mongoose.
 */

/**
 * Determine whether a user is the owner of a company.
 * @param {import('mongoose').Document} company - A loaded Company document.
 * @param {string} userId - The candidate user's id.
 * @returns {boolean}
 */
const isCompanyOwner = (company, userId) => {
  if (!company || !company.owner || !userId) return false;
  return company.owner.toString() === userId.toString();
};

/**
 * Determine whether a user is a team member of a company holding a specific
 * permission (e.g. 'create_jobs', 'manage_company', 'view_applications').
 * @param {import('mongoose').Document} company - A loaded Company document.
 * @param {string} userId - The candidate user's id.
 * @param {string} permission - The permission to check for.
 * @returns {boolean}
 */
const isCompanyTeamMemberWithPermission = (company, userId, permission) => {
  if (!company || !Array.isArray(company.team) || !userId) return false;
  return company.team.some(
    (member) =>
      member.user &&
      member.user.toString() === userId.toString() &&
      Array.isArray(member.permissions) &&
      member.permissions.includes(permission)
  );
};

/**
 * Determine whether a user may manage a company resource: owners and admins
 * always may; team members may only if they hold the given permission.
 *
 * @param {import('mongoose').Document} company - A loaded Company document.
 * @param {{ id: string, role: string }} user - The authenticated request user.
 * @param {string} [permission] - Permission required for team members
 *   (ignored for owners/admins). Omit for owner/admin-only checks.
 * @returns {boolean}
 */
const canManageCompany = (company, user, permission) => {
  if (!company || !user) return false;
  if (user.role === 'admin') return true;
  if (isCompanyOwner(company, user.id)) return true;
  if (!permission) return false;
  return isCompanyTeamMemberWithPermission(company, user.id, permission);
};

module.exports = {
  isCompanyOwner,
  isCompanyTeamMemberWithPermission,
  canManageCompany
};
