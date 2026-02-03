const WebhookEventDefinitionService = require('../services/webhookEventDefinitionService');

const WebhookEventDefinitionController = {
  async list(req, res) {
    try {
      const definitions = await WebhookEventDefinitionService.list();
      return res.status(200).json(definitions);
    } catch (error) {
      console.error('[WEBHOOK EVENT DEF] Falha ao listar definições:', error);
      return res.status(500).json({ message: 'Não foi possível carregar os eventos.' });
    }
  },

  async create(req, res) {
    try {
      const definition = await WebhookEventDefinitionService.create(req.body);
      return res.status(201).json(definition);
    } catch (error) {
      console.error('[WEBHOOK EVENT DEF] Falha ao criar definição:', error);
      return res.status(400).json({ message: error.message || 'Erro ao criar evento.' });
    }
  }
};

module.exports = WebhookEventDefinitionController;
