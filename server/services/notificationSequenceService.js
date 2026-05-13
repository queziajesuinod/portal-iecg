const {
  NotificationSequence,
  NotificationSequenceStep,
  NotificationSequenceStepRecipient,
  NotificationTemplate,
  User
} = require('../models');
const { resolveAudience } = require('./notificationAudienceService');
const { resolveMessage } = require('./notificationTemplateService');
const evolutionApi = require('./evolutionApiService');

const stepIncludes = [
  { model: NotificationTemplate, as: 'template', attributes: ['id', 'name', 'body'] }
];

const sequenceIncludes = [
  {
    model: NotificationSequenceStep,
    as: 'steps',
    include: stepIncludes,
    order: [['stepOrder', 'ASC']]
  },
  { model: User, as: 'creator', attributes: ['id', 'name'] }
];

async function resolveStepRecipients(sequence) {
  const { audienceType, audienceConfig } = sequence;
  if (audienceType === 'individual') {
    const { contact, name } = audienceConfig;
    if (!contact) throw new Error('Contato individual não informado');
    return [{
      sourceType: 'individual', sourceId: null, name: name || '', contact, variables: { nome: name || '' }
    }];
  }
  if (audienceType === 'group') {
    const NotificationGroupService = require('./notificationGroupService');
    const group = await NotificationGroupService.buscarPorId(audienceConfig.groupId);
    return resolveAudience(group.sources, group.deduplicateBy);
  }
  if (audienceType === 'filter') {
    const { sources = [], deduplicateBy = 'phone' } = audienceConfig;
    return resolveAudience(sources, deduplicateBy);
  }
  throw new Error(`audienceType inválido: ${audienceType}`);
}

function buildStepMessage(step, recipient) {
  const body = step.customMessage || step.template?.body || '';
  return resolveMessage(body, recipient.variables || {});
}

const NotificationSequenceService = {
  async listar() {
    const sequences = await NotificationSequence.findAll({
      include: [
        {
          model: NotificationSequenceStep,
          as: 'steps',
          attributes: ['id', 'stepOrder', 'name', 'templateId', 'customMessage', 'scheduledAt', 'status', 'totalSent', 'totalFailed']
        },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC'], [{ model: NotificationSequenceStep, as: 'steps' }, 'stepOrder', 'ASC']]
    });
    return sequences;
  },

  async buscarPorId(id) {
    const seq = await NotificationSequence.findByPk(id, { include: sequenceIncludes });
    if (!seq) throw new Error('Sequência não encontrada');
    return seq;
  },

  async criar(dados, userId = null) {
    const {
      name, description, channel, audienceType, audienceConfig, sendDelayMs, evolutionInstance, steps = []
    } = dados;
    if (!name?.trim()) throw new Error('Nome é obrigatório');

    const sequence = await NotificationSequence.create({
      name: name.trim(),
      description: description?.trim() || null,
      channel: channel || 'whatsapp',
      audienceType: audienceType || 'filter',
      audienceConfig: audienceConfig || {},
      sendDelayMs: sendDelayMs != null ? sendDelayMs : 500,
      evolutionInstance: evolutionInstance || null,
      status: 'draft',
      createdBy: userId
    });

    if (steps.length) {
      const stepRows = steps.map((s, i) => ({
        sequenceId: sequence.id,
        stepOrder: s.stepOrder ?? (i + 1),
        name: s.name || null,
        templateId: s.templateId || null,
        customMessage: s.customMessage || null,
        scheduledAt: s.scheduledAt || null,
        status: 'pending'
      }));
      await NotificationSequenceStep.bulkCreate(stepRows);
    }

    return NotificationSequenceService.buscarPorId(sequence.id);
  },

  async atualizar(id, dados) {
    const sequence = await NotificationSequenceService.buscarPorId(id);
    if (sequence.status === 'completed') throw new Error('Sequência concluída não pode ser editada');

    const {
      name, description, channel, audienceType, audienceConfig, sendDelayMs, evolutionInstance, steps
    } = dados;
    await sequence.update({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(channel !== undefined ? { channel } : {}),
      ...(audienceType !== undefined ? { audienceType } : {}),
      ...(audienceConfig !== undefined ? { audienceConfig } : {}),
      ...(sendDelayMs !== undefined ? { sendDelayMs } : {}),
      ...(evolutionInstance !== undefined ? { evolutionInstance: evolutionInstance || null } : {})
    });

    if (steps !== undefined) {
      // Remove steps antigos e recria (apenas steps pendentes)
      await NotificationSequenceStep.destroy({ where: { sequenceId: id, status: 'pending' } });
      const existingStepOrders = (await NotificationSequenceStep.findAll({ where: { sequenceId: id }, attributes: ['stepOrder'] }))
        .map((s) => s.stepOrder);

      const newSteps = steps
        .filter((s) => !existingStepOrders.includes(s.stepOrder))
        .map((s, i) => ({
          sequenceId: id,
          stepOrder: s.stepOrder ?? (i + 1),
          name: s.name || null,
          templateId: s.templateId || null,
          customMessage: s.customMessage || null,
          scheduledAt: s.scheduledAt || null,
          status: 'pending'
        }));

      if (newSteps.length) await NotificationSequenceStep.bulkCreate(newSteps);

      // Atualiza steps pendentes que ainda existem
      for (const s of steps.filter((step) => existingStepOrders.includes(step.stepOrder))) {
        await NotificationSequenceStep.update(
          {
            name: s.name || null,
            templateId: s.templateId || null,
            customMessage: s.customMessage || null,
            scheduledAt: s.scheduledAt || null
          },
          { where: { sequenceId: id, stepOrder: s.stepOrder, status: 'pending' } }
        );
      }
    }

    return NotificationSequenceService.buscarPorId(id);
  },

  async ativar(id) {
    const sequence = await NotificationSequenceService.buscarPorId(id);
    if (!['draft', 'paused'].includes(sequence.status)) throw new Error('Sequência não pode ser ativada neste estado');
    const hasPending = sequence.steps.some((s) => s.status === 'pending');
    if (!hasPending) throw new Error('Nenhum step pendente encontrado');
    await sequence.update({ status: 'active' });
    return sequence.reload({ include: sequenceIncludes });
  },

  async pausar(id) {
    const sequence = await NotificationSequenceService.buscarPorId(id);
    if (sequence.status !== 'active') throw new Error('Apenas sequências ativas podem ser pausadas');
    await sequence.update({ status: 'paused' });
    return sequence.reload({ include: sequenceIncludes });
  },

  async deletar(id) {
    const sequence = await NotificationSequenceService.buscarPorId(id);
    if (sequence.status === 'sending') throw new Error('Não é possível excluir enquanto um step está sendo enviado');
    await sequence.destroy();
    return { mensagem: 'Sequência removida com sucesso' };
  },

  async dispararStep(stepId) {
    const step = await NotificationSequenceStep.findByPk(stepId, {
      include: [
        { model: NotificationSequence, as: 'sequence' },
        ...stepIncludes
      ]
    });
    if (!step) throw new Error('Step não encontrado');
    if (step.status !== 'pending') throw new Error('Step já foi enviado ou está em andamento');

    const { sequence } = step;
    await step.update({ status: 'sending' });

    try {
      await NotificationSequenceStepRecipient.destroy({ where: { stepId } });
      const recipients = await resolveStepRecipients(sequence);
      const recipientRows = recipients.map((r) => ({
        stepId,
        sourceType: r.sourceType,
        sourceId: r.sourceId || null,
        name: r.name || null,
        contact: r.contact,
        resolvedMessage: buildStepMessage(step, r),
        status: 'pending'
      }));
      await NotificationSequenceStepRecipient.bulkCreate(recipientRows);

      let totalSent = 0;
      let totalFailed = 0;
      const delayMs = sequence.sendDelayMs ?? 500;
      const allRecipients = await NotificationSequenceStepRecipient.findAll({
        where: { stepId, status: 'pending' }
      });

      for (const r of allRecipients) {
        try {
          if (sequence.channel === 'whatsapp') {
            const response = await evolutionApi.enviarMensagemTexto(r.contact, r.resolvedMessage, sequence.evolutionInstance);
            await r.update({ status: 'sent', sentAt: new Date(), providerResponse: response });
          } else {
            await r.update({ status: 'sent', sentAt: new Date() });
          }
          totalSent += 1;
        } catch (err) {
          await r.update({ status: 'failed', errorMessage: err.message || 'Erro no envio' });
          totalFailed += 1;
        }
        if (delayMs > 0) await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      }

      await step.update({
        status: 'sent',
        sentAt: new Date(),
        totalRecipients: allRecipients.length,
        totalSent,
        totalFailed
      });

      // Verifica se todos os steps da sequência foram concluídos
      const pendingCount = await NotificationSequenceStep.count({
        where: { sequenceId: sequence.id, status: 'pending' }
      });
      if (pendingCount === 0) {
        await sequence.update({ status: 'completed' });
      }

      return { totalRecipients: allRecipients.length, totalSent, totalFailed };
    } catch (err) {
      await step.update({ status: 'failed' });
      throw err;
    }
  },

  async monitorarStep(stepId) {
    const step = await NotificationSequenceStep.findByPk(stepId, {
      include: [{ model: NotificationSequence, as: 'sequence', attributes: ['id', 'name', 'channel'] }, ...stepIncludes]
    });
    if (!step) throw new Error('Step não encontrado');

    const seq = NotificationSequenceStepRecipient.sequelize;
    const counts = await NotificationSequenceStepRecipient.findAll({
      where: { stepId },
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

    const failures = await NotificationSequenceStepRecipient.findAll({
      where: { stepId, status: 'failed' },
      attributes: ['id', 'name', 'contact', 'errorMessage', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    return {
      step, statusCounts, total, failures
    };
  }
};

module.exports = NotificationSequenceService;
