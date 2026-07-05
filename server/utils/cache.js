const { getRedisClient } = require('../config/redisClient');
const logger = require('./logger');

/**
 * Thin caching helpers built on the fail-open Redis client
 * (server/config/redisClient.js). Every function here degrades to "act as
 * if there is no cache" on any Redis error — callers never need their own
 * try/catch around a cache lookup.
 *
 * WHY invalidation is prefix-based (`invalidateByPrefix`) rather than
 * single-key: `getJobs`/`getCompanies` cache keys are a hash of the full
 * query (page, filters, sort), so there is no single key to invalidate
 * when a job or company is created/updated/deleted — every cached page/
 * filter combination for that resource type needs to be dropped. Redis
 * `SCAN` (not `KEYS`, which blocks the server on large keyspaces) is used
 * to find matching keys without a full-keyspace lock.
 */

const DEFAULT_TTL_SECONDS = 60;

/**
 * Build a deterministic cache key from a namespace and a params object.
 * Sorting the object's keys before serializing means `{a:1,b:2}` and
 * `{b:2,a:1}` (e.g. from differently-ordered query strings) produce the
 * same cache key instead of silently missing the cache for both.
 */
const buildCacheKey = (namespace, params = {}) => {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return `${namespace}:${JSON.stringify(sortedEntries)}`;
};

/**
 * Fetch a cached JSON value.
 * @returns {Promise<any|null>} The parsed value, or `null` on a cache miss
 *   or any Redis error (treated identically — see file-level comment).
 */
const getCached = async (key) => {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn('Cache read failed, falling back to source of truth', { key, error: error.message });
    return null;
  }
};

/**
 * Store a JSON-serializable value with a TTL. Failures are logged and
 * swallowed — a failed cache write should never fail the request that
 * triggered it, since the response has already been computed from
 * MongoDB by the time this is called.
 */
const setCached = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn('Cache write failed', { key, error: error.message });
  }
};

/**
 * Delete a single exact cache key (e.g. one company's cached profile after
 * it is updated). Use `invalidateByPrefix` instead when the affected cache
 * entries are keyed by a hash of variable query params, not a single known
 * key.
 */
const deleteCached = async (key) => {
  const client = await getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    logger.warn('Cache delete failed', { key, error: error.message });
  }
};

/**
 * Delete every cached key under a namespace prefix (e.g. all cached
 * `GET /api/jobs` query variations after a job is created/updated/deleted).
 * Uses `SCAN` in batches rather than `KEYS` to avoid blocking Redis on a
 * large keyspace.
 */
const invalidateByPrefix = async (prefix) => {
  const client = await getRedisClient();
  if (!client) return;

  try {
    // WHY `cursor` is a number, not the string `'0'`: node-redis v4's
    // `scan()` returns `{ cursor: number, keys: string[] }` — `cursor` is
    // numeric. Comparing it against the string `'0'` (as an earlier
    // version of this function did) is a type mismatch that strict
    // inequality never resolves once `cursor` becomes a number: `0 !== '0'`
    // is `true` in JavaScript, so the loop condition was never satisfied
    // and this ran forever on every call — a real, since-fixed infinite
    // loop caught by e2e/global-setup.js hanging on job creation (which
    // triggers this via jobController.createJob's cache invalidation).
    let cursor = 0;
    const keysToDelete = [];
    do {
      const result = await client.scan(cursor, { MATCH: `${prefix}:*`, COUNT: 100 });
      cursor = result.cursor;
      keysToDelete.push(...result.keys);
    } while (cursor !== 0);

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
    }
  } catch (error) {
    logger.warn('Cache invalidation failed', { prefix, error: error.message });
  }
};

module.exports = { buildCacheKey, getCached, setCached, deleteCached, invalidateByPrefix, DEFAULT_TTL_SECONDS };
