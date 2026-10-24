'use strict';

const { getDb } = require('../db/database');
const { HttpError } = require('../utils/errors');

const SETTINGS_COLUMNS = 'shop_name, shop_phone, currency, updated_at';

function readSettingsRow() {
  return getDb()
    .prepare(`SELECT ${SETTINGS_COLUMNS} FROM app_settings WHERE id = 1`)
    .get();
}

function mapSettings(row) {
  return {
    shop_name: String(row?.shop_name || '').trim() || 'Credet Shop',
    shop_phone: String(row?.shop_phone || '').trim(),
    currency: String(row?.currency || '').trim() || 'DH',
    updated_at: row?.updated_at || null,
  };
}

function getSettings() {
  return mapSettings(readSettingsRow());
}

/**
 * The PDF templates use a compact shop shape. Keeping this mapping here means
 * the report engine and the settings screen always read the same source row.
 */
function getShopSettings() {
  const settings = getSettings();

  return {
    name: settings.shop_name,
    phone: settings.shop_phone,
    currency: settings.currency,
  };
}

function updateSettings(input) {
  const db = getDb();
  const fields = [];
  const values = [];

  for (const field of ['shop_name', 'shop_phone', 'currency']) {
    if (input[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(input[field]);
    }
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  const result = db
    .prepare(`UPDATE app_settings SET ${fields.join(', ')} WHERE id = 1`)
    .run(...values);

  if (result.changes === 0) {
    throw new HttpError(404, 'Settings not found');
  }

  return getSettings();
}

module.exports = {
  getSettings,
  getShopSettings,
  updateSettings,
};
