const { NotificationTemplate, User } = require('../models');

const defaultIncludes = [
  { model: User, as: 'creator', attributes: ['id', 'name'] },
  { model: User, as: 'updater', attributes: ['id', 'name'] }
];

// Extrai variáveis do corpo do template: {{nome}}, {{evento}}, etc.
function extractVariables(body = '') {
  const matches = body.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

// Substitui variáveis no corpo: { nome: 'João' } → "Olá João"
function resolveMessage(body = '', variables = {}) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

const NotificationTemplateService = {
  async listar({ channel, context } = {}) {
    const where = {};
    if (channel) where.channel = channel;
    if (context) where.context = context;
    return NotificationTemplate.findAll({
      where,
      include: defaultIncludes,
      order: [['name', 'ASC']]
    });
  },

  async buscarPorId(id) {
    const template = await NotificationTemplate.findByPk(id, { include: defaultIncludes });
    if (!template) throw new Error('Template não encontrado');
    return template;
  },

  async criar(dados, userId = null) {
    const {
      name, channel, body, context
    } = dados;
    if (!name?.trim()) throw new Error('Nome é obrigatório');
    if (!body?.trim()) throw new Error('Corpo da mensagem é obrigatório');
    const variables = extractVariables(body);
    return NotificationTemplate.create({
      name: name.trim(),
      channel: channel || 'whatsapp',
      body: body.trim(),
      variables,
      context: context || null,
      createdBy: userId,
      updatedBy: userId
    });
  },

  async atualizar(id, dados, userId = null) {
    const template = await NotificationTemplateService.buscarPorId(id);
    const {
      name, channel, body, context
    } = dados;
    const updates = { updatedBy: userId };
    if (name !== undefined) updates.name = name.trim();
    if (channel !== undefined) updates.channel = channel;
    if (context !== undefined) updates.context = context || null;
    if (body !== undefined) {
      updates.body = body.trim();
      updates.variables = extractVariables(body);
    }
    await template.update(updates);
    return template.reload({ include: defaultIncludes });
  },

  async deletar(id) {
    const template = await NotificationTemplateService.buscarPorId(id);
    await template.destroy();
    return { mensagem: 'Template removido com sucesso' };
  },

  resolveMessage
};

module.exports = NotificationTemplateService;
