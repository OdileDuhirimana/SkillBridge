/**
 * Jest configuration for the SkillBridge server test suite.
 *
 * Scope: this project's tests cover the Express/Mongoose backend only
 * (server/**). The React client uses Create React App's own Jest
 * configuration (client/package.json -> "test": "react-scripts test") and is
 * run separately via `npm test` inside client/ — the two suites intentionally
 * do not share a runner because CRA's Jest config is not compatible with a
 * plain Node test environment.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/server/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.js'],
  testTimeout: 30000,
  // mongodb-memory-server downloads/starts a real mongod binary per worker;
  // running suites serially avoids flaky port contention in CI containers.
  maxWorkers: 1,
  collectCoverageFrom: [
    'server/controllers/**/*.js',
    'server/middleware/**/*.js',
    'server/models/**/*.js',
    'server/utils/authorization.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  // Enforced floor, not just an aspirational number: `npm run test:coverage`
  // (wired into CI — see .github/workflows/ci.yml) now fails the build if
  // coverage regresses below these levels. Set a few points below the
  // actual achieved coverage at the time this was added (~73% statements/
  // lines, ~64%/68% branches/functions) so it catches real regressions
  // without being so tight that routine refactors trip it.
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
      branches: 60,
      functions: 63
    }
  }
};
