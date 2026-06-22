const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/today', statsController.getTodayStats);

module.exports = router;
