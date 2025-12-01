const express = require('express');
const ApeloDirecionadoCelulaController = require('../controllers/apelodirecionadocelulaController');
const router = express.Router();

// Rota pública para criar apelo direcionado (sem autenticação)
router.post('/direcionamentos', ApeloDirecionadoCelulaController.criar);

module.exports = router;
