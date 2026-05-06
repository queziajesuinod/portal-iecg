const { NotificationGroup, User } = require('../models');
const { previewAudienceCount } = require('./notificationAudienceService');
const { refreshGroupPreview } = require('./notificationGroupSyncService');

const defaultIncludes = [
  { model: User, as: 'creator', attributes: ['id', 'name'] }
];

const NotificationGroupService = {
  async listar() {
    return NotificationGroup.findAll({
      include: defaultIncludes,
      order: [['createdAt', 'DESC']]
    });
  },

  async buscarPorId(id) {
    const group = await NotificationGroup.findByPk(id, { include: defaultIncludes });
    if (!group) throw new Error('Grupo não encontrado');
    return group;
  },

  async criar(dados, userId = null) {
    const {
      name, description, sources, deduplicateBy
    } = dados;
    if (!name?.trim()) throw new Error('Nome é obrigatório');
    if (!Array.isArray(sources) || !sources.length) throw new Error('Ao menos um source é obrigatório');
    const group = await NotificationGroup.create({
      name: name.trim(),
      description: description?.trim() || null,
      sources,
      deduplicateBy: deduplicateBy || 'phone',
      createdBy: userId
    });
    // Calcula preview inicial em background
    refreshGroupPreview(group);
    return group;
  },

  async atualizar(id, dados) {
    const group = await NotificationGroupService.buscarPorId(id);
    const {
      name, description, sources, deduplicateBy
    } = dados;
    if (name !== undefined && !name?.trim()) throw new Error('Nome é obrigatório');
    await group.update({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(sources !== undefined ? { sources, previewCount: null, previewUpdatedAt: null } : {}),
      ...(deduplicateBy !== undefined ? { deduplicateBy } : {})
    });
    const reloaded = await group.reload({ include: defaultIncludes });
    // Recalcula preview em background pois sources podem ter mudado
    refreshGroupPreview(reloaded);
    return reloaded;
  },

  async deletar(id) {
    const group = await NotificationGroupService.buscarPorId(id);
    await group.destroy();
    return { mensagem: 'Grupo removido com sucesso' };
  },

  async preview(id) {
    const group = await NotificationGroupService.buscarPorId(id);
    const result = await previewAudienceCount(group.sources, group.deduplicateBy);
    // Persiste o count calculado
    await group.update({ previewCount: result.total, previewUpdatedAt: new Date() });
    return result;
  },

  async previewDireto(sources, deduplicateBy = 'phone') {
    return previewAudienceCount(sources, deduplicateBy);
  }
};

module.exports = NotificationGroupService;
