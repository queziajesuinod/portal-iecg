const express = require('express');
const financialController = require('../controllers/financialController');
const requirePermission = require('../middlewares/requirePermission');

const router = express.Router();
const requireFinancialAccess = requirePermission(['EVENTS_ACESS', 'EVENTS_ACCESS', 'EVENTOS_LISTAR']);

router.use(requireFinancialAccess);

router.get('/records', financialController.listRecords);
router.get('/fee-config', financialController.getFeeConfig);
router.put('/fee-config', financialController.updateFeeConfig);
router.post('/expenses', financialController.createExpense);
router.put('/expenses/:id', financialController.updateExpense);
router.delete('/expenses/:id', financialController.deleteExpense);

module.exports = router;
