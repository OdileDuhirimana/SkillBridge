/**
 * Shared pagination helpers.
 *
 * WHY this exists: `limit * 1`, `.skip((page - 1) * limit)`, and an
 * identical `{ current, pages, total }` response-shaping object were
 * duplicated verbatim across `jobController.getJobs`,
 * `jobController.getJobsByCompany`, `companyController.getCompanies`,
 * `companyController.getCompanyReviews`, `userController.getUsers`,
 * `routes/applications.js`, and `routes/chats.js` — seven call sites that
 * all had to be edited in lockstep to change pagination behavior. This
 * mirrors the exact problem `server/utils/authorization.js` solved for
 * company-ownership checks; extracting it here applies that same pattern
 * consistently instead of leaving it as a one-off.
 *
 * Both functions are pure (no I/O), so they are trivially unit-testable in
 * isolation from Express/Mongoose — the same testability property already
 * established by `authorization.js` and `buildJobQuery`.
 */

/**
 * Parse and normalize `page`/`limit` query parameters into safe integers
 * plus the corresponding Mongoose `.skip()` offset.
 *
 * Defensive by design: non-numeric, negative, zero, or absurdly large
 * values are clamped to sane bounds rather than passed through — an
 * unvalidated `limit` (e.g. `?limit=999999999`) would otherwise let a
 * client force the server to load and transfer an unbounded result set.
 *
 * @param {{page?: unknown, limit?: unknown}} query - Raw query params (e.g. `req.query`).
 * @param {number} [defaultPageSize=10] - Limit to use when none is supplied.
 * @param {number} [maxPageSize=100] - Hard ceiling on `limit`, regardless of input.
 * @returns {{page: number, limit: number, skip: number}}
 */
const getPaginationParams = (query = {}, defaultPageSize = 10, maxPageSize = 100) => {
  const parsedPage = parseInt(query.page, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = parseInt(query.limit, 10);
  const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultPageSize;
  const limit = Math.min(requestedLimit, maxPageSize);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build the `pagination` object included on every paginated API response.
 *
 * @param {number} page - The current (1-indexed) page, as returned by `getPaginationParams`.
 * @param {number} limit - The page size, as returned by `getPaginationParams`.
 * @param {number} total - Total number of matching documents (from `.countDocuments()`).
 * @returns {{current: number, pages: number, total: number}}
 */
const buildPaginationMeta = (page, limit, total) => ({
  current: page,
  pages: limit > 0 ? Math.ceil(total / limit) : 0,
  total
});

module.exports = { getPaginationParams, buildPaginationMeta };
