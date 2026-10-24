'use strict';

const { HttpError } = require('../utils/errors');
const {
  parsePositiveId,
  requireJsonObject,
  normalizeRequiredString,
  normalizeOptionalString,
  parseSearch,
  parseStatus,
  hasOwn,
} = require('../utils/validation');
const clientService = require('../services/clientService');

function listClients(req, res) {
  const search = parseSearch(req.query.search);
  const status = parseStatus(req.query.status);

  res.json(clientService.listClients({ search, status }));
}

function getClient(req, res) {
  const id = parsePositiveId(req.params.id, 'client id');
  res.json(clientService.getClient(id));
}

function createClient(req, res) {
  const body = requireJsonObject(req.body);

  const client = clientService.createClient({
    name: normalizeRequiredString(body.name, 'name', 150),
    phone: normalizeOptionalString(body.phone, 'phone', 40),
    address: normalizeOptionalString(body.address, 'address', 300),
    notes: normalizeOptionalString(body.notes, 'notes', 2000),
  });

  res.status(201).json(client);
}

function updateClient(req, res) {
  const id = parsePositiveId(req.params.id, 'client id');
  const body = requireJsonObject(req.body);
  const input = {};

  if (hasOwn(body, 'name')) {
    input.name = normalizeRequiredString(body.name, 'name', 150);
  }

  if (hasOwn(body, 'phone')) {
    input.phone = normalizeOptionalString(body.phone, 'phone', 40);
  }

  if (hasOwn(body, 'address')) {
    input.address = normalizeOptionalString(body.address, 'address', 300);
  }

  if (hasOwn(body, 'notes')) {
    input.notes = normalizeOptionalString(body.notes, 'notes', 2000);
  }

  if (Object.keys(input).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  const client = clientService.updateClient(id, input);
  res.json({ success: true, client });
}

function deleteClient(req, res) {
  const id = parsePositiveId(req.params.id, 'client id');
  const result = clientService.deleteClient(id);

  res.json({ success: true, ...result });
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
};
