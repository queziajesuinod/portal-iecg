// services/FormTypeService.js
const { FormType } = require('../models');

class FormTypeService {
  static async listarTodos() {
    try {
      return await FormType.findAll();
    } catch (error) {
      throw new Error('Erro ao buscar tipos de formulário.');
    }
  }
}

module.exports = FormTypeService;
