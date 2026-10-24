'use strict';

const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const candidateStatus = Number.isInteger(error.status)
    ? error.status
    : error.statusCode;
  let status = Number.isInteger(candidateStatus) ? candidateStatus : 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
    details = undefined;
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
    details = undefined;
  } else if (
    typeof error.code === 'string'
    && error.code.startsWith('SQLITE_CONSTRAINT')
  ) {
    status = 400;
    message = 'Database constraint violation';
    details = undefined;
  }

  if (status >= 500) {
    console.error(`[error] ${error.name || 'Error'}: ${error.message}`);

    if (config.nodeEnv !== 'production' && error.stack) {
      console.error(error.stack);
    }

    message = 'Internal server error';
    details = undefined;
  }

  const payload = { error: message };

  if (details !== undefined) {
    payload.details = details;
  }

  res.status(status).json(payload);
}

module.exports = {
  notFound,
  errorHandler,
};
