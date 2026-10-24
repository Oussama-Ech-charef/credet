'use strict';

const { HttpError } = require('../utils/errors');
const {
  requireJsonObject,
  normalizeRequiredString,
  normalizeOptionalString,
  hasOwn,
} = require('../utils/validation');
const settingsService = require('../services/settingsService');

function getSettings(req, res) {
  res.json(settingsService.getSettings());
}

function updateSettings(req, res) {
  const body = requireJsonObject(req.body);
  const input = {};

  if (hasOwn(body, 'shop_name')) {
    input.shop_name = normalizeRequiredString(body.shop_name, 'shop_name', 120);
  }

  if (hasOwn(body, 'shop_phone')) {
    input.shop_phone = normalizeOptionalString(body.shop_phone, 'shop_phone', 40) ?? '';
  }

  if (hasOwn(body, 'currency')) {
    input.currency = normalizeRequiredString(body.currency, 'currency', 10);
  }

  if (Object.keys(input).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  res.json({
    success: true,
    settings: settingsService.updateSettings(input),
  });
}

module.exports = {
  getSettings,
  updateSettings,
};
