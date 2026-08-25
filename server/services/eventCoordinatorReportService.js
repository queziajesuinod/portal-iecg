/**
 * Monta o relatorio periodico enviado ao coordenador do evento.
 *
 * Reutiliza:
 *  - financialService.computeEventTicketNet  -> valor liquido do evento
 *  - registrationService.calcularResumoPagamentos -> pago/saldo/status derivado (parcial)
 *
 * O conteudo e as colunas das listas sao configuraveis por coordenador
 * (campos `content` e `listFields` do model EventCoordinator).
 */
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const {
  Event, EventBatch, FormField, Registration, RegistrationAttendee, RegistrationPayment
} = require('../models');
const registrationService = require('./registrationService');
const financialService = require('./financialService');
const { APP_TIMEZONE } = require('../utils/dateTime');

// Status considerados "inscricao ativa": apenas confirmado e parcial.
const ACTIVE_STATUSES = ['confirmed', 'partial'];

const STATUS_LABELS = {
  pending: 'Pendente',
  authorized: 'Autorizado',
  partial: 'Parcial',
  confirmed: 'Confirmado',
  denied: 'Negado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
};

const METHOD_LABELS = {
  credit_card: 'Cartao de Credito',
  pix: 'PIX',
  boleto: 'Boleto',
  offline: 'Presencial',
  free: 'Gratuito',
  manual: 'Manual',
  cash: 'Dinheiro',
  transfer: 'Transferencia',
  pos: 'Maquininha'
};

// Colunas padrao disponiveis para as listas (alem dos campos dinamicos do formulario).
const STANDARD_FIELDS = [
  { key: 'attendee.nome', label: 'Nome' },
  { key: 'batch.name', label: 'Lote' },
  { key: 'batch.sector', label: 'Setor' },
  { key: 'registration.orderCode', label: 'Codigo do pedido' },
  { key: 'registration.createdAt', label: 'Data da inscricao' },
  { key: 'registration.paymentMethod', label: 'Forma de pagamento' },
  { key: 'payment.status', label: 'Status do pagamento' },
  { key: 'payment.finalPrice', label: 'Valor final (pedido)' },
  { key: 'payment.paidTotal', label: 'Valor pago (pedido)' },
  { key: 'payment.remaining', label: 'Saldo restante (pedido)' }
];

const DEFAULT_LIST_FIELDS = ['attendee.nome', 'batch.name', 'payment.status'];

function money(value) {
  const n = Number(value) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function formatDateTime(value) {
  if (!value) return '';
  return moment.tz(value, APP_TIMEZONE).format('DD/MM/YYYY HH:mm');
}

function attendeeName(attendeeData = {}) {
  return attendeeData.nome_completo || attendeeData.nome || attendeeData.name || '-';
}

/**
 * Lista as colunas selecionaveis para um evento: campos padrao + campos
 * dinamicos do formulario (inscrito -> form.*, comprador -> buyer.*).
 */
async function getFieldOptions(eventId) {
  const formFields = await FormField.findAll({
    where: { eventId },
    order: [['section', 'ASC'], ['order', 'ASC']]
  });

  const form = formFields.map((f) => ({
    key: `${f.section === 'buyer' ? 'buyer' : 'form'}.${f.fieldName}`,
    label: f.fieldLabel,
    section: f.section === 'buyer' ? 'comprador' : 'inscrito'
  }));

  return { standard: STANDARD_FIELDS, form };
}

/**
 * Resolve o valor de uma coluna para uma linha (contexto = 1 inscrito).
 */
function resolveField(key, ctx) {
  const {
    attendeeData, buyerData, batch, registration, resumo
  } = ctx;

  switch (key) {
    case 'attendee.nome': return attendeeName(attendeeData);
    case 'batch.name': return batch?.name || '-';
    case 'batch.sector': return batch?.sector || '-';
    case 'registration.orderCode': return registration?.orderCode || '-';
    case 'registration.createdAt': return formatDateTime(registration?.createdAt);
    case 'registration.paymentMethod':
      return METHOD_LABELS[registration?.paymentMethod] || registration?.paymentMethod || '-';
    case 'payment.status': return STATUS_LABELS[resumo?.derivedStatus] || resumo?.derivedStatus || '-';
    case 'payment.finalPrice': return money(registration?.finalPrice);
    case 'payment.paidTotal': return money(resumo?.paidTotal);
    case 'payment.remaining': return money(resumo?.remaining);
    default: {
      if (key.startsWith('form.')) {
        const v = attendeeData?.[key.slice('form.'.length)];
        return formatCellValue(v);
      }
      if (key.startsWith('buyer.')) {
        const v = buyerData?.[key.slice('buyer.'.length)];
        return formatCellValue(v);
      }
      return '';
    }
  }
}

function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (Array.isArray(value)) return value.map(formatCellValue).join(' | ');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function fieldLabel(key, fieldOptions) {
  const all = [...fieldOptions.standard, ...fieldOptions.form];
  return all.find((f) => f.key === key)?.label || key;
}

/**
 * Agrupa os inscritos por um ou mais campos e conta quantos ha em cada valor.
 * Ex.: contabilizar "por Setor" -> [{ value: 'FRENTE', count: 20 }, ...].
 */
function buildBreakdowns(contexts, keys, fieldOptions) {
  return (Array.isArray(keys) ? keys : []).map((key) => {
    const map = new Map();
    contexts.forEach((ctx) => {
      let value = resolveField(key, ctx);
      if (value === '' || value === '-' || value === null || value === undefined) {
        value = '(sem valor)';
      }
      map.set(value, (map.get(value) || 0) + 1);
    });
    const items = Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value), 'pt-BR'));
    return { key, label: fieldLabel(key, fieldOptions), items };
  });
}

// Gera CSV (separador ';', com BOM UTF-8 para o Excel PT-BR).
function rowsToCsv(fields, rows, fieldOptions) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = fields.map((k) => escape(fieldLabel(k, fieldOptions))).join(';');
  const body = rows.map((ctx) => fields.map((k) => escape(resolveField(k, ctx))).join(';'));
  const BOM = '﻿';
  return BOM + [header, ...body].join('\r\n');
}

function sanitizeFileName(value) {
  return String(value || 'evento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'evento';
}

/**
 * Carrega todas as inscricoes ativas do evento e monta os "contextos" por
 * inscrito, ja com o resumo de pagamento (pago/saldo/status derivado).
 */
async function loadAttendeeContexts(eventId) {
  const registrations = await Registration.findAll({
    where: { eventId, paymentStatus: { [Op.in]: ACTIVE_STATUSES } },
    include: [
      {
        model: RegistrationAttendee,
        as: 'attendees',
        include: [{ model: EventBatch, as: 'batch' }]
      },
      { model: RegistrationPayment, as: 'payments' },
      { model: EventBatch, as: 'batch' }
    ],
    order: [['createdAt', 'DESC']]
  });

  const contexts = [];
  for (const registration of registrations) {
    const payments = registration.payments || [];
    const resumo = registrationService.calcularResumoPagamentos(registration, payments);
    const attendees = registration.attendees && registration.attendees.length
      ? registration.attendees
      : [null];

    for (const attendee of attendees) {
      contexts.push({
        registration,
        resumo,
        buyerData: registration.buyerData || {},
        attendee,
        attendeeData: attendee?.attendeeData || {},
        batch: attendee?.batch || registration.batch || null
      });
    }
  }
  return contexts;
}

/**
 * Monta o relatorio completo para um coordenador.
 * @param {EventCoordinator} coordinator - instancia (ou objeto) do coordenador
 * @param {object} opts - { since?: Date } base para "novos inscritos"
 * @returns relatorio pronto para envio (summary, attachments, emailHtml, whatsappText)
 */
async function buildReport(coordinator, opts = {}) {
  const { eventId } = coordinator;
  const event = await Event.findByPk(eventId, {
    attributes: ['id', 'title', 'registrationPaymentMode']
  });
  if (!event) throw new Error('Evento nao encontrado');

  const content = coordinator.content || {};
  const listFields = Array.isArray(coordinator.listFields) && coordinator.listFields.length
    ? coordinator.listFields
    : DEFAULT_LIST_FIELDS;
  const isBalanceDue = event.registrationPaymentMode === 'BALANCE_DUE';
  const since = opts.since ? new Date(opts.since) : null;

  const fieldOptions = await getFieldOptions(eventId);
  const contexts = await loadAttendeeContexts(eventId);

  // Metricas de resumo (contadas por inscrito).
  const summary = {
    totalAttendees: contexts.length,
    confirmed: 0,
    partial: 0,
    newCount: 0,
    netValue: 0,
    isBalanceDue
  };
  contexts.forEach((ctx) => {
    const st = ctx.resumo?.derivedStatus;
    if (st === 'partial') summary.partial += 1;
    else summary.confirmed += 1;
    if (since && ctx.registration?.createdAt && new Date(ctx.registration.createdAt) >= since) {
      summary.newCount += 1;
    }
  });

  if (content.netValue !== false) {
    summary.netValue = await financialService.computeEventTicketNet(eventId);
  }

  // Contabilizacao por campo (ex.: por Setor, por Lote) para exibir na mensagem.
  summary.breakdowns = buildBreakdowns(contexts, content.breakdownFields, fieldOptions);

  const dateTag = moment.tz(APP_TIMEZONE).format('YYYY-MM-DD');
  const baseName = sanitizeFileName(event.title);
  const attachments = [];
  // content.attachments === false => envio somente com o texto/resumo, sem CSVs.
  const withAttachments = content.attachments !== false;

  // Lista geral personalizada
  if (withAttachments && content.fullList !== false && contexts.length) {
    attachments.push({
      filename: `inscritos_${baseName}_${dateTag}.csv`,
      content: rowsToCsv(listFields, contexts, fieldOptions),
      contentType: 'text/csv; charset=utf-8'
    });
  }

  // Novos inscritos desde o ultimo envio
  let newContexts = [];
  if (withAttachments && content.newRegistrants !== false && since) {
    newContexts = contexts.filter(
      (ctx) => ctx.registration?.createdAt && new Date(ctx.registration.createdAt) >= since
    );
    if (newContexts.length) {
      attachments.push({
        filename: `novos_inscritos_${baseName}_${dateTag}.csv`,
        content: rowsToCsv(listFields, newContexts, fieldOptions),
        contentType: 'text/csv; charset=utf-8'
      });
    }
  }

  // Inscritos com pagamento parcial (somente eventos BALANCE_DUE)
  if (withAttachments && content.partialPayments !== false && isBalanceDue) {
    const partialContexts = contexts.filter((ctx) => ctx.resumo?.derivedStatus === 'partial');
    if (partialContexts.length) {
      // Garante colunas de saldo/pago na lista de parciais, na ordem escolhida + extras.
      const partialFields = Array.from(new Set([
        ...listFields,
        'payment.paidTotal',
        'payment.remaining'
      ]));
      attachments.push({
        filename: `parciais_${baseName}_${dateTag}.csv`,
        content: rowsToCsv(partialFields, partialContexts, fieldOptions),
        contentType: 'text/csv; charset=utf-8'
      });
    }
  }

  const generatedAt = new Date();
  const emailHtml = buildEmailHtml({
    event, coordinator, summary, content, attachments, since, generatedAt
  });
  const whatsappText = buildWhatsappText({
    event, summary, content, attachments, generatedAt
  });

  return {
    event: { id: event.id, title: event.title },
    generatedAt,
    since,
    summary,
    attachments,
    emailHtml,
    emailText: whatsappText,
    whatsappText,
    subject: `Relatorio do evento ${event.title} - ${moment.tz(generatedAt, APP_TIMEZONE).format('DD/MM/YYYY')}`
  };
}

function summaryLines(summary, content) {
  const lines = [];
  lines.push(['Inscritos ativos (confirmados + parciais)', summary.totalAttendees]);
  lines.push(['Confirmados', summary.confirmed]);
  if (summary.isBalanceDue && content.partialPayments !== false) {
    lines.push(['Pagamento parcial', summary.partial]);
  }
  return lines;
}

function buildEmailHtml({
  event, coordinator, summary, content, attachments, since, generatedAt
}) {
  const nome = coordinator.name || coordinator.member?.fullName || 'Coordenador(a)';
  const rows = summaryLines(summary, content)
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${value}</td>
      </tr>`)
    .join('');

  const newRow = (content.newRegistrants !== false && since) ? `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Novos inscritos desde ${formatDateTime(since)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${summary.newCount}</td>
      </tr>` : '';

  const netRow = (content.netValue !== false) ? `
      <tr>
        <td style="padding:8px 12px;color:#555;">Valor liquido do evento</td>
        <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#1b7e3c;">${money(summary.netValue)}</td>
      </tr>` : '';

  const anexoLista = attachments.length
    ? `<p style="color:#555;font-size:14px;">Listas em anexo (CSV): ${attachments.map((a) => a.filename).join(', ')}.</p>`
    : '';

  const breakdownsHtml = (summary.breakdowns || [])
    .filter((bd) => bd.items.length)
    .map((bd) => {
      const itens = bd.items
        .map((it) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">${it.value}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">${it.count}</td>
      </tr>`)
        .join('');
      return `
    <h3 style="color:#444;font-size:15px;margin:16px 0 4px;">Por ${bd.label}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${itens}</table>`;
    })
    .join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#333;">Relatorio do evento</h2>
    <p style="color:#555;">Ola, ${nome}.</p>
    <p style="color:#555;">Segue o resumo do evento <strong>${event.title}</strong>, gerado em ${formatDateTime(generatedAt)}.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      ${rows}
      ${newRow}
      ${netRow}
    </table>
    ${breakdownsHtml}
    ${anexoLista}
    <p style="color:#999;font-size:12px;margin-top:24px;">Portal IECG - envio automatico para o coordenador do evento.</p>
  </div>`;
}

function buildWhatsappText({
  event, summary, content, attachments, generatedAt
}) {
  const lines = [];
  lines.push(`*Relatorio do evento ${event.title}*`);
  lines.push(`_${formatDateTime(generatedAt)}_`);
  lines.push('');
  lines.push(`Inscritos ativos (confirmados + parciais): *${summary.totalAttendees}*`);
  lines.push(`Confirmados: *${summary.confirmed}*`);
  if (summary.isBalanceDue && content.partialPayments !== false) {
    lines.push(`Pagamento parcial: *${summary.partial}*`);
  }
  if (content.newRegistrants !== false) {
    lines.push(`Novos inscritos: *${summary.newCount}*`);
  }
  if (content.netValue !== false) {
    lines.push(`Valor liquido: *${money(summary.netValue)}*`);
  }
  (summary.breakdowns || []).forEach((bd) => {
    if (!bd.items.length) return;
    lines.push('');
    lines.push(`*Por ${bd.label}:*`);
    bd.items.forEach((it) => lines.push(`  ${it.value}: ${it.count}`));
  });
  if (attachments.length) {
    lines.push('');
    lines.push('As listas seguem em anexo (arquivos abaixo).');
  }
  return lines.join('\n');
}

module.exports = {
  buildReport,
  getFieldOptions,
  STANDARD_FIELDS,
  DEFAULT_LIST_FIELDS
};
