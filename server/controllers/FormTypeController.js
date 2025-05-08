// controllers/FormTypeController.js
const FormTypeService = require('../services/FormTypeService');

class FormTypeController {
  async list(req, res) {
    try {
      const tipos = await FormTypeService.listarTodos();
      res.json(tipos);
    } catch (error) {
      console.error('Erro ao listar tipos de formulário:', error);
      res.status(500).json({ error: 'Erro ao buscar tipos de formulário.' });
    }
  }
}

module.exports = new FormTypeController();
