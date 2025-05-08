// controllers/FormTypeController.js
const FormTypeService = require('../services/FormTypeService');

const FormTypeController = {
  async listar(req, res) {
    try {
      const tipos = await FormTypeService.listarTodos();
      return res.json(tipos); // <-- Importante: retorna direto o array
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message || 'Erro interno ao listar tipos de formulário.' });
    }
  }
};

module.exports = FormTypeController;