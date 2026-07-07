const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { NotificationCampaign, NotificationSequenceStep, NotificationSequence } = require('./models');
const NotificationCampaignService = require('./services/notificationCampaignService');
const NotificationSequenceService = require('./services/notificationSequenceService');
const ValidacaoMinisterioService = require('./services/validacaoMinisterioService');
const celulaPresencaService = require('./services/celulaPresencaService');
const videoTranscriptWorker = require('./services/videoTranscriptWorker');
const channelSyncService = require('./services/channelSyncService');
const ticketResendService = require('./services/ticketResendService');
const { APP_TIMEZONE, todayDateOnly } = require('./utils/dateTime');

const dispatching = new Set();
let schedulerTickRunning = false;

// Estado persistido em disco para sobreviver a reinicializações do servidor
const SCHEDULER_STATE_FILE = path.join(__dirname, '.scheduler-state.json');

function loadSchedulerState() {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULER_STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveSchedulerState(updates) {
  const current = loadSchedulerState();
  fs.writeFileSync(SCHEDULER_STATE_FILE, JSON.stringify({ ...current, ...updates }, null, 2));
}

const _state = loadSchedulerState();

// Controle para não disparar o job de validação mais de uma vez por dia
let ultimaValidacaoData = _state.ultimaValidacaoData || null;
// Controle para abertura de reuniões (roda 1x por dia)
let ultimaAberturaReunioes = null;
// Controle para sincronização automática dos canais do YouTube (1x na semana)
let ultimaSincronizacaoYoutubeData = _state.ultimaSincronizacaoYoutubeData || null;
let ultimaTicketEmailResgateAt = 0;
const TICKET_EMAIL_RESGATE_INTERVAL_MS = Number(process.env.TICKET_EMAIL_RESGATE_INTERVAL_MS || 300000);

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
  saveSchedulerState({ ultimaValidacaoData: hoje });

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

async function tickVideoTranscription() {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    await videoTranscriptWorker.tick();
  } catch (err) {
    console.error('[Scheduler] Erro no tick de transcricao:', err.message);
  }
}

async function tickYoutubeChannelSync() {
  const enabled = process.env.YOUTUBE_SYNC_ENABLED !== 'false';
  if (!enabled) return;

  const targetDay = Number(process.env.YOUTUBE_SYNC_DAY ?? 1); // 1 = segunda-feira
  const targetHour = Number(process.env.YOUTUBE_SYNC_HOUR ?? 0); // 0 = meia-noite

  const agora = moment.tz(APP_TIMEZONE);
  const hoje = agora.format('YYYY-MM-DD');

  if (ultimaSincronizacaoYoutubeData === hoje) return;
  if (agora.day() !== targetDay) return;
  if (agora.hour() < targetHour) return;

  ultimaSincronizacaoYoutubeData = hoje;
  saveSchedulerState({ ultimaSincronizacaoYoutubeData: hoje });

  console.log('[Scheduler] Iniciando sincronização automática dos canais do YouTube...');
  try {
    const results = await channelSyncService.syncAllActiveChannels({ maxPages: 5 });
    const ok = results.filter((r) => r.success).length;
    const fail = results.filter((r) => !r.success).length;
    const totalCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
    const totalIgnoredPrivacy = results.reduce((sum, r) => sum + (r.skippedByPrivacy || 0), 0);
    const totalIgnoredDuration = results.reduce((sum, r) => sum + (r.skippedByDuration || 0), 0);

    console.log(
      `[Scheduler] Sincronização YouTube concluída: ${ok} canal(is) ok, ${fail} com erro. `
      + `Total: ${totalCreated} novos, ${totalUpdated} atualizados, `
      + `${totalIgnoredPrivacy} não públicos, ${totalIgnoredDuration} curtos.`
    );

    results.filter((r) => !r.success).forEach((r) => {
      console.warn(`[Scheduler] Canal "${r.channelName}" falhou: ${r.error}`);
    });
  } catch (err) {
    console.error('[Scheduler] Erro fatal na sincronização YouTube:', err.message);
  }
}

async function tickTicketEmailResgate() {
  const now = Date.now();
  if (now - ultimaTicketEmailResgateAt < TICKET_EMAIL_RESGATE_INTERVAL_MS) return;
  ultimaTicketEmailResgateAt = now;
  try {
    const result = await ticketResendService.autoSendPendingTickets({ limit: 50 });
    if (result.processed > 0) {
      console.log(`[Scheduler] ticket-email resgate: processados=${result.processed} enviados=${result.sent} falhas=${result.failed} pulados=${result.skipped}`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro no resgate de tickets:', err.message);
  }
}

const safe = (fn) => fn().catch((err) => console.error(`[Scheduler] Erro no tick (${fn.name}):`, err.message));

async function tick() {
  if (schedulerTickRunning) {
    console.warn('[Scheduler] Tick anterior ainda em andamento, pulando este ciclo.');
    return;
  }

  schedulerTickRunning = true;

  try {
    await [
      tickCampaigns,
      tickSequences,
      tickValidacaoCultos,
      tickCelulas,
      tickVideoTranscription,
      tickYoutubeChannelSync,
      tickTicketEmailResgate,
    ].reduce((promise, fn) => promise.then(() => safe(fn)), Promise.resolve());
  } catch (err) {
    console.error('[Scheduler] Erro no tick:', err.message);
  } finally {
    schedulerTickRunning = false;
  }
}

async function recoverStaleTranscripts() {
  try {
    const { VideoTranscript } = require('./models');
    const [count] = await VideoTranscript.update(
      {
        status: 'pending',
        progressPercent: 0,
        progressStage: null,
        errorMessage: 'Reiniciado apos restart do servidor',
      },
      { where: { status: 'processing' } }
    );
    if (count > 0) {
      console.log(`[Scheduler] ${count} transcricao(oes) orfa(s) resetada(s) para pending apos restart do servidor`);
    }
  } catch (err) {
    console.error('[Scheduler] Erro ao recuperar transcricoes orfas:', err.message);
  }
}

function startScheduler() {
  recoverStaleTranscripts();
  tick();
  setInterval(tick, 60000);
  console.log('[Scheduler] Iniciado — verificando campanhas e sequências agendadas a cada minuto.');
}

module.exports = { startScheduler };
