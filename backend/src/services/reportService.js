'use strict';

const { getDb } = require('../db/database');
const { HttpError } = require('../utils/errors');
const { roundMoney } = require('../utils/money');
const clientService = require('./clientService');
const entryService = require('./entryService');
const settingsService = require('./settingsService');

const CASABLANCA_TIME_ZONE = 'Africa/Casablanca';

function toCents(value) {
  return Math.round(Number(value) * 100);
}

function fromCents(cents) {
  return roundMoney(cents / 100);
}

function sumMoney(values) {
  return fromCents(
    values.reduce((total, value) => total + toCents(value), 0),
  );
}

/**
 * Build the timestamp shown on generated documents. Morocco is the target
 * market, so the document clock is fixed to Africa/Casablanca rather than the
 * host time zone. The filename-safe stamp is also derived from that clock.
 */
function getGeneratedAt(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CASABLANCA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const lookup = (type) => parts.find((part) => part.type === type)?.value || '';
  const day = lookup('day');
  const month = lookup('month');
  const year = lookup('year');
  const hour = lookup('hour');
  const minute = lookup('minute');

  return {
    display: `${day}/${month}/${year} - ${hour}:${minute}`,
    dateStamp: `${year}${month}${day}`,
    iso: now.toISOString(),
  };
}

function getShopSettings() {
  return settingsService.getShopSettings();
}

function getClientStatement(clientId, { from, to } = {}) {
  if (from && to && from > to) {
    throw new HttpError(400, 'from must be before or equal to to');
  }

  const detail = clientService.getClient(clientId);
  const entries = entryService.listEntries(clientId, { from, to });
  const generated = getGeneratedAt();

  return {
    shop: getShopSettings(),
    generated,
    statementNumber: `CS-${clientId}-${generated.dateStamp}`,
    client: detail.client,
    totals: {
      total_debt: detail.total_debt,
      total_paid: detail.total_paid,
      current_balance: detail.current_balance,
    },
    entries,
    range: {
      from: from || null,
      to: to || null,
    },
  };
}

function getGeneralReport({ filter = 'all' } = {}) {
  const status = filter === 'debt_only' ? 'debt' : 'all';
  const clients = clientService.listClients({ status });

  clients.sort((left, right) => {
    const balanceDifference = right.current_balance - left.current_balance;

    if (balanceDifference !== 0) {
      return balanceDifference;
    }

    return left.name.localeCompare(right.name, 'ar');
  });

  const debtorCount = clients.filter(
    (client) => client.current_balance > 0,
  ).length;
  const settledCount = clients.length - debtorCount;
  const totalDebt = sumMoney(clients.map((client) => client.total_debt));
  const totalPaid = sumMoney(clients.map((client) => client.total_paid));
  const totalReceivable = sumMoney(
    clients
      .filter((client) => client.current_balance > 0)
      .map((client) => client.current_balance),
  );
  const generated = getGeneratedAt();

  return {
    shop: getShopSettings(),
    generated,
    reportNumber: `GR-${generated.dateStamp}`,
    filter,
    filterLabel: filter === 'debt_only'
      ? 'العملاء المدينون فقط'
      : 'جميع العملاء النشطين',
    filterNote: filter === 'debt_only'
      ? 'يعرض هذا التقرير العملاء الذين عليهم رصيد مستحق فقط. الحسابات المسددة والأرصدة الدائنة غير مدرجة.'
      : 'يعرض هذا التقرير جميع العملاء النشطين، بما في ذلك الحسابات المسددة والأرصدة الدائنة لصالح العميل.',
    clients,
    totals: {
      client_count: clients.length,
      debtor_count: debtorCount,
      settled_count: settledCount,
      total_debt: totalDebt,
      total_paid: totalPaid,
      total_receivable: totalReceivable,
    },
  };
}

function getEntryReceipt(entryId) {
  const row = getDb()
    .prepare(`
      SELECT
        e.id,
        e.client_id,
        e.operation_type,
        e.amount,
        e.description,
        e.operation_date,
        e.note,
        e.created_at,
        e.updated_at,
        c.name AS client_name,
        c.phone AS client_phone,
        c.address AS client_address
      FROM credit_entries e
      JOIN clients c ON c.id = e.client_id
      WHERE e.id = ? AND c.is_archived = 0
    `)
    .get(entryId);

  if (!row) {
    throw new HttpError(404, 'Entry not found');
  }

  const balanceAfter = getDb()
    .prepare(`
      SELECT COALESCE(
        SUM(CASE WHEN operation_type = 'DEBT' THEN amount ELSE -amount END),
        0
      ) AS balance
      FROM credit_entries
      WHERE client_id = ?
        AND (operation_date < ? OR (operation_date = ? AND id <= ?))
    `)
    .get(
      row.client_id,
      row.operation_date,
      row.operation_date,
      row.id,
    ).balance;

  const generated = getGeneratedAt();

  return {
    shop: getShopSettings(),
    generated,
    receiptNumber: `RC-${row.id}-${generated.dateStamp}`,
    client: {
      id: row.client_id,
      name: row.client_name,
      phone: row.client_phone,
      address: row.client_address,
    },
    entry: {
      id: row.id,
      operation_type: row.operation_type,
      amount: roundMoney(row.amount),
      description: row.description,
      operation_date: row.operation_date,
      note: row.note,
      created_at: row.created_at,
    },
    balance_after: roundMoney(balanceAfter),
  };
}

module.exports = {
  getGeneratedAt,
  getShopSettings,
  getClientStatement,
  getGeneralReport,
  getEntryReceipt,
};
