'use strict';

const config = require('./config');
const { initDatabase, closeDatabase } = require('./db/database');
const pdfService = require('./services/pdfService');
const app = require('./app');

initDatabase();

const server = app.listen(config.port, () => {
  console.log(`Credet backend listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databasePath}`);

  pdfService.warmUpPdfEngine().catch((error) => {
    console.error(`[pdf] Warm-up failed: ${error.message}`);
  });
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

  server.close(async (error) => {
    try {
      try {
        await pdfService.closePdfEngine();
      } catch (closeError) {
        console.error(`[shutdown] PDF engine: ${closeError.message}`);
      }

      closeDatabase();
    } finally {
      clearTimeout(forceExit);
    }

    if (error) {
      console.error(`[shutdown] ${error.message}`);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
