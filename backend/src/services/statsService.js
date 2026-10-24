'use strict';

const { getDb } = require('../db/database');
const { roundMoney } = require('../utils/money');

function getOverview() {
  const db = getDb();

  const balanceSummary = db
    .prepare(`
      WITH client_balances AS (
        SELECT
          c.id,
          COALESCE(
            SUM(CASE WHEN e.operation_type = 'DEBT' THEN e.amount ELSE -e.amount END),
            0
          ) AS current_balance
        FROM clients c
        LEFT JOIN credit_entries e ON e.client_id = c.id
        WHERE c.is_archived = 0
        GROUP BY c.id
      )
      SELECT
        COUNT(CASE WHEN current_balance > 0 THEN 1 END) AS total_debtors,
        COALESCE(
          SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END),
          0
        ) AS total_receivable_amount
      FROM client_balances
    `)
    .get();

  const collectedToday = db
    .prepare(`
      SELECT COALESCE(SUM(e.amount), 0) AS total_collected_today
      FROM credit_entries e
      JOIN clients c ON c.id = e.client_id
      WHERE e.operation_type = 'PAYMENT'
        AND e.operation_date = DATE('now')
        AND c.is_archived = 0
    `)
    .get();

  const recentActivity = db
    .prepare(`
      SELECT
        e.id,
        e.client_id,
        c.name AS client_name,
        e.operation_type,
        e.amount,
        e.description,
        e.operation_date,
        e.created_at
      FROM credit_entries e
      JOIN clients c ON c.id = e.client_id
      WHERE c.is_archived = 0
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT 10
    `)
    .all()
    .map((row) => ({
      id: row.id,
      client_id: row.client_id,
      client_name: row.client_name,
      operation_type: row.operation_type,
      amount: roundMoney(row.amount),
      description: row.description,
      operation_date: row.operation_date,
      created_at: row.created_at,
    }));

  return {
    total_debtors: Number(balanceSummary.total_debtors),
    total_receivable_amount: roundMoney(balanceSummary.total_receivable_amount),
    total_collected_today: roundMoney(collectedToday.total_collected_today),
    recent_activity: recentActivity,
  };
}

module.exports = { getOverview };
