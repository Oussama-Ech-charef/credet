'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('../config');

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

let db = null;
let activeDatabasePath = null;

/**
 * Open the SQLite database, enable the safety pragmas, and apply the schema.
 * The function is idempotent for the same path so scripts and the server can
 * safely share one connection.
 */
function initDatabase(databasePath = config.databasePath) {
  if (db) {
    if (activeDatabasePath !== databasePath) {
      throw new Error('Database is already initialized with a different path');
    }
    return db;
  }

  const isMemoryDatabase = databasePath === ':memory:';

  if (!isMemoryDatabase) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const connection = new Database(databasePath);

  try {
    const journalMode = connection.pragma('journal_mode = WAL', { simple: true });

    if (!isMemoryDatabase && String(journalMode).toLowerCase() !== 'wal') {
      throw new Error(`WAL mode could not be enabled (journal_mode=${journalMode})`);
    }

    connection.pragma('foreign_keys = ON');
    connection.pragma('synchronous = NORMAL');
    connection.pragma('busy_timeout = 5000');

    const foreignKeys = connection.pragma('foreign_keys', { simple: true });
    if (Number(foreignKeys) !== 1) {
      throw new Error('Foreign key enforcement could not be enabled');
    }

    const applySchema = connection.transaction(() => {
      connection.exec(schemaSql);
      connection.prepare('INSERT OR IGNORE INTO app_settings (id) VALUES (1)').run();
    });

    applySchema();
  } catch (error) {
    connection.close();
    throw error;
  }

  db = connection;
  activeDatabasePath = databasePath;
  return db;
}

function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

function getDatabasePath() {
  return activeDatabasePath;
}

function closeDatabase() {
  if (!db) {
    return;
  }

  const connection = db;
  db = null;
  activeDatabasePath = null;

  try {
    connection.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // A checkpoint can fail while another connection is reading. Closing the
    // connection is still safe: SQLite recovers committed data from the WAL.
  }

  connection.close();
}

module.exports = {
  initDatabase,
  getDb,
  getDatabasePath,
  closeDatabase,
};
