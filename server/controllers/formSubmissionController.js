const FormService = require('../services/FormService');

const FormSubmissionController = {
  async create(req, res) {
    try {
      const { formId } = req.params;
      const fields = req.body;


      const submission = await FormService.criarSubmissao(formId, fields);
      return res.status(201).json(submission);
    } catch (error) {
      console.error('Erro ao criar Inscrição:', error);
      return res.status(400).json({ error: error.message || 'Erro ao criar Inscrição' });
    }
  }
};

module.exports = FormSubmissionController;
