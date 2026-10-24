'use strict';

const { asyncHandler } = require('../utils/asyncHandler');
const backupService = require('../services/backupService');

const downloadDatabase = asyncHandler(async (req, res, next) => {
  const { temporaryDirectory, snapshotPath } = await backupService.createDatabaseSnapshot();
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    await backupService.removeDatabaseSnapshot(temporaryDirectory);
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/octet-stream');

  try {
    res.download(snapshotPath, 'credet.db', (error) => {
      cleanup().catch(() => {
        // The response has already been produced; a stale temp file is not
        // worth turning a successful download into an error.
      });

      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    await cleanup();
    throw error;
  }
});

function exportJson(req, res) {
  const payload = backupService.getJsonExport();
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="credet-backup-${date}.json"`,
  );
  res.json(payload);
}

module.exports = {
  downloadDatabase,
  exportJson,
};
