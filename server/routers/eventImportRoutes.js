const express = require('express');
const ctrl = require('../controllers/eventImportController');

const router = express.Router();

router.get('/:eventId/setup', ctrl.setup);
router.post('/:eventId/preview', ctrl.preview);
router.post('/:eventId/execute', ctrl.execute);

module.exports = router;
