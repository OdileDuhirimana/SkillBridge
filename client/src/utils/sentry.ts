import * as Sentry from '@sentry/react';

/**
 * Client-side Sentry error tracking initialization.
 *
 * WHY optional/inert without configuration: matches the same pattern as
 * the server's Sentry setup (server/config/sentry.js) — a portfolio
 * project should never require a real third-party DSN to run locally or
 * in CI. `initClientSentry()` no-ops when `REACT_APP_SENTRY_DSN` is unset.
 * (CRA only exposes env vars prefixed `REACT_APP_` to client bundles.)
 */
export const initClientSentry = (): void => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE) || 0.1
  });
};
