'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function buildCorsOptions(originValue) {
  if (!originValue || originValue === '*') {
    return { origin: '*' };
  }

  const origins = originValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    return { origin: '*' };
  }

  return { origin: origins };
}

const app = express();

app.disable('x-powered-by');
app.use(cors(buildCorsOptions(config.corsOrigin)));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
