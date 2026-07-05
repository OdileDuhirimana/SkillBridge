const logger = require('../utils/logger');

/**
 * Centralized error-handling middleware.
 *
 * Standardized response shape (applies to every error path across the API,
 * including the 4xx "expected" responses controllers build manually):
 *   { success: false, message: string, errors?: any[] }
 *
 * Previously, controllers that caught their own errors returned
 * `{ success: false, message }` while anything reaching this handler
 * returned `{ success: false, error }` — two different envelopes for the
 * same failure class. This handler now emits `message` so API consumers
 * (including the client's apiService/authService) only ever need to read
 * one field, regardless of whether the error was thrown or handled locally.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Log the original error for observability, tagged with the request id
  // (see server/middleware/requestId.js) so this line can be correlated
  // with the rest of that request's log output; the client only ever sees
  // the sanitized message below.
  logger.error(err.message || 'Unhandled error', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    stack: err.stack
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
