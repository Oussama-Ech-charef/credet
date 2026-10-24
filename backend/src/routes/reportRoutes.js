'use strict';

const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/client/:id/pdf', reportController.clientStatementPdf);
router.get('/general/pdf', reportController.generalReportPdf);
router.get('/entry/:id/receipt/pdf', reportController.entryReceiptPdf);

module.exports = router;
