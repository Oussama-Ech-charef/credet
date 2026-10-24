'use strict';

const { HttpError } = require('../utils/errors');
const {
  parsePositiveId,
  requireJsonObject,
  normalizeRequiredString,
  normalizeOptionalString,
  parseOperationType,
  parseOptionalDate,
  hasOwn,
} = require('../utils/validation');
const { parseAmount } = require('../utils/money');
const entryService = require('../services/entryService');

function listEntries(req, res) {
  const clientId = parsePositiveId(req.params.clientId, 'client id');
  const from = parseOptionalDate(req.query.from, 'from');
  const to = parseOptionalDate(req.query.to, 'to');

  res.json(entryService.listEntries(clientId, { from, to }));
}

function createEntry(req, res) {
  const clientId = parsePositiveId(req.params.clientId, 'client id');
  const body = requireJsonObject(req.body);

  const result = entryService.createEntry(clientId, {
    operation_type: parseOperationType(body.operation_type),
    amount: parseAmount(body.amount, 'amount'),
    description: normalizeRequiredString(body.description, 'description', 500),
    operation_date: parseOptionalDate(body.operation_date, 'operation_date'),
    note: normalizeOptionalString(body.note, 'note', 2000),
  });

  res.status(201).json({ ...result.entry, ...result.balance });
}

function updateEntry(req, res) {
  const id = parsePositiveId(req.params.id, 'entry id');
  const body = requireJsonObject(req.body);
  const input = {};

  if (hasOwn(body, 'operation_type')) {
    input.operation_type = parseOperationType(body.operation_type);
  }

  if (hasOwn(body, 'amount')) {
    input.amount = parseAmount(body.amount, 'amount');
  }

  if (hasOwn(body, 'description')) {
    input.description = normalizeRequiredString(body.description, 'description', 500);
  }

  if (hasOwn(body, 'operation_date')) {
    input.operation_date = parseOptionalDate(body.operation_date, 'operation_date');
  }

  if (hasOwn(body, 'note')) {
    input.note = normalizeOptionalString(body.note, 'note', 2000);
  }

  if (Object.keys(input).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  const result = entryService.updateEntry(id, input);

  res.json({
    success: true,
    ...result.entry,
    ...result.balance,
  });
}

function deleteEntry(req, res) {
  const id = parsePositiveId(req.params.id, 'entry id');
  const result = entryService.deleteEntry(id);

  res.json({
    success: true,
    client_id: result.client_id,
    ...result.balance,
  });
}

module.exports = {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
};
