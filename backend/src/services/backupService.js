'use strict';

const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const { getDb } = require('../db/database');

async function createDatabaseSnapshot() {
  const temporaryDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), 'credet-backup-'));
  const snapshotPath = path.join(temporaryDirectory, 'credet.db');

  try {
    await getDb().backup(snapshotPath);
    return { temporaryDirectory, snapshotPath };
  } catch (error) {
    await fsp.rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function removeDatabaseSnapshot(temporaryDirectory) {
  await fsp.rm(temporaryDirectory, { recursive: true, force: true });
}

function getJsonExport() {
  const db = getDb();

  return {
    clients: db.prepare('SELECT * FROM clients ORDER BY id ASC').all(),
    entries: db.prepare('SELECT * FROM credit_entries ORDER BY id ASC').all(),
  };
}

module.exports = {
  createDatabaseSnapshot,
  removeDatabaseSnapshot,
  getJsonExport,
};
