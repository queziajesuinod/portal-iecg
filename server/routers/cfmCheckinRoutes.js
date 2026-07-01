const express = require('express');
const router = express.Router();
const c = require('../controllers/cfmController');

router.post('/scan', c.cfmCheckinScan);
router.post('/marcar', c.cfmCheckinMarcar);

module.exports = router;
