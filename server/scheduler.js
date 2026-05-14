const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { NotificationCampaign, NotificationSequenceStep, NotificationSequence } = require('./models');
const NotificationCampaignService = require('./services/notificationCampaignService');
const NotificationSequenceService = require('./services/notificationSequenceService');
const ValidacaoMinisterioService = require('./services/validacaoMinisterioService');
const celulaPresencaService = require('./services/celulaPresencaService');
const { APP_TIMEZONE, todayDateOnly } = require('./utils/dateTime');

const dispatching = new Set();

// Controle para não disparar o job de validação mais de uma vez por dia
let ultimaValidacaoData = null;
// Controle para abertura de reuniões (roda 1x por dia)
let ultimaAberturaReunioes = null;

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

async function tickValidacaoCultos() {
  const agora = moment.tz(APP_TIMEZONE);
  const hoje = agora.format('YYYY-MM-DD');

  // Só executa uma vez por dia, toda segunda-feira às 8h (horário Campo Grande)
  if (ultimaValidacaoData === hoje) return;
  if (agora.day() !== 1) return; // 1 = segunda-feira
  if (agora.hour() < 8) return;

  ultimaValidacaoData = hoje;

  console.log('[Scheduler] Verificando cultos ausentes com validação automática ativa...');

  try {
    // Verifica o mês anterior se estamos nos primeiros 7 dias do mês, senão verifica o mês atual
    let mes = agora.month() + 1;
    let ano = agora.year();
    if (agora.date() <= 7) {
      mes = mes === 1 ? 12 : mes - 1;
      if (mes === 12) ano -= 1;
    }

    const resultados = await ValidacaoMinisterioService.enviarNotificacoesAutomaticas(mes, ano);
    const enviados = resultados.filter((r) => r.enviado).length;
    const falhas = resultados.filter((r) => !r.enviado).length;
    console.log(`[Scheduler] Validação de cultos concluída — notificações enviadas: ${enviados}, falhas: ${falhas}`);
  } catch (err) {
    console.error('[Scheduler] Erro na validação de cultos:', err.message);
  }
}

async function tickCelulas() {
  const hoje = todayDateOnly();

  if (ultimaAberturaReunioes !== hoje) {
    try {
      const abertas = await celulaPresencaService.abrirReunioesDodia();
      if (abertas > 0) console.log(`[Scheduler] Abertas ${abertas} reuniões de célula do dia`);
      ultimaAberturaReunioes = hoje;
    } catch (err) {
      console.error('[Scheduler] Erro ao abrir reuniões de célula:', err.message);
    }
  }
}

async function tick() {
  try {
    await Promise.all([tickCampaigns(), tickSequences(), tickValidacaoCultos(), tickCelulas()]);
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
