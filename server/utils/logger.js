const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Structured application logger (winston).
 *
 * WHY this exists: logging was previously `console.log`/`console.error`
 * scattered across `index.js`, `pushNotifications.js`, `sendEmail.js`,
 * `socketHandlers.js`, and `seedData.js` — no log levels, no consistent
 * structure, and nothing durable beyond whatever the process's stdout
 * happens to be captured by. That makes production debugging effectively
 * "grep the terminal scrollback," which doesn't survive a process
 * restart and can't be filtered/queried by severity.
 *
 * Design choices:
 *   - JSON output in production (machine-parseable, ready to ship to a log
 *     aggregator — e.g. CloudWatch, Datadog, ELK — without reformatting),
 *     human-readable colorized output in development.
 *   - Log level configurable via `LOG_LEVEL` (defaults to 'info' in
 *     production, 'debug' in development) so verbosity can be tuned per
 *     environment without a code change.
 *   - A rotated file target (`logs/error.log`, `logs/combined.log`) in
 *     addition to the console, so logs survive a process restart even
 *     without an external aggregator wired up yet — the minimum viable
 *     "we can debug this after the fact" guarantee for a portfolio-scale
 *     deployment. Size-based rotation (5MB, 5 files) bounds disk usage
 *     without requiring an extra rotation package.
 *   - Every log call goes through `logger.<level>(message, meta)` where
 *     `meta` can carry a `requestId` (see server/middleware/requestId.js)
 *     to correlate a single request's log lines across async operations —
 *     the "debug this at 3am" property the code-review audit specifically
 *     called out as missing.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logsDir = path.join(__dirname, '..', '..', 'logs');

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const humanReadableFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${stack || message}${metaString}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: isProduction ? jsonFormat : humanReadableFormat,
    // Silence the console entirely during automated test runs so Jest
    // output stays readable; the file transports below are also disabled
    // in test (no value in writing log files during a CI test run).
    silent: isTest
  })
];

if (!isTest) {
  // winston's File transport does not create its parent directory — it
  // throws ENOENT on first write otherwise. Ensure it exists up front.
  fs.mkdirSync(logsDir, { recursive: true });

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports,
  // Never let a logging failure crash the process — logging is a
  // side-effect, not a critical-path dependency.
  exitOnError: false
});

module.exports = logger;
