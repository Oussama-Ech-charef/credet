'use strict';

const { HttpError } = require('./errors');

const MAX_AMOUNT_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
const AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/;

/**
 * Parse a monetary value and round it to two decimal places using decimal
 * string arithmetic (half-up). This avoids the rounding surprises that come
 * from multiplying binary floating point values by 100.
 */
function parseAmount(value, field = 'amount') {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a positive number`);
  }

  const raw = String(value).trim();

  if (!AMOUNT_PATTERN.test(raw)) {
    throw new HttpError(400, `${field} must be a positive number`);
  }

  const [wholePart, fractionPart = ''] = raw.split('.');
  const whole = BigInt(wholePart);
  const firstTwoDigits = (fractionPart + '00').slice(0, 2);
  const thirdDigit = fractionPart.length > 2 ? Number(fractionPart[2]) : 0;

  let cents = whole * 100n + BigInt(firstTwoDigits);

  if (thirdDigit >= 5) {
    cents += 1n;
  }

  if (cents <= 0n) {
    throw new HttpError(400, `${field} must be at least 0.01`);
  }

  if (cents > MAX_AMOUNT_CENTS) {
    throw new HttpError(400, `${field} is too large`);
  }

  return Number(cents) / 100;
}

/**
 * Round a value read from SQLite (or computed in JavaScript) to two decimals.
 * Non-finite values are treated as zero.
 */
function roundMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const rounded = Number(number.toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

module.exports = { parseAmount, roundMoney };
