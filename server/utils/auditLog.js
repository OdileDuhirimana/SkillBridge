const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Records a persisted audit log entry (see server/models/AuditLog.js for
 * the full rationale). Fail-open by design: a failure to write an audit
 * entry is logged but never thrown, so a transient issue with the audit
 * log collection cannot block the primary action (e.g. updating an
 * application's status) that triggered it — the same non-blocking
 * side-effect pattern already used for `sendEmail`/`sendPushNotification`
 * in this codebase.
 *
 * @param {object} entry
 * @param {string} entry.actorId - id of the User who performed the action.
 * @param {string} entry.action - one of AuditLog's `action` enum values.
 * @param {'Application'|'Company'|'User'} entry.targetType
 * @param {string} entry.targetId - id of the affected resource.
 * @param {*} [entry.before] - the field(s) that changed, before the change.
 * @param {*} [entry.after] - the field(s) that changed, after the change.
 * @param {object} [entry.metadata] - any additional context worth recording.
 */
const recordAuditLog = async ({ actorId, action, targetType, targetId, before, after, metadata }) => {
  try {
    await AuditLog.create({
      actor: actorId,
      action,
      targetType,
      targetId,
      before,
      after,
      metadata
    });
  } catch (error) {
    logger.error('Failed to write audit log entry', {
      error: error.message,
      stack: error.stack,
      action,
      targetType,
      targetId
    });
  }
};

module.exports = { recordAuditLog };
