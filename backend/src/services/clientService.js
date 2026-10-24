'use strict';

const { getDb } = require('../db/database');
const { HttpError } = require('../utils/errors');
const { roundMoney } = require('../utils/money');
const { escapeLike } = require('../utils/sql');

const CLIENT_COLUMNS = `
  c.id,
  c.name,
  c.phone,
  c.address,
  c.notes,
  c.is_archived,
  c.created_at,
  c.updated_at
`;

const BALANCE_COLUMNS = `
  COALESCE(SUM(CASE WHEN e.operation_type = 'DEBT' THEN e.amount ELSE 0 END), 0) AS total_debt,
  COALESCE(SUM(CASE WHEN e.operation_type = 'PAYMENT' THEN e.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN e.operation_type = 'DEBT' THEN e.amount ELSE -e.amount END), 0) AS current_balance,
  COUNT(e.id) AS entries_count,
  MAX(e.operation_date) AS last_operation_date
`;

const CLIENT_WITH_BALANCE = `
  SELECT ${CLIENT_COLUMNS}, ${BALANCE_COLUMNS}
  FROM clients c
  LEFT JOIN credit_entries e ON e.client_id = c.id
`;

function mapBaseClient(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBalance(row) {
  return {
    total_debt: roundMoney(row.total_debt),
    total_paid: roundMoney(row.total_paid),
    current_balance: roundMoney(row.current_balance),
  };
}

function mapClientWithBalance(row) {
  return {
    ...mapBaseClient(row),
    ...mapBalance(row),
    entries_count: Number(row.entries_count),
    last_operation_date: row.last_operation_date || null,
  };
}

function findActiveClientRow(id) {
  return getDb()
    .prepare('SELECT * FROM clients WHERE id = ? AND is_archived = 0')
    .get(id);
}

function findClientWithBalance(id) {
  return getDb()
    .prepare(`${CLIENT_WITH_BALANCE} WHERE c.id = ? AND c.is_archived = 0 GROUP BY c.id`)
    .get(id);
}

function listClients({ search = '', status = 'all' } = {}) {
  const conditions = ['c.is_archived = 0'];
  const parameters = [];

  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(`(
      c.name LIKE ? ESCAPE '\\'
      OR c.phone LIKE ? ESCAPE '\\'
      OR c.address LIKE ? ESCAPE '\\'
    )`);
    parameters.push(pattern, pattern, pattern);
  }

  let havingClause = '';

  if (status === 'debt') {
    havingClause = 'HAVING current_balance > 0';
  } else if (status === 'settled') {
    havingClause = 'HAVING current_balance <= 0';
  }

  const rows = getDb()
    .prepare(`
      ${CLIENT_WITH_BALANCE}
      WHERE ${conditions.join(' AND ')}
      GROUP BY c.id
      ${havingClause}
      ORDER BY c.name COLLATE NOCASE ASC, c.id ASC
    `)
    .all(...parameters);

  return rows.map(mapClientWithBalance);
}

function getClient(id) {
  const row = findClientWithBalance(id);

  if (!row) {
    throw new HttpError(404, 'Client not found');
  }

  return {
    client: {
      ...mapBaseClient(row),
      entries_count: Number(row.entries_count),
      last_operation_date: row.last_operation_date || null,
    },
    ...mapBalance(row),
  };
}

function createClient(input) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO clients (name, phone, address, notes) VALUES (?, ?, ?, ?)')
    .run(
      input.name,
      input.phone ?? null,
      input.address ?? null,
      input.notes ?? null,
    );

  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  return mapBaseClient(row);
}

function updateClient(id, input) {
  const db = getDb();

  const transaction = db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM clients WHERE id = ? AND is_archived = 0')
      .get(id);

    if (!existing) {
      throw new HttpError(404, 'Client not found');
    }

    const fields = [];
    const values = [];

    for (const field of ['name', 'phone', 'address', 'notes']) {
      if (input[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(input[field]);
      }
    }

    if (fields.length === 0) {
      throw new HttpError(400, 'At least one field is required');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);

    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  });

  return mapBaseClient(transaction());
}

function deleteClient(id) {
  const db = getDb();

  const transaction = db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM clients WHERE id = ? AND is_archived = 0')
      .get(id);

    if (!existing) {
      throw new HttpError(404, 'Client not found');
    }

    const entryCount = db
      .prepare('SELECT COUNT(*) AS count FROM credit_entries WHERE client_id = ?')
      .get(id).count;

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);

    return {
      id,
      deleted_entries: Number(entryCount),
    };
  });

  return transaction();
}

module.exports = {
  findActiveClientRow,
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
};
