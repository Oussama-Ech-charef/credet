'use strict';

const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const {
  parsePositiveId,
  parseOptionalDate,
  parseReportFilter,
} = require('../utils/validation');
const pdfService = require('../services/pdfService');

function sendPdf(res, { buffer, filename }) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).end(buffer);
}

const clientStatementPdf = asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id, 'client id');
  const from = parseOptionalDate(req.query.from, 'from');
  const to = parseOptionalDate(req.query.to, 'to');

  if (from && to && from > to) {
    throw new HttpError(400, 'from must be before or equal to to');
  }

  const document = await pdfService.generateClientStatementPdf(id, { from, to });
  sendPdf(res, document);
});

const generalReportPdf = asyncHandler(async (req, res) => {
  const filter = parseReportFilter(req.query.filter);
  const document = await pdfService.generateGeneralReportPdf({ filter });
  sendPdf(res, document);
});

const entryReceiptPdf = asyncHandler(async (req, res) => {
  const id = parsePositiveId(req.params.id, 'entry id');
  const document = await pdfService.generateReceiptPdf(id);
  sendPdf(res, document);
});

module.exports = {
  clientStatementPdf,
  generalReportPdf,
  entryReceiptPdf,
};
