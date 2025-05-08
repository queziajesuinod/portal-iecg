// services/FormTypeService.js
const { FormType } = require('../models');

class FormTypeService {
   async listarTodos() {
      return await FormType.findAll();
  }
}

module.exports = new FormTypeService();
