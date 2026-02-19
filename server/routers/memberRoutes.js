const express = require('express');
const memberController = require('../controllers/memberController');

const router = express.Router();

router.get('/stats', memberController.stats);
router.get('/', memberController.list);
router.get('/:id', memberController.getById);
router.post('/', memberController.create);
router.put('/:id', memberController.update);
router.delete('/:id', memberController.remove);

module.exports = router;
