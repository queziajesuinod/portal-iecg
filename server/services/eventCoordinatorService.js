/**
 * Coordenador de evento: CRUD, validacao de canais, envio (manual/agendado)
 * e computo da agenda de disparos.
 *
 * Envio reutiliza emailService (e-mail + anexos CSV) e evolutionApiService
 * (WhatsApp: texto + documentos em base64). O conteudo vem do
 * eventCoordinatorReportService.
 */
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const {
  EventCoordinator, EventCoordinatorLog, EventBatch, Member
} = require('../models');
const reportService = require('./eventCoordinatorReportService');
const emailService = require('./emailService');
const evolutionApiService = require('./evolutionApiService');
const { APP_TIMEZONE } = require('../utils/dateTime');

const MEMBER_ATTRS = ['id', 'fullName', 'email', 'phone', 'whatsapp'];

const EDITABLE_FIELDS = [
  'memberId', 'name', 'email', 'phone', 'channels', 'content', 'listFields',
  'intervalDays', 'sendHour', 'windowSource', 'windowStart', 'windowEnd', 'isActive'
];

function sanitizeInput(data = {}) {
  const out = {};
  EDITABLE_FIELDS.forEach((f) => {
    if (data[f] !== undefined) out[f] = data[f];
  });
  if (out.intervalDays !== undefined) {
    const n = parseInt(out.intervalDays, 10);
    out.intervalDays = Number.isFinite(n) && n > 0 ? n : 2;
  }
  if (out.sendHour !== undefined) {
    const h = parseInt(out.sendHour, 10);
    out.sendHour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 8;
  }
  if (out.listFields !== undefined && !Array.isArray(out.listFields)) {
    out.listFields = [];
  }
  return out;
}

function firstRunAt(coordinator) {
  const base = moment.tz(APP_TIMEZONE);
  const candidate = base.clone()
    .hour(coordinator.sendHour ?? 8).minute(0).second(0)
    .millisecond(0);
  if (candidate.isSameOrBefore(base)) candidate.add(1, 'day');
  return candidate.toDate();
}

function computeNextRunAt(coordinator, fromDate) {
  return moment.tz(fromDate, APP_TIMEZONE)
    .add(coordinator.intervalDays || 2, 'days')
    .hour(coordinator.sendHour ?? 8).minute(0)
    .second(0)
    .millisecond(0)
    .toDate();
}

function resolveContact(coordinator) {
  const member = coordinator.member || null;
  return {
    name: coordinator.name || member?.fullName || null,
    email: coordinator.email || member?.email || null,
    phone: coordinator.phone || member?.whatsapp || member?.phone || null
  };
}

async function isWithinWindow(coordinator, now = new Date()) {
  if (coordinator.windowSource === 'CUSTOM') {
    if (coordinator.windowStart && now < new Date(coordinator.windowStart)) return false;
    if (coordinator.windowEnd && now > new Date(coordinator.windowEnd)) return false;
    return true;
  }
  const batches = await EventBatch.findAll({
    where: { eventId: coordinator.eventId, isActive: true },
    attributes: ['startDate', 'endDate']
  });
  if (!batches.length) return true;
  const starts = batches.map((b) => b.startDate).filter(Boolean).map((d) => new Date(d).getTime());
  const ends = batches.map((b) => b.endDate).filter(Boolean).map((d) => new Date(d).getTime());
  if (starts.length && now.getTime() < Math.min(...starts)) return false;
  if (ends.length && now.getTime() > Math.max(...ends)) return false;
  return true;
}

// ===================== CRUD =====================

async function listByEvent(eventId) {
  return EventCoordinator.findAll({
    where: { eventId },
    include: [{ model: Member, as: 'member', attributes: MEMBER_ATTRS }],
    order: [['createdAt', 'ASC']]
  });
}

async function getById(id) {
  const coordinator = await EventCoordinator.findByPk(id, {
    include: [{ model: Member, as: 'member', attributes: MEMBER_ATTRS }]
  });
  if (!coordinator) throw new Error('Coordenador nao encontrado');
  return coordinator;
}

async function create(eventId, data, userId = null) {
  const payload = sanitizeInput(data);
  payload.eventId = eventId;
  payload.createdBy = userId;
  const draft = EventCoordinator.build(payload);
  draft.nextRunAt = draft.isActive ? firstRunAt(draft) : null;
  await draft.save();
  return getById(draft.id);
}

async function update(id, data) {
  const coordinator = await getById(id);
  const payload = sanitizeInput(data);
  const scheduleChanged = ['intervalDays', 'sendHour', 'isActive'].some((f) => f in payload);
  await coordinator.update(payload);

  if (!coordinator.isActive) {
    coordinator.nextRunAt = null;
    await coordinator.save();
  } else if (!coordinator.nextRunAt || scheduleChanged) {
    coordinator.nextRunAt = firstRunAt(coordinator);
    await coordinator.save();
  }
  return getById(id);
}

async function remove(id) {
  const coordinator = await EventCoordinator.findByPk(id);
  if (!coordinator) throw new Error('Coordenador nao encontrado');
  await coordinator.destroy();
}

async function listLogs(id, limit = 30) {
  return EventCoordinatorLog.findAll({
    where: { coordinatorId: id },
    order: [['createdAt', 'DESC']],
    limit
  });
}

function getFieldOptions(eventId) {
  return reportService.getFieldOptions(eventId);
}

// ===================== Validacao de canais =====================

async function validate(id) {
  const coordinator = await getById(id);
  const contact = resolveContact(coordinator);
  const channels = coordinator.channels || {};
  const result = { contact };

  if (channels.email) {
    if (!contact.email) {
      result.email = { ok: false, message: 'Nenhum e-mail de destino configurado' };
    } else {
      try {
        const info = await emailService.verifyConnection();
        result.email = { ok: true, message: `SMTP OK (remetente ${info.from})`, to: contact.email };
      } catch (err) {
        result.email = { ok: false, message: err.message };
      }
    }
  }

  if (channels.whatsapp) {
    if (!contact.phone) {
      result.whatsapp = { ok: false, message: 'Nenhum telefone de destino configurado' };
    } else {
      try {
        const data = await evolutionApiService.validarNumeroWhatsapp(contact.phone);
        const entry = Array.isArray(data) ? data[0] : null;
        const exists = entry?.exists === true;
        result.whatsapp = exists
          ? { ok: true, message: 'Numero valido no WhatsApp', jid: entry.jid }
          : { ok: false, message: 'Numero nao encontrado no WhatsApp' };
      } catch (err) {
        result.whatsapp = { ok: false, message: err.message };
      }
    }
  }

  return result;
}

// ===================== Envio =====================

async function logSend(coordinator, {
  channel, trigger, status, recipient, externalId, error, snapshot, userId
}) {
  try {
    await EventCoordinatorLog.create({
      coordinatorId: coordinator.id,
      channel,
      trigger,
      status,
      recipient: recipient || null,
      externalId: externalId || null,
      error: error || null,
      snapshot: snapshot || null,
      createdBy: userId || null
    });
  } catch (err) {
    console.error('[EventCoordinator] Falha ao gravar log de envio:', err.message);
  }
}

/**
 * Envia o relatorio ao coordenador pelos canais habilitados.
 * @param {EventCoordinator} coordinator - deve vir com `member` incluido
 * @param {object} opts - { trigger: 'scheduled'|'manual'|'test', userId, testMode }
 */
async function send(coordinator, opts = {}) {
  const trigger = opts.trigger || 'manual';
  const testMode = opts.testMode || trigger === 'test';
  const userId = opts.userId || null;
  const contact = resolveContact(coordinator);
  const channels = coordinator.channels || {};

  if (!channels.email && !channels.whatsapp) {
    throw new Error('Nenhum canal de envio habilitado para este coordenador');
  }

  // "Novos inscritos" = desde o ultimo relatorio enviado. No primeiro envio
  // (sem relatorio anterior), usa a janela do intervalo como periodo coberto,
  // em vez de listar todo o historico como "novo".
  let since = coordinator.lastSentAt ? new Date(coordinator.lastSentAt) : null;
  if (!since) {
    since = moment.tz(APP_TIMEZONE).subtract(coordinator.intervalDays || 2, 'days').toDate();
  }

  const report = await reportService.buildReport(coordinator, { since });
  const snapshot = report.summary;
  const results = [];

  if (channels.email) {
    if (!contact.email) {
      results.push({ channel: 'email', status: 'failed', error: 'Sem e-mail de destino' });
      await logSend(coordinator, {
        channel: 'email', trigger, status: 'failed', error: 'Sem e-mail de destino', snapshot, userId
      });
    } else {
      try {
        const info = await emailService.sendMail({
          to: contact.email,
          subject: report.subject,
          html: report.emailHtml,
          text: report.emailText,
          attachments: report.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, 'utf8'),
            contentType: a.contentType
          }))
        });
        results.push({ channel: 'email', status: 'sent', externalId: info.messageId });
        await logSend(coordinator, {
          channel: 'email', trigger, status: 'sent', recipient: contact.email, externalId: info.messageId, snapshot, userId
        });
      } catch (err) {
        results.push({ channel: 'email', status: 'failed', error: err.message });
        await logSend(coordinator, {
          channel: 'email', trigger, status: 'failed', recipient: contact.email, error: err.message, snapshot, userId
        });
      }
    }
  }

  if (channels.whatsapp) {
    if (!contact.phone) {
      results.push({ channel: 'whatsapp', status: 'failed', error: 'Sem telefone de destino' });
      await logSend(coordinator, {
        channel: 'whatsapp', trigger, status: 'failed', error: 'Sem telefone de destino', snapshot, userId
      });
    } else {
      const textResp = await evolutionApiService.enviarMensagemTexto(contact.phone, report.whatsappText);
      let anyFail = !textResp.sucesso;
      let lastError = textResp.sucesso ? null : textResp.erro;
      for (const a of report.attachments) {
        const base64 = Buffer.from(a.content, 'utf8').toString('base64');
        // eslint-disable-next-line no-await-in-loop
        const docResp = await evolutionApiService.enviarDocumentoBase64(
          contact.phone, base64, a.filename, '', 'text/csv'
        );
        if (!docResp.sucesso) {
          anyFail = true;
          lastError = docResp.erro;
        }
      }
      const status = anyFail ? 'failed' : 'sent';
      results.push({
        channel: 'whatsapp', status, externalId: textResp.externalId, error: lastError
      });
      await logSend(coordinator, {
        channel: 'whatsapp', trigger, status, recipient: contact.phone, externalId: textResp.externalId, error: lastError, snapshot, userId
      });
    }
  }

  // Atualiza agenda (nao no modo teste).
  if (!testMode) {
    const now = new Date();
    coordinator.lastSentAt = now;
    coordinator.nextRunAt = coordinator.isActive ? computeNextRunAt(coordinator, now) : null;
    await coordinator.save();
  }

  return {
    results,
    summary: snapshot,
    attachments: report.attachments.map((a) => a.filename),
    contact
  };
}

async function sendById(id, opts = {}) {
  const coordinator = await getById(id);
  return send(coordinator, opts);
}

// ===================== Job agendado =====================

async function dispatchDue(now = new Date(), limit = 5) {
  const due = await EventCoordinator.findAll({
    where: {
      isActive: true,
      nextRunAt: { [Op.lte]: now }
    },
    include: [{ model: Member, as: 'member', attributes: MEMBER_ATTRS }],
    order: [['nextRunAt', 'ASC']],
    limit
  });

  let sent = 0;
  let skipped = 0;
  for (const coordinator of due) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const within = await isWithinWindow(coordinator, now);
      if (!within) {
        // Fora do periodo de inscricao: reagenda para reavaliar depois, sem enviar.
        coordinator.nextRunAt = computeNextRunAt(coordinator, now);
        // eslint-disable-next-line no-await-in-loop
        await coordinator.save();
        skipped += 1;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await send(coordinator, { trigger: 'scheduled' });
      sent += 1;
    } catch (err) {
      console.error(`[EventCoordinator] Erro ao enviar relatorio (coordinator ${coordinator.id}):`, err.message);
      // Evita loop apertado em caso de erro persistente.
      coordinator.nextRunAt = computeNextRunAt(coordinator, now);
      // eslint-disable-next-line no-await-in-loop
      await coordinator.save().catch(() => {});
    }
  }
  return { processed: due.length, sent, skipped };
}

module.exports = {
  listByEvent,
  getById,
  create,
  update,
  remove,
  listLogs,
  getFieldOptions,
  validate,
  send,
  sendById,
  dispatchDue,
  computeNextRunAt,
  isWithinWindow,
  resolveContact
};
