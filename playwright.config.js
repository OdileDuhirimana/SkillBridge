const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E configuration.
 *
 * WHY this exists: both audits flagged zero E2E coverage (TEST-03). These
 * specs exercise the two flows repeatedly named as the highest-value
 * targets: register → search → apply (student side) and the employer's
 * ability to authenticate and see the resulting application. They run
 * against the REAL built client (served statically, not a mocked
 * component tree) and the REAL Express API backed by a real MongoDB
 * instance — the same stack a user would actually touch — not a mocked
 * or component-level simulation.
 *
 * Scope note on "employer post → review": the current client has no
 * UI for creating a job posting or for changing an application's status
 * (both are fully implemented and tested at the API layer — see
 * server/routes/jobs.js, server/routes/applications.js, and
 * server/tests/*.test.js — but have no corresponding page/form in
 * client/src/pages/). This is a real, previously-undocumented product
 * gap this E2E-writing effort surfaced; it is now recorded in
 * docs/architecture.md's Known Technical Debt. `e2e/global-setup.js`
 * creates the job via a direct API call (the same way a real integration
 * would, absent a UI) so `student-apply-flow.spec.js` has something to
 * apply to; `employer-review-flow.spec.js` exercises what IS UI-drivable
 * today (employer registration, authentication, and viewing the
 * applications list) and documents the gap inline rather than papering
 * over it with an API-driven fake click.
 */
// Ports default to this project's documented conventions (server on 5000,
// client on 3000 — matching README.md, docker-compose.yml, env.example
// throughout) but are overridable via env vars so a local run can avoid a
// collision with something else already bound to those ports without
// changing what a real dev/CI machine gets by default.
const API_PORT = process.env.E2E_API_PORT || '5000';
const CLIENT_PORT = process.env.E2E_CLIENT_PORT || '3000';
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

// WHY a unique, timestamped database name per run instead of a fixed
// `skillbridge_e2e` name that global-setup.js drops at the start of every
// run: Playwright starts `webServer`s (this file's API process) and waits
// for them to be healthy BEFORE running `globalSetup` — meaning the API
// server has already connected and built its indexes (including the
// `$text` indexes `Job.init()`/`Company.init()` create at startup, see
// server/index.js) by the time `globalSetup` would run. Calling
// `dropDatabase()` at that point destroys those just-built indexes out
// from under the still-running server process — which has no way to know
// its indexes were wiped — reproducing a real
// `MongoServerError: text index required for $text query` on the very
// first search request. A fresh, unique database per run needs no
// destructive reset at all, sidestepping the whole race; the previous
// run's database (if any) is still cleaned up, just at the END of the
// run (see e2e/global-teardown.js) rather than the start of the next one.
process.env.E2E_MONGODB_URI = process.env.E2E_MONGODB_URI
  || `mongodb://localhost:27017/skillbridge_e2e_${Date.now()}`;

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30000,
  // 'html' (opt-in via env var, not opened automatically) is what CI
  // uploads as an artifact on failure — see .github/workflows/ci.yml.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: require.resolve('./e2e/global-setup.js'),
  globalTeardown: require.resolve('./e2e/global-teardown.js'),
  use: {
    baseURL: CLIENT_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: [
    {
      command: 'node server/index.js',
      url: `${API_URL}/api/health`,
      timeout: 30000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'development',
        PORT: API_PORT,
        MONGODB_URI: process.env.E2E_MONGODB_URI || 'mongodb://localhost:27017/skillbridge_e2e',
        JWT_SECRET: 'e2e-test-jwt-secret-do-not-use-in-production',
        JWT_EXPIRE: '1h',
        CLIENT_URL,
        CORS_ALLOWED_ORIGINS: CLIENT_URL,
        // Keep rate limiting out of the way of a test run that registers
        // several accounts in quick succession — this is the same
        // "don't let infrastructure concerns fail a hermetic test suite"
        // reasoning as server/middleware/rateLimiters.js's NODE_ENV==='test'
        // skip, applied here via an explicitly generous limit instead
        // (NODE_ENV is intentionally 'development', not 'test', so the app
        // runs exactly as it would in a real deployment; the skip that
        // rateLimiters.js already has for `NODE_ENV==='test'` does not
        // apply here on purpose).
        AUTH_RATE_LIMIT_MAX_REQUESTS: '1000'
      }
    },
    {
      command: `npx serve -s build -l ${CLIENT_PORT}`,
      cwd: './client',
      url: CLIENT_URL,
      timeout: 30000,
      reuseExistingServer: false
    }
  ]
});
