const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');

router.post('/init', queueController.initQueue);
router.get('/today/:doctorId', queueController.getTodayQueue);
router.patch('/call-next', queueController.callNext);

module.exports = router;
