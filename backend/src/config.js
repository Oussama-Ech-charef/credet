'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

function resolveDatabasePath(rawPath) {
  if (!rawPath) {
    return path.join(backendRoot, 'data', 'credet.db');
  }

  if (rawPath === ':memory:') {
    return rawPath;
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(backendRoot, rawPath);
}

function parsePort(rawPort) {
  const value = String(rawPort ?? '4000').trim();

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}

const config = {
  backendRoot,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  databasePath: resolveDatabasePath(process.env.DB_PATH),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
