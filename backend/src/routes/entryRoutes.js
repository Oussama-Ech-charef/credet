'use strict';

const express = require('express');
const entryController = require('../controllers/entryController');

const router = express.Router();

router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);

module.exports = router;
