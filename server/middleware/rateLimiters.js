const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for the API.
 *
 * WHY split the auth limiter out from the general API limiter: a single
 * global ceiling (previously 100 req/15min across all of `/api/*`) means
 * brute-forcing `/api/auth/login` is only as hard as hitting the same
 * generic budget as browsing job listings. Credential-stuffing and
 * password-guessing attacks specifically target authentication endpoints,
 * so they need a materially tighter, purpose-built limit independent of
 * general API traffic — this is standard practice (OWASP ASVS 2.2.1) for
 * any endpoint that accepts a password.
 *
 * Both limiters are configurable via env vars so the values can be tuned
 * per-environment (e.g. relaxed in local dev, strict in production) without
 * a code change.
 *
 * WHY both limiters are skipped entirely in `NODE_ENV === 'test'`: the
 * integration test suite runs many requests against a single, long-lived
 * `createApp()` instance per test file (see server/tests/*.test.js), and
 * express-rate-limit's in-memory store is keyed per-limiter-instance, not
 * per-test — every Supertest request in a file shares the same counter.
 * Without this skip, adding more test cases to an existing file (e.g. more
 * auth-failure assertions) could non-deterministically start failing with
 * 429s purely due to test volume, not the AUT under test. This does not
 * weaken production security: the skip is gated on `NODE_ENV === 'test'`
 * specifically, which is never how the app runs in production or even
 * local development (`npm run dev` uses `NODE_ENV=development`).
 */
const isTestEnv = () => process.env.NODE_ENV === 'test';

const generalApiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Tighter window/ceiling specifically for authentication endpoints
// (login/register) where the cost of a successful brute-force/credential-
// stuffing attempt is far higher than an extra read request being throttled.
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Do not count successful auth attempts against the limit, so a
  // legitimate user who mistypes a password once or twice isn't locked out
  // by their own later successful login.
  skipSuccessfulRequests: true,
  skip: isTestEnv,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.'
  }
});

module.exports = { generalApiLimiter, authLimiter };
