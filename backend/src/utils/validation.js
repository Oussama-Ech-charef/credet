'use strict';

const { HttpError } = require('./errors');

const ID_PATTERN = /^\d+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = new Set(['all', 'debt', 'settled']);
const VALID_REPORT_FILTERS = new Set(['all', 'debt_only']);

function parsePositiveId(value, label = 'id') {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, `Invalid ${label}`);
  }

  return id;
}

function requireJsonObject(body) {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  return body;
}

function normalizeRequiredString(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is required and must be a string`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new HttpError(400, `${field} must not be empty`);
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  }

  return normalized;
}

function normalizeOptionalString(value, field, maxLength) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string or null`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  }

  return normalized;
}

function parseSearch(value) {
  if (value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'search must be a single string');
  }

  const normalized = value.trim();

  if (normalized.length > 100) {
    throw new HttpError(400, 'search must be at most 100 characters');
  }

  return normalized;
}

function parseStatus(value) {
  if (value === undefined) {
    return 'all';
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'status must be all, debt, or settled');
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '') {
    return 'all';
  }

  if (!VALID_STATUSES.has(normalized)) {
    throw new HttpError(400, 'status must be all, debt, or settled');
  }

  return normalized;
}

function parseReportFilter(value) {
  if (value === undefined) {
    return 'all';
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'filter must be all or debt_only');
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '') {
    return 'all';
  }

  if (!VALID_REPORT_FILTERS.has(normalized)) {
    throw new HttpError(400, 'filter must be all or debt_only');
  }

  return normalized;
}

function parseOperationType(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'operation_type must be DEBT or PAYMENT');
  }

  const normalized = value.trim().toUpperCase();

  if (normalized !== 'DEBT' && normalized !== 'PAYMENT') {
    throw new HttpError(400, 'operation_type must be DEBT or PAYMENT');
  }

  return normalized;
}

function parseDate(value, field = 'operation_date') {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format`);
  }

  const normalized = value.trim();

  if (!DATE_PATTERN.test(normalized)) {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new HttpError(400, `${field} is not a valid calendar date`);
  }

  return normalized;
}

function parseOptionalDate(value, field = 'operation_date') {
  if (value === undefined) {
    return undefined;
  }

  return parseDate(value, field);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

module.exports = {
  parsePositiveId,
  requireJsonObject,
  normalizeRequiredString,
  normalizeOptionalString,
  parseSearch,
  parseStatus,
  parseReportFilter,
  parseOperationType,
  parseDate,
  parseOptionalDate,
  hasOwn,
};
