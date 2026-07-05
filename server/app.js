const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { generalApiLimiter } = require('./middleware/rateLimiters');
const { requestId } = require('./middleware/requestId');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const { initSentry, setupSentryErrorHandler } = require('./config/sentry');

// Must run as early as possible so Sentry can instrument everything
// required afterward. A no-op when SENTRY_DSN is not configured — see
// server/config/sentry.js.
initSentry();

// Must run before any model file is require()'d (below, transitively via
// the route files) so the global toJSON virtuals option applies to every
// schema. See server/config/mongooseConfig.js for the full rationale.
const { configureMongoose } = require('./config/mongooseConfig');
configureMongoose();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const companyRoutes = require('./routes/companies');
const applicationRoutes = require('./routes/applications');
const chatRoutes = require('./routes/chats');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');

const { errorHandler } = require('./middleware/errorHandler');

/**
 * Builds and returns the configured Express application, WITHOUT binding to
 * a port or connecting to MongoDB.
 *
 * WHY this was split out of index.js: the original index.js called
 * `mongoose.connect(...)` and `server.listen(...)` as side effects of simply
 * `require()`-ing the module. That made the app impossible to import from a
 * Supertest integration test without also opening a real network port and
 * connecting to whatever MONGODB_URI happened to be set — normally the
 * developer's local database. Extracting pure app construction here lets
 * tests `require('./app')` and inject an isolated, in-memory MongoDB
 * connection (see server/tests/setup.js) while index.js remains the only
 * entrypoint that actually starts listening for real traffic.
 */
const createApp = () => {
  const app = express();

  const parseOrigins = (raw) => {
    const origins = (raw || '').split(',').map((o) => o.trim()).filter(Boolean);
    return origins.length ? origins : ['http://localhost:3000'];
  };

  const corsOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL);

  // Assigns req.id / X-Request-Id before anything else runs, so every
  // subsequent middleware and route handler can tag its log lines with it
  // (see server/middleware/requestId.js and server/utils/logger.js).
  app.use(requestId);

  // CORS configuration — deliberately registered before every middleware
  // that can short-circuit a request with an error response (rate
  // limiters below, and any route handler beyond them). `cors()` sets
  // `Access-Control-Allow-Origin` on `res` as soon as it runs; middleware
  // registered AFTER it can still send whatever status they want and the
  // header stays put. It previously sat below `generalApiLimiter`, so once
  // a client tripped the rate limit, express-rate-limit's 429 was sent
  // before `cors()` ever ran and carried no CORS headers at all. From the
  // browser this doesn't look like "429 Too Many Requests" — the response
  // is opaque, `axios` reports it as `ERR_NETWORK` with no
  // `error.response`, and the console shows "blocked by CORS policy",
  // which is not what actually happened and gives a legitimately
  // rate-limited user (or the frontend's own error handling) nothing
  // useful to act on. Reproduced directly: flooding `/api/jobs` past the
  // general limit and re-requesting showed a `429` with no
  // `Access-Control-Allow-Origin` header until this reordering.
  app.use(cors({
    origin: corsOrigins,
    credentials: true
  }));

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Rate limiting — a general ceiling across all of `/api/*`. A tighter,
  // auth-specific limiter is applied directly on the login/register routes
  // (see server/middleware/rateLimiters.js and server/routes/auth.js) since
  // brute-force/credential-stuffing risk on those endpoints warrants a
  // materially stricter budget than general API browsing.
  app.use('/api/', generalApiLimiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP access logging — previously gated on `NODE_ENV === 'development'`
  // only, meaning production had zero HTTP access logs (a real gap flagged
  // by the code-review audit's OBS-01 finding). Now runs in every
  // environment except test (noisy, and mongodb-memory-server-backed
  // integration tests don't need access logs), routed through the
  // structured logger instead of writing directly to stdout so access
  // logs land in the same JSON/rotated-file pipeline as everything else.
  // The request id is included so an access log line can be correlated
  // with the application log lines it produced.
  if (process.env.NODE_ENV !== 'test') {
    const morganFormat = process.env.NODE_ENV === 'development'
      ? 'dev'
      : ':req[x-request-id] :method :url :status :res[content-length] - :response-time ms';
    app.use(morgan(morganFormat, {
      stream: { write: (message) => logger.http(message.trim()) }
    }));
  }

  const API_PUBLIC_URL = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'SkillBridge API',
        version: '1.0.0',
        description: 'AI-Powered Job & Internship Ecosystem API'
      },
      servers: [{ url: `${API_PUBLIC_URL.replace(/\/$/, '')}/api` }]
    },
    apis: ['./server/routes/*.js']
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check endpoint.
  //
  // WHY this checks DB connectivity (not just process liveness): a health
  // check that only confirms "the Node process can respond to HTTP" will
  // report healthy even when MongoDB is unreachable — exactly the
  // condition an orchestrator (Kubernetes, Render, a load balancer) most
  // needs to detect so it can stop routing traffic to this instance or
  // trigger a restart. `mongoose.connection.readyState` is checked
  // in-process (no extra query) rather than issuing a `ping` command,
  // which is sufficient to detect "never connected" / "disconnected" /
  // "still connecting" without adding load to the database on every
  // health check.
  app.get('/api/health', (req, res) => {
    const READY_STATE_CONNECTED = 1;
    const dbConnected = mongoose.connection.readyState === READY_STATE_CONNECTED;

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'success' : 'error',
      message: dbConnected
        ? 'SkillBridge API is running'
        : 'SkillBridge API is running but the database is unreachable',
      dependencies: {
        database: dbConnected ? 'connected' : 'disconnected'
      },
      timestamp: new Date().toISOString()
    });
  });

  // Sentry's error handler must be registered after all routes but BEFORE
  // this app's own error-shaping middleware, so Sentry captures the
  // original error while `errorHandler` still owns the HTTP response shape
  // returned to the client. A no-op when SENTRY_DSN is not configured.
  setupSentryErrorHandler(app);

  // Error handling middleware (must be registered after routes)
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found'
    });
  });

  return app;
};

module.exports = { createApp };
