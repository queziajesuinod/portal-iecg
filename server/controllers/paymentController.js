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

  async processPayment(req, res) {
    try {
      const { payerName, payerEmail, payerPhone, amount, returnUrl } = req.body;

      // Validação básica dos dados recebidos
      if (!payerName || !payerEmail || !payerPhone || !amount || !returnUrl) {
        return res.status(400).json({ message: 'Dados incompletos para processar o pagamento.' });
      }

      // Chama o serviço de pagamento para processar o pagamento
      const paymentResponse = await PaymentService.processarPagamento({
        paymentInfo: { payerName, payerEmail, payerPhone },
        valorSolicitado: amount,
        config: { returnUrl },
      });

      if (!paymentResponse.success) {
        return res.status(400).json({ message: paymentResponse.message });
      }

      return res.status(200).json({ checkoutUrl: paymentResponse.checkoutUrl });
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
    }
  }
}

module.exports = new PaymentController();
