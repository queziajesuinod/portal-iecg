const PaymentService = require('../services/PaymentService');

class PaymentController {
  async getHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await PaymentService.obterHistoricoPagamento(id);

      if (!history.length) {
        return res.status(404).json({ message: 'Nenhum histórico encontrado.' });
      }

      return res.json(history);
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamento:', error);
      return res.status(500).json({ error: 'Erro interno ao consultar histórico.' });
    }
  }
}

module.exports = new PaymentController();
