const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

router.get('/config', cronController.getCronConfig);
router.get('/status', cronController.getSyncStatus);
router.post('/update', cronController.updateCronConfig);
router.post('/trigger', cronController.triggerManualSync);

module.exports = router;