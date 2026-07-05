// Mongo container init script, run automatically by the official mongo image
// via docker-entrypoint-initdb.d on first container start (docker-compose.yml
// mounts this file read-only into that directory).
//
// Purpose: create an application-scoped database user with read/write access
// scoped to the `skillbridge` database only, rather than having the app
// connect using the root admin credentials for day-to-day queries.
//
// This runs inside the mongo shell context, authenticated as the root user
// defined by MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD.

const targetDb = process.env.MONGO_INITDB_DATABASE || 'skillbridge';

// WHY read from an env var instead of a hardcoded literal: every other
// credential in this project (root Mongo password, JWT secret) was moved
// out of source and into required env vars in an earlier remediation pass
// (see docker-compose.yml / env.example); this app-scoped database user's
// password was the one credential left behind, hardcoded in source and
// therefore visible to anyone with read access to the repository — the
// exact class of finding a security-focused code review flags immediately.
// Failing fast (throwing) when the var is missing, rather than falling
// back to an insecure default, mirrors the `${JWT_SECRET:?...}` fail-fast
// pattern already used in docker-compose.yml.
const appPassword = process.env.MONGO_APP_PASSWORD;
if (!appPassword) {
  throw new Error(
    'MONGO_APP_PASSWORD must be set in the environment before running init-mongo.js ' +
    '(see env.example) — refusing to create the application database user with no password.'
  );
}

db = db.getSiblingDB(targetDb);

db.createUser({
  user: process.env.MONGO_APP_USERNAME || 'skillbridge_app',
  pwd: appPassword,
  roles: [
    {
      role: 'readWrite',
      db: targetDb
    }
  ]
});

// Create an empty collection so the database is materialized immediately
// (Mongo otherwise defers database creation until the first write), which
// makes `docker-compose up` produce an immediately-inspectable database.
db.createCollection('_init');
