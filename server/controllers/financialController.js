const financialService = require('../services/financialService');

function normalizeQueryValue(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return null;
  }
  return normalized;
}

async function listRecords(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || 10, 1), 100);
    const expensePage = Math.max(parseInt(req.query.expensePage, 10) || 1, 1);
    const expensePerPage = Math.min(Math.max(parseInt(req.query.expensePerPage, 10) || 10, 1), 100);

    const filters = {
      dateFrom: normalizeQueryValue(req.query.dateFrom),
      dateTo: normalizeQueryValue(req.query.dateTo),
      eventId: normalizeQueryValue(req.query.eventId),
      paymentMethod: normalizeQueryValue(req.query.paymentMethod),
      page,
      perPage,
      expensePage,
      expensePerPage
    };

    const result = await financialService.listFinancialRecords(filters);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao listar registros financeiros:', error);
    res.status(500).json({ message: error.message || 'Erro ao listar registros financeiros' });
  }
}

async function getFeeConfig(req, res) {
  try {
    const config = await financialService.getFeeConfig();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao carregar configuração de taxas' });
  }
}

async function updateFeeConfig(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const config = await financialService.updateFeeConfig(req.body, userId);
    res.status(200).json(config);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar configuração de taxas' });
  }
}

async function createExpense(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const expense = await financialService.createExpense(req.body, userId);
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao criar saída' });
  }
}

async function updateExpense(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const expense = await financialService.updateExpense(req.params.id, req.body, userId);
    res.status(200).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao atualizar saída' });
  }
}

async function deleteExpense(req, res) {
  try {
    await financialService.deleteExpense(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message || 'Erro ao remover saída' });
  }
}

module.exports = {
  listRecords,
  getFeeConfig,
  updateFeeConfig,
  createExpense,
  updateExpense,
  deleteExpense
};
