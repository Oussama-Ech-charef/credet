'use strict';

const express = require('express');
const backupController = require('../controllers/backupController');

const router = express.Router();

router.get('/download', backupController.downloadDatabase);
router.post('/export-json', backupController.exportJson);

module.exports = router;
