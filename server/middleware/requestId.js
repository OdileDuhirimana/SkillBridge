const crypto = require('crypto');

/**
 * Attaches a unique id to every incoming request (`req.id`), echoed back on
 * the `X-Request-Id` response header.
 *
 * WHY this exists: with plain `console.log`/`console.error`, there was no
 * way to correlate the several log lines a single request can produce
 * (e.g. "validation passed" -> "db query" -> "notification sent" ->
 * "response sent") back to that one request, especially under concurrent
 * traffic where log lines from different requests interleave. Tagging
 * every log call for a request with the same id (see server/utils/logger.js
 * and its usage in controllers/middleware) turns a wall of interleaved
 * log lines into something `grep`-able per request — the concrete,
 * practical difference between "it works" and "we can debug it in
 * production," as called out in the code-review audit's Testing/
 * Observability findings.
 *
 * If the client (or an upstream proxy/load balancer) already supplied an
 * `X-Request-Id`, it is honored rather than overwritten, so request ids
 * stay consistent end-to-end across services in a real deployment.
 */
const requestId = (req, res, next) => {
  req.id = req.get('X-Request-Id') || crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

module.exports = { requestId };
