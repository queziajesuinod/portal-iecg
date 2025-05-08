// controllers/PublicPaymentController.js
const PublicPaymentService = require('../services/PublicPaymentService');

class PublicPaymentController {
  async getPaymentsByCpf(req, res) {
    try {
      const { cpf } = req.params;
      const resultado = await PublicPaymentService.consultarPorCpf(cpf);
      return res.json(resultado);
    } catch (error) {
      console.error('Erro ao buscar pagamentos por CPF:', error);
      return res.status(500).json({ message: 'Erro interno ao buscar dados por CPF.' });
    }
  }
}

module.exports = new PublicPaymentController();
