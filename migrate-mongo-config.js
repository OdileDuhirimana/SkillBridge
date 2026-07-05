// migrate-mongo configuration.
//
// WHY this exists: the code-review and portfolio audits both flagged the
// absence of any schema-migration tool (DB-04) — only `seedData.js`
// (development seed data, not a migration) and `init-mongo.js` (Docker
// user-bootstrap, not a migration) existed. Seed data and migrations solve
// different problems: seeding populates a fresh/dev database with sample
// records; migrations apply incremental, forward-only (and reversible)
// changes to a database that may already hold real data, which is what an
// actual production deployment needs whenever a schema changes shape
// (e.g. backfilling a new field, adding an index to an existing
// collection) without wiping existing documents.
require('dotenv').config();

module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    databaseName: process.env.MONGO_DATABASE || 'skillbridge',
    options: {}
  },
  migrationsDir: 'server/migrations',
  changelogCollectionName: 'migrations_changelog',
  migrationFileExtension: '.js',
  // Every migration in server/migrations/ exports plain async functions
  // (not TypeScript-transpiled), matching the rest of server/.
  useFileHash: false,
  moduleSystem: 'commonjs'
};
