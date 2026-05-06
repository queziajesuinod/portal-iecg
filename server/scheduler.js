const { Op } = require('sequelize');
const { NotificationCampaign, NotificationSequenceStep, NotificationSequence } = require('./models');
const NotificationCampaignService = require('./services/notificationCampaignService');
const NotificationSequenceService = require('./services/notificationSequenceService');

const dispatching = new Set();

async function tickCampaigns() {
  const now = new Date();
  const due = await NotificationCampaign.findAll({
    where: {
      status: 'scheduled',
      [Op.or]: [
        { scheduledAt: { [Op.lte]: now }, nextRunAt: null },
        { nextRunAt: { [Op.lte]: now } }
      ]
    },
    attributes: ['id', 'name']
  });

  for (const { id, name } of due) {
    if (dispatching.has(id)) continue;
    dispatching.add(id);
    console.log(`[Scheduler] Disparando campanha "${name}" (${id})`);
    NotificationCampaignService.disparar(id)
      .then(({ totalSent, totalFailed }) => {
        console.log(`[Scheduler] Campanha "${name}" concluída — enviados: ${totalSent}, falhas: ${totalFailed}`);
      })
      .catch((err) => {
        console.error(`[Scheduler] Erro na campanha "${name}" (${id}):`, err.message);
      })
      .finally(() => dispatching.delete(id));
  }
}

async function tickSequences() {
  const now = new Date();
  // Busca steps pendentes com scheduledAt passado de sequências ativas
  const dueSteps = await NotificationSequenceStep.findAll({
    where: {
      status: 'pending',
      scheduledAt: { [Op.lte]: now }
    },
    include: [{
      model: NotificationSequence,
      as: 'sequence',
      where: { status: 'active' },
      attributes: ['id', 'name']
    }],
    attributes: ['id', 'name', 'stepOrder'],
    order: [['stepOrder', 'ASC']]
  });

  for (const step of dueSteps) {
    const key = `step_${step.id}`;
    if (dispatching.has(key)) continue;
    dispatching.add(key);
    const label = `${step.sequence.name} > Step ${step.stepOrder}${step.name ? ` (${step.name})` : ''}`;
    console.log(`[Scheduler] Disparando sequência step: "${label}"`);
    NotificationSequenceService.dispararStep(step.id)
      .then(({ totalSent, totalFailed }) => {
        console.log(`[Scheduler] Step "${label}" concluído — enviados: ${totalSent}, falhas: ${totalFailed}`);
      })
      .catch((err) => {
        console.error(`[Scheduler] Erro no step "${label}":`, err.message);
      })
      .finally(() => dispatching.delete(key));
  }
}

async function tick() {
  try {
    await Promise.all([tickCampaigns(), tickSequences()]);
  } catch (err) {
    console.error('[Scheduler] Erro no tick:', err.message);
  }
}

function startScheduler() {
  tick();
  setInterval(tick, 60000);
  console.log('[Scheduler] Iniciado — verificando campanhas e sequências agendadas a cada minuto.');
}

module.exports = { startScheduler };
