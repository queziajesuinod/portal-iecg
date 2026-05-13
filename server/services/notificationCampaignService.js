const {
  NotificationCampaign,
  NotificationCampaignRecipient,
  NotificationTemplate,
  User
} = require('../models');
const { resolveAudience } = require('./notificationAudienceService');
const NotificationGroupService = require('./notificationGroupService');
const { resolveMessage } = require('./notificationTemplateService');
const evolutionApi = require('./evolutionApiService');

const defaultIncludes = [
  { model: NotificationTemplate, as: 'template', attributes: ['id', 'name', 'channel', 'body'] },
  { model: User, as: 'creator', attributes: ['id', 'name'] }
];

// ── helpers ───────────────────────────────────────────────────────────────────

function buildMessage(campaign, recipient) {
  const body = campaign.customMessage || campaign.template?.body || '';
  return resolveMessage(body, recipient.variables || {});
}

function computeNextRunAt(campaign) {
  const {
    recurrenceType, recurrenceDays, recurrenceTime, recurrencePeriodEnd
  } = campaign;
  if (!recurrenceType || recurrenceType === 'once') return null;

  const [hours, minutes] = (recurrenceTime || '08:00').split(':').map(Number);
  const periodEnd = recurrencePeriodEnd ? new Date(recurrencePeriodEnd) : null;
  const now = new Date();
  let next = null;

  if (recurrenceType === 'daily') {
    next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (recurrenceType === 'weekly') {
    const days = Array.isArray(recurrenceDays) && recurrenceDays.length ? recurrenceDays : [1];
    for (let d = 1; d <= 7; d += 1) {
      const candidate = new Date(now);
      candidate.setHours(hours, minutes, 0, 0);
      candidate.setDate(now.getDate() + d);
      if (days.includes(candidate.getDay())) { next = candidate; break; }
    }
  } else if (recurrenceType === 'monthly') {
    next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(hours, minutes, 0, 0);
  }

  if (!next) return null;
  if (periodEnd && next > periodEnd) return null;
  return next;
}

async function resolveRecipients(campaign) {
  const { audienceType, audienceConfig } = campaign;
  if (audienceType === 'individual') {
    const { contact, name } = audienceConfig;
    if (!contact) throw new Error('Contato individual não informado');
    return [{
      sourceType: 'individual', sourceId: null, name: name || '', contact, variables: { nome: name || '' }
    }];
  }
  if (audienceType === 'group') {
    const group = await NotificationGroupService.buscarPorId(audienceConfig.groupId);
    return resolveAudience(group.sources, group.deduplicateBy);
  }
  if (audienceType === 'filter') {
    const { sources = [], deduplicateBy = 'phone' } = audienceConfig;
    return resolveAudience(sources, deduplicateBy);
  }
  throw new Error(`audienceType inválido: ${audienceType}`);
}

// ── serviço ───────────────────────────────────────────────────────────────────

const NotificationCampaignService = {
  async listar(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    return NotificationCampaign.findAll({ where, include: defaultIncludes, order: [['createdAt', 'DESC']] });
  },

  async buscarPorId(id) {
    const campaign = await NotificationCampaign.findByPk(id, { include: defaultIncludes });
    if (!campaign) throw new Error('Campanha não encontrada');
    return campaign;
  },

  async criar(dados, userId = null) {
    const {
      name, channel, templateId, customMessage, audienceType, audienceConfig,
      scheduledAt, sendDelayMs, recurrenceType, recurrenceDays, recurrenceTime,
      recurrencePeriodStart, recurrencePeriodEnd
    } = dados;
    if (!name?.trim()) throw new Error('Nome é obrigatório');
    if (!audienceType) throw new Error('Tipo de audiência é obrigatório');
    if (!templateId && !customMessage?.trim()) throw new Error('Informe um template ou mensagem personalizada');

    return NotificationCampaign.create({
      name: name.trim(),
      channel: channel || 'whatsapp',
      templateId: templateId || null,
      customMessage: customMessage?.trim() || null,
      audienceType,
      audienceConfig: audienceConfig || {},
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt || null,
      sendDelayMs: sendDelayMs != null ? sendDelayMs : 500,
      recurrenceType: recurrenceType || 'once',
      recurrenceDays: recurrenceDays || null,
      recurrenceTime: recurrenceTime || null,
      recurrencePeriodStart: recurrencePeriodStart || null,
      recurrencePeriodEnd: recurrencePeriodEnd || null,
      nextRunAt: null,
      createdBy: userId
    });
  },

  async atualizar(id, dados) {
    const campaign = await NotificationCampaignService.buscarPorId(id);
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new Error('Só é possível editar campanhas em rascunho ou agendadas');
    }
    const allowed = ['name', 'channel', 'templateId', 'customMessage', 'audienceType', 'audienceConfig',
      'scheduledAt', 'sendDelayMs', 'recurrenceType', 'recurrenceDays', 'recurrenceTime',
      'recurrencePeriodStart', 'recurrencePeriodEnd'];
    const updates = {};
    allowed.forEach((key) => { if (dados[key] !== undefined) updates[key] = dados[key]; });
    if (updates.scheduledAt !== undefined) {
      updates.status = updates.scheduledAt ? 'scheduled' : 'draft';
    }
    if (updates.recurrenceType === 'once') {
      updates.nextRunAt = null;
    }
    await campaign.update(updates);
    return campaign.reload({ include: defaultIncludes });
  },

  async deletar(id) {
    const campaign = await NotificationCampaignService.buscarPorId(id);
    if (campaign.status === 'sending') throw new Error('Não é possível excluir uma campanha em andamento');
    await NotificationCampaignRecipient.destroy({ where: { campaignId: id } });
    await campaign.destroy();
    return { mensagem: 'Campanha removida com sucesso' };
  },

  async previewAudiencia(id) {
    const campaign = await NotificationCampaignService.buscarPorId(id);
    const recipients = await resolveRecipients(campaign);
    return { total: recipients.length, sample: recipients.slice(0, 5) };
  },

  async disparar(id) {
    const campaign = await NotificationCampaignService.buscarPorId(id);
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new Error('Campanha já foi enviada ou está em andamento');
    }

    await campaign.update({ status: 'sending', sentAt: null });

    try {
      // Remove destinatários do run anterior (para campanhas recorrentes)
      await NotificationCampaignRecipient.destroy({ where: { campaignId: id } });

      const recipients = await resolveRecipients(campaign);
      const recipientRows = recipients.map((r) => ({
        campaignId: id,
        sourceType: r.sourceType,
        sourceId: r.sourceId || null,
        name: r.name || null,
        contact: r.contact,
        resolvedMessage: buildMessage(campaign, r),
        status: 'pending'
      }));
      await NotificationCampaignRecipient.bulkCreate(recipientRows);

      let totalSent = 0;
      let totalFailed = 0;
      const delayMs = campaign.sendDelayMs ?? 500;

      const allRecipients = await NotificationCampaignRecipient.findAll({
        where: { campaignId: id, status: 'pending' }
      });

      for (const recipient of allRecipients) {
        try {
          if (campaign.channel === 'whatsapp') {
            const response = await evolutionApi.enviarMensagemTexto(
              recipient.contact, recipient.resolvedMessage
            );
            await recipient.update({
              status: 'sent',
              sentAt: new Date(),
              externalId: response.externalId || null,
              providerResponse: response
            });
          } else {
            await recipient.update({ status: 'sent', sentAt: new Date() });
          }
          totalSent += 1;
        } catch (err) {
          await recipient.update({ status: 'failed', errorMessage: err.message || 'Erro no envio' });
          totalFailed += 1;
        }
        if (delayMs > 0) await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      }

      const isRecurrent = campaign.recurrenceType && campaign.recurrenceType !== 'once';
      const nextRunAt = isRecurrent ? computeNextRunAt(campaign) : null;

      await campaign.update({
        status: isRecurrent && nextRunAt ? 'scheduled' : 'sent',
        sentAt: new Date(),
        totalRecipients: allRecipients.length,
        totalSent,
        totalFailed,
        nextRunAt: nextRunAt || null
      });

      return { totalRecipients: allRecipients.length, totalSent, totalFailed };
    } catch (err) {
      await campaign.update({ status: 'failed' });
      throw err;
    }
  },

  async monitorar(id) {
    const campaign = await NotificationCampaign.findByPk(id, { include: defaultIncludes });
    if (!campaign) throw new Error('Campanha não encontrada');

    const seq = NotificationCampaignRecipient.sequelize;
    const counts = await NotificationCampaignRecipient.findAll({
      where: { campaignId: id },
      attributes: ['status', [seq.fn('COUNT', seq.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const statusCounts = {};
    let total = 0;
    counts.forEach(({ status, count }) => {
      statusCounts[status] = Number(count);
      total += Number(count);
    });

    const failures = await NotificationCampaignRecipient.findAll({
      where: { campaignId: id, status: 'failed' },
      attributes: ['id', 'name', 'contact', 'errorMessage', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 100
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        channel: campaign.channel,
        sentAt: campaign.sentAt,
        nextRunAt: campaign.nextRunAt,
        totalRecipients: campaign.totalRecipients,
        totalSent: campaign.totalSent,
        totalFailed: campaign.totalFailed,
        sendDelayMs: campaign.sendDelayMs,
        recurrenceType: campaign.recurrenceType,
        recurrenceDays: campaign.recurrenceDays,
        recurrenceTime: campaign.recurrenceTime,
        recurrencePeriodStart: campaign.recurrencePeriodStart,
        recurrencePeriodEnd: campaign.recurrencePeriodEnd
      },
      statusCounts,
      total,
      failures
    };
  },

  async listarDestinatarios(campaignId, filters = {}) {
    const where = { campaignId };
    if (filters.status) where.status = filters.status;
    const page = Math.max(Number(filters.page) || 1, 1);
    const perPage = Math.min(Number(filters.perPage) || 20, 100);
    const { count, rows } = await NotificationCampaignRecipient.findAndCountAll({
      where, order: [['createdAt', 'ASC']], limit: perPage, offset: (page - 1) * perPage
    });
    return {
      recipients: rows, total: count, page, perPage, totalPages: Math.ceil(count / perPage)
    };
  }
};

module.exports = NotificationCampaignService;
