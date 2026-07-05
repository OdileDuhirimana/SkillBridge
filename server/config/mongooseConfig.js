const mongoose = require('mongoose');

/**
 * Applies a global JSON serialization default so every Mongoose model
 * (including embedded subdocuments, e.g. Chat.messages, Company.team) emits
 * an `id` string field alongside the raw `_id` ObjectId when serialized via
 * `res.json()` / `JSON.stringify()`.
 *
 * WHY this matters: without this, `res.json(document)` only includes `_id`
 * (an ObjectId that serializes to a plain string, but under the key `_id`,
 * not `id`). The client-side TypeScript types (client/src/types/index.ts)
 * and every page component consistently read `.id` — a convention that
 * happened to work throughout development only because the pages were
 * still using hardcoded mock data. The moment real API responses were
 * wired in (this pass), every `.id` access would have been `undefined`,
 * silently breaking links, keys, and lookups app-wide. Setting this once,
 * globally, at the Mongoose level is more robust than patching every
 * frontend call site to read `_id` instead, and keeps the API's public
 * contract (`id`, not `_id`) consistent regardless of which model or
 * controller produced the response.
 *
 * Must be required before any model file so the option applies to every
 * schema compiled afterward (see server/app.js require order).
 */
const configureMongoose = () => {
  mongoose.set('toJSON', {
    virtuals: true,
    versionKey: false
  });
};

module.exports = { configureMongoose };
