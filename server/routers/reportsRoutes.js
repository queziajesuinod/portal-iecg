const express = require('express');
const reportsController = require('../controllers/reportsController');
const requirePermission = require('../middlewares/requirePermission');

const router = express.Router();
const requireReportsAccess = requirePermission(['RELATORIOS', 'ADMIN_FULL_ACCESS']);

router.use(requireReportsAccess);

router.get('/membros', reportsController.membros);
router.get('/eventos-financeiro', reportsController.eventosFinanceiro);
router.get('/cultos', reportsController.cultos);

module.exports = router;
