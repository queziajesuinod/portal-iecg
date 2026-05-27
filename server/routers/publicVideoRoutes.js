const { Router } = require('express');
const controller = require('../controllers/publicVideoController');

const router = Router();

router.get('/channels', controller.listarCanais);
router.get('/', controller.listar);
router.get('/:videoId', controller.buscarPorVideoId);

module.exports = router;
