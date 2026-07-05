const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { createApp } = require('./app');
const { setupSocketHandlers } = require('./socket/socketHandlers');
const logger = require('./utils/logger');

const app = createApp();

const parseOrigins = (raw) => {
  const origins = (raw || '').split(',').map((o) => o.trim()).filter(Boolean);
  return origins.length ? origins : ['http://localhost:3000'];
};

const corsOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST']
  }
});

// Reconnect handling: log connectivity loss after a successful initial
// connect so operators have visibility into a dropped connection mid-flight.
// Mongoose's default driver behavior already retries the underlying socket;
// this only adds observability, not new reconnect logic.
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

const PORT = process.env.PORT || 5000;

/**
 * Connects to MongoDB, waits for every registered model's indexes
 * (including the `$text` indexes on Job/Company — see
 * server/controllers/jobController.js's `buildJobQuery`) to finish
 * building, THEN starts accepting HTTP traffic.
 *
 * WHY this order matters: Mongoose's `autoIndex` (on by default outside
 * production) builds indexes in the background as a side effect of
 * `mongoose.connect()` — it does not block on them. Previously,
 * `server.listen()` ran immediately after calling `mongoose.connect()`
 * (not even after it resolved), so the server could start accepting
 * requests, including a `$text` search, before MongoDB had finished
 * building the text index that query depends on. That surfaces as a real
 * `MongoServerError: text index required for $text query` — not a
 * hypothetical: it reproduced consistently in `e2e/` runs, where a fresh
 * database + an immediate search request is exactly the sequence a
 * production rolling deploy against a freshly-migrated database could
 * also hit. Awaiting `Model.init()` for every model (a no-op if indexes
 * are already built, e.g. in production with `autoIndex` disabled and
 * `server/migrations/` already having created them) closes this race
 * without changing behavior for the common case.
 */
const start = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillbridge');
  logger.info('MongoDB connected successfully');

  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
  logger.debug('All model indexes confirmed built');

  setupSocketHandlers(io);

  server.listen(PORT, () => {
    logger.info(`SkillBridge server running on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development'
    });
  });
};

start().catch((err) => {
  logger.error('Server startup failed', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };
