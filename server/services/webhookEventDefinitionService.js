const { WebhookEventDefinition } = require('../models');

const ALLOWED_CHANGE_TYPES = new Set(['INSERT', 'UPDATE', 'DELETE']);

const WebhookEventDefinitionService = {
  async list() {
    return WebhookEventDefinition.findAll({ order: [['createdAt', 'DESC']] });
  },

  async create(payload) {
    const {
      eventKey,
      label,
      tableName,
      fieldName,
      changeType,
      description
    } = payload || {};

    if (!eventKey || !label || !tableName || !fieldName) {
      throw new Error('Evento requer chave, label, tabela e campo.');
    }

    const normalizedEventKey = eventKey.toString().trim();
    const normalizedChangeType = (changeType || 'UPDATE').toString().trim().toUpperCase();
    if (!ALLOWED_CHANGE_TYPES.has(normalizedChangeType)) {
      throw new Error('Tipo de mudança inválido.');
    }

    const existing = await WebhookEventDefinition.findOne({ where: { eventKey: normalizedEventKey } });
    if (existing) {
      throw new Error('Evento já cadastrado.');
    }

    return WebhookEventDefinition.create({
      eventKey: normalizedEventKey,
      label: label.toString().trim(),
      tableName: tableName.toString().trim(),
      fieldName: fieldName.toString().trim(),
      changeType: normalizedChangeType,
      description: description ? description.toString().trim() : null
    });
  }
};

module.exports = WebhookEventDefinitionService;
