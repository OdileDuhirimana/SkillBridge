const { createClient } = require('redis');
const logger = require('../utils/logger');

/**
 * Lazily-connected, fail-open Redis client for the caching layer
 * (see server/utils/cache.js).
 *
 * WHY fail-open (never throw, never block a request on Redis being down):
 * caching is a performance optimization, not a correctness dependency —
 * every cached read has a direct-from-MongoDB fallback. A previous draft
 * of this project referenced "Redis caching" in the README without ever
 * wiring it into a query path, and `docker-compose.yml`'s `redis` service
 * was removed entirely in the remediation pass that caught that gap (see
 * docs/architecture.md's Known Technical Debt history). Reintroducing
 * Redis here without a fail-open design would trade one credibility gap
 * (claimed but unused) for a worse one (a cache outage becoming an API
 * outage) — so every consumer in server/utils/cache.js treats "Redis is
 * unavailable" identically to "cache miss," never as an error to surface
 * to the client.
 *
 * WHY disabled entirely in test: the Jest suite runs against
 * `mongodb-memory-server` with no Redis instance available, and per-test
 * isolation (resetting all collections in `afterEach`, see
 * server/tests/setup.js) would otherwise need parallel cache-invalidation
 * bookkeeping with no corresponding product value — tests assert against
 * MongoDB state directly, not cache state.
 */

const isTestEnv = process.env.NODE_ENV === 'test';

let client = null;
let connectionAttempted = false;

/**
 * Returns a connected Redis client, or `null` if caching is disabled
 * (test environment) or Redis is unreachable. Connection is attempted at
 * most once per process — if it fails, every subsequent call short-circuits
 * to `null` rather than retrying on every request, which would add latency
 * to the hot path this cache exists to speed up.
 *
 * @returns {Promise<import('redis').RedisClientType|null>}
 */
const getRedisClient = async () => {
  if (isTestEnv) return null;
  if (client && client.isOpen) return client;
  if (connectionAttempted) return null;

  connectionAttempted = true;

  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        // Cap reconnect attempts rather than retrying forever in the
        // background — if Redis is genuinely unavailable (e.g. not
        // deployed alongside this app), an unbounded retry loop just
        // burns resources for no benefit; the app already works correctly
        // without a cache.
        reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 1000))
      }
    });

    // Without this handler, node-redis's 'error' event (emitted on every
    // failed reconnect attempt in the background) is an unhandled
    // EventEmitter error, which crashes the process. This MUST be `.on()`,
    // not `.once()` — node-redis keeps retrying and re-emitting `error` in
    // the background, and `.once()` would leave every error after the
    // first unhandled (and therefore fatal) again.
    client.on('error', (error) => {
      logger.warn('Redis connection error — continuing without caching', { error: error.message });
    });

    await client.connect();
    logger.info('Redis connected successfully — caching enabled');
    return client;
  } catch (error) {
    logger.warn('Redis unavailable — continuing without caching', { error: error.message });
    client = null;
    return null;
  }
};

module.exports = { getRedisClient };
