/**
 * Backfills `preferences.notifications` on any User document that predates
 * that field, so every user has an explicit, queryable preference record
 * instead of relying on the application layer to assume schema defaults
 * for documents written before the field existed.
 *
 * WHY this is a migration and not just a Mongoose schema default: schema
 * defaults (`default: true` etc. in server/models/User.js) only apply when
 * a *new* document is created or when a specific field path is explicitly
 * set — they do not retroactively backfill already-persisted documents
 * that predate the field. Any user account created before
 * `preferences.notifications` was added to the schema would silently have
 * `undefined` there, which reads correctly today only because every
 * consumer happens to treat `undefined` the same as the default. This
 * migration makes that assumption explicit and durable at the data layer
 * instead of leaving it as an implicit application-code contract.
 */
module.exports = {
  async up(db) {
    await db.collection('users').updateMany(
      { 'preferences.notifications': { $exists: false } },
      {
        $set: {
          'preferences.notifications': {
            email: true,
            push: true,
            sms: false
          }
        }
      }
    );
  },

  async down(db) {
    // Reversible in the narrow sense migrate-mongo expects (undo the exact
    // field this migration set) — this intentionally does not attempt to
    // distinguish "backfilled by this migration" from "explicitly set by
    // a user to these same default values afterward," since the two are
    // indistinguishable from the persisted data alone. Rolling back a
    // preferences backfill in a real production incident would warrant a
    // point-in-time restore, not a blind unset; this is included primarily
    // so this migration has a symmetrical `down()` for local/dev use.
    await db.collection('users').updateMany(
      {
        'preferences.notifications.email': true,
        'preferences.notifications.push': true,
        'preferences.notifications.sms': false
      },
      { $unset: { 'preferences.notifications': '' } }
    );
  }
};
