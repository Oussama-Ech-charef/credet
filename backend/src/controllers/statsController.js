'use strict';

const statsService = require('../services/statsService');

function getOverview(req, res) {
  res.json(statsService.getOverview());
}

module.exports = { getOverview };
