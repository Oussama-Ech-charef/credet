'use strict';

const express = require('express');
const clientController = require('../controllers/clientController');
const entryController = require('../controllers/entryController');

const router = express.Router();

router.get('/', clientController.listClients);
router.post('/', clientController.createClient);

router.get('/:clientId/entries', entryController.listEntries);
router.post('/:clientId/entries', entryController.createEntry);

router.get('/:id', clientController.getClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;
