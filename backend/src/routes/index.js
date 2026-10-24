'use strict';

const express = require('express');
const clientRoutes = require('./clientRoutes');
const entryRoutes = require('./entryRoutes');
const statsRoutes = require('./statsRoutes');
const backupRoutes = require('./backupRoutes');

const router = express.Router();

router.use('/clients', clientRoutes);
router.use('/entries', entryRoutes);
router.use('/stats', statsRoutes);
router.use('/backup', backupRoutes);

module.exports = router;
