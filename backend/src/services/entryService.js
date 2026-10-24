'use strict';

const { getDb } = require('../db/database');
const { HttpError } = require('../utils/errors');
const { roundMoney } = require('../utils/money');
const { findActiveClientRow } = require('./clientService');

const ENTRY_COLUMNS = `
  id,
  client_id,
  operation_type,
  amount,
  description,
  operation_date,
  note,
  created_at,
  updated_at
`;

function mapEntry(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    operation_type: row.operation_type,
    amount: roundMoney(row.amount),
    description: row.description,
    operation_date: row.operation_date,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function ensureActiveClient(clientId) {
  const client = findActiveClientRow(clientId);

  if (!client) {
    throw new HttpError(404, 'Client not found');
  }

  return client;
}

function getBalance(clientId) {
  const row = getDb()
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN operation_type = 'DEBT' THEN amount ELSE 0 END), 0) AS total_debt,
        COALESCE(SUM(CASE WHEN operation_type = 'PAYMENT' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN operation_type = 'DEBT' THEN amount ELSE -amount END), 0) AS current_balance
      FROM credit_entries
      WHERE client_id = ?
    `)
    .get(clientId);

  return {
    total_debt: roundMoney(row.total_debt),
    total_paid: roundMoney(row.total_paid),
    current_balance: roundMoney(row.current_balance),
  };
}

function listEntries(clientId, { from, to } = {}) {
  ensureActiveClient(clientId);

  if (from && to && from > to) {
    throw new HttpError(400, 'from must be before or equal to to');
  }

  const conditions = ['client_id = ?'];
  const parameters = [clientId];

  if (from) {
    conditions.push('operation_date >= ?');
    parameters.push(from);
  }

  if (to) {
    conditions.push('operation_date <= ?');
    parameters.push(to);
  }

  const rows = getDb()
    .prepare(`
      SELECT ${ENTRY_COLUMNS}
      FROM credit_entries
      WHERE ${conditions.join(' AND ')}
      ORDER BY operation_date ASC, id ASC
    `)
    .all(...parameters);

  return rows.map(mapEntry);
}

function createEntry(clientId, input) {
  const db = getDb();

  const transaction = db.transaction(() => {
    ensureActiveClient(clientId);

    const result = db
      .prepare(`
        INSERT INTO credit_entries (
          client_id,
          operation_type,
          amount,
          description,
          operation_date,
          note
        )
        VALUES (?, ?, ?, ?, COALESCE(?, DATE('now')), ?)
      `)
      .run(
        clientId,
        input.operation_type,
        input.amount,
        input.description,
        input.operation_date ?? null,
        input.note ?? null,
      );

    const entry = db
      .prepare(`SELECT ${ENTRY_COLUMNS} FROM credit_entries WHERE id = ?`)
      .get(result.lastInsertRowid);

    return {
      entry: mapEntry(entry),
      balance: getBalance(clientId),
    };
  });

  return transaction();
}

function updateEntry(id, input) {
  const db = getDb();

  const transaction = db.transaction(() => {
    const existing = db
      .prepare('SELECT * FROM credit_entries WHERE id = ?')
      .get(id);

    if (!existing) {
      throw new HttpError(404, 'Entry not found');
    }

    ensureActiveClient(existing.client_id);

    const fields = [];
    const values = [];

    for (const field of ['operation_type', 'amount', 'description', 'operation_date', 'note']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(input[field]);
      }
    }

    if (fields.length === 0) {
      throw new HttpError(400, 'At least one field is required');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE credit_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);

    const entry = db
      .prepare(`SELECT ${ENTRY_COLUMNS} FROM credit_entries WHERE id = ?`)
      .get(id);

    return {
      entry: mapEntry(entry),
      balance: getBalance(existing.client_id),
    };
  });

  return transaction();
}

function deleteEntry(id) {
  const db = getDb();

  const transaction = db.transaction(() => {
    const existing = db
      .prepare('SELECT * FROM credit_entries WHERE id = ?')
      .get(id);

    if (!existing) {
      throw new HttpError(404, 'Entry not found');
    }

    ensureActiveClient(existing.client_id);

    db.prepare('DELETE FROM credit_entries WHERE id = ?').run(id);

    return {
      client_id: existing.client_id,
      balance: getBalance(existing.client_id),
    };
  });

  return transaction();
}

module.exports = {
  getBalance,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
};
