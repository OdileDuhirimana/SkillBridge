const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

/**
 * Sentry error-tracking initialization.
 *
 * WHY this is entirely optional/inert without configuration: both audits
 * flagged the total absence of any error-tracking/APM integration
 * (DEV-05/OBS-02). Sentry is the standard, pre-approved choice, but a
 * portfolio project should never *require* a third-party API key to boot —
 * `initSentry()` is a no-op (logs once, at debug level, and returns) when
 * `SENTRY_DSN` is not set, so local development and CI never need a real
 * Sentry account to run this app. This mirrors the same
 * "gracefully degrade when a third-party credential isn't configured"
 * pattern already used for Firebase (server/utils/pushNotifications.js)
 * and Redis (server/config/redisClient.js).
 */
const isConfigured = () => Boolean(process.env.SENTRY_DSN);

const initSentry = () => {
  if (!isConfigured()) {
    logger.debug('SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Conservative default: capture 100% of errors, but only a small
    // sample of performance traces, since trace volume scales with
    // request volume in a way error volume does not.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
  });

  logger.info('Sentry error tracking initialized');
};

/**
 * Registers Sentry's Express error handler. Must be called AFTER all
 * routes are mounted and BEFORE this app's own `errorHandler` middleware,
 * so Sentry sees the original error while the app's handler still owns
 * shaping the HTTP response.
 */
const setupSentryErrorHandler = (app) => {
  if (!isConfigured()) return;
  Sentry.setupExpressErrorHandler(app);
};

module.exports = { initSentry, setupSentryErrorHandler, isSentryConfigured: isConfigured, Sentry };
