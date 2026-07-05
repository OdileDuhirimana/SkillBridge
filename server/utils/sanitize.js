/**
 * Shared helpers for safely turning user-supplied search strings into
 * MongoDB `$regex` patterns.
 *
 * WHY this exists: `buildJobQuery` (jobController.js) and `getCompanies`
 * (companyController.js) both build `new RegExp(userInput, 'i')` /
 * `{ $regex: userInput }` clauses directly from `req.query.search` /
 * `req.query.location` with no escaping and no length limit. Two real,
 * distinct risks follow from that:
 *
 *   1. Regex-metacharacter injection — a value like `.*` or `(a+)+$` is not
 *      a literal substring match, it is compiled as a regular expression.
 *      A caller can shape the query in ways the author never intended
 *      (broad unintended matches, or query planner surprises).
 *   2. ReDoS (Regular Expression Denial of Service) — a crafted pattern
 *      with nested quantifiers (e.g. `(a+)+b`) can trigger catastrophic
 *      backtracking in the regex engine, degrading or hanging the event
 *      loop for a single-threaded Node process on a single request.
 *
 * The fix applied here is the standard mitigation for "let users search by
 * substring, without letting them author arbitrary regex": escape every
 * regex metacharacter in the input (so it is matched as a literal string)
 * and cap the input length (so even a pathological literal string can't
 * grow the compiled pattern unboundedly).
 */

// Search/location inputs beyond this length provide no legitimate UX value
// (no job title, city, or company name is meaningfully longer than this)
// and only increase the cost of building/evaluating the resulting pattern.
const MAX_SEARCH_INPUT_LENGTH = 100;

/**
 * Escape every character with special meaning in a JavaScript regular
 * expression, so the input is safe to interpolate into `new RegExp()` or a
 * Mongoose `$regex` clause and will only ever match itself literally.
 *
 * @param {string} input - Raw, untrusted user input.
 * @returns {string} The input with all regex metacharacters escaped.
 */
const escapeRegExp = (input) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validate and sanitize a user-supplied search/filter string for safe use
 * in a case-insensitive substring `$regex` match.
 *
 * Defensive by design: non-string input (including `undefined`/`null`,
 * arrays from query-string pollution like `?search[]=a&search[]=b`, or
 * objects) is rejected rather than coerced, since coercion is exactly how
 * NoSQL-operator-injection payloads (`?search[$gt]=`) slip through.
 *
 * @param {unknown} rawInput - The raw value from `req.query`.
 * @returns {string|null} A regex-safe literal string, or `null` if the
 *   input is not a usable string (caller should skip applying the filter).
 */
const sanitizeSearchInput = (rawInput) => {
  if (typeof rawInput !== 'string') return null;

  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const capped = trimmed.slice(0, MAX_SEARCH_INPUT_LENGTH);
  return escapeRegExp(capped);
};

/**
 * Validate and sanitize a user-supplied string for safe use as a MongoDB
 * `$text` search operand (as opposed to `$regex` — see `sanitizeSearchInput`
 * above).
 *
 * WHY this is a separate function rather than reusing `sanitizeSearchInput`:
 * `$text` is not a regex engine — it tokenizes the input against a text
 * index, so there is no regex-metacharacter-injection or ReDoS surface to
 * escape against. Running `escapeRegExp` on a `$text` search string would
 * be harmless but pointless (backslash-escaping characters like `(` that
 * have no special meaning to `$text`), and would subtly degrade match
 * quality (a literal backslash becomes part of the searched text). The
 * same defensive principles that DO still apply — reject non-string input,
 * cap length — are kept.
 *
 * @param {unknown} rawInput - The raw value from `req.query`.
 * @returns {string|null} A trimmed, length-capped string, or `null` if the
 *   input is not a usable string.
 */
const sanitizeTextSearchInput = (rawInput) => {
  if (typeof rawInput !== 'string') return null;

  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, MAX_SEARCH_INPUT_LENGTH);
};

module.exports = { escapeRegExp, sanitizeSearchInput, sanitizeTextSearchInput, MAX_SEARCH_INPUT_LENGTH };
