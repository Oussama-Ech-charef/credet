'use strict';

const config = require('./config');
const { initDatabase, closeDatabase } = require('./db/database');
const app = require('./app');

initDatabase();

const server = app.listen(config.port, () => {
  console.log(`Credet backend listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databasePath}`);
});

server.on('error', (error) => {
  console.error(`[startup] ${error.message}`);
  closeDatabase();
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[shutdown] ${signal} received`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout');
    closeDatabase();
    process.exit(1);
  }, 10000);

  forceExit.unref();

  server.close((error) => {
    clearTimeout(forceExit);
    closeDatabase();

    if (error) {
      console.error(`[shutdown] ${error.message}`);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
