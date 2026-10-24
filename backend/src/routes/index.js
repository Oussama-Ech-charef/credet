'use strict';

const express = require('express');
const clientRoutes = require('./clientRoutes');
const entryRoutes = require('./entryRoutes');
const statsRoutes = require('./statsRoutes');
const backupRoutes = require('./backupRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');

const router = express.Router();

router.use('/clients', clientRoutes);
router.use('/entries', entryRoutes);
router.use('/stats', statsRoutes);
router.use('/backup', backupRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
