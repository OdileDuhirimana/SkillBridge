const mongoose = require('mongoose');

/**
 * Persisted, queryable audit trail for sensitive state changes.
 *
 * WHY this exists: both audits of this project flagged the same gap
 * (SEC-06/SEC-08): role/permission changes and application status
 * transitions were only ever visible in `console.log`/structured logs —
 * not durable, not queryable, and rotated/lost along with regular
 * application logs. A security-relevant question like "who changed this
 * application's status, and when, and what was it before?" had no answer
 * beyond grepping log files (if they still existed). This model gives
 * those events a permanent, indexed, queryable home independent of the
 * general logging pipeline.
 *
 * Design notes:
 *   - `before`/`after` are intentionally loosely-typed (`Mixed`) snapshots
 *     of only the field(s) that changed, not the full document — logging
 *     an entire Application or Company document on every change would
 *     bloat this collection for no investigative benefit over the
 *     specific field that actually changed.
 *   - Entries are immutable by convention (no update routes are wired to
 *     this model) — an audit log that can be edited after the fact is not
 *     trustworthy as an audit log.
 *   - Write failures here are non-fatal to the primary action (see
 *     server/utils/auditLog.js) — the same "side effect must not block
 *     the core action" pattern already used for push notifications and
 *     email in this codebase. This is a deliberate availability/
 *     durability tradeoff: an audit log entry that occasionally fails to
 *     write is better than an application-status update that can fail
 *     because a logging table had a transient issue.
 */
const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'An audit log entry must record who performed the action']
  },
  action: {
    type: String,
    required: [true, 'An audit log entry must record what action occurred'],
    enum: [
      'application_status_changed',
      'company_team_member_added',
      'company_team_member_removed',
      'company_team_member_role_changed',
      'user_role_changed'
    ]
  },
  targetType: {
    type: String,
    required: [true, 'An audit log entry must record what kind of resource was affected'],
    enum: ['Application', 'Company', 'User']
  },
  targetId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'An audit log entry must record which resource was affected']
  },
  // Snapshot of only the field(s) that changed — see file-level comment.
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// The two access patterns this model exists to serve: "show me everything
// that happened to this specific resource" and "show me everything a given
// actor has done" — both ordered most-recent-first.
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
