const moment = require('moment-timezone');
const { Registration, Event } = require('../models');
const evolutionApiService = require('./evolutionApiService');
const emailService = require('./emailService');

const TIMEZONE = 'America/Campo_Grande';

function getTicketBaseUrl() {
  return (process.env.TICKET_BASE_URL || 'https://start.iecg.com.br/ticket').replace(/\/+$/, '');
}

function normalizeWhatsappDigits(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  const raw = digits.startsWith('55') ? digits.slice(2) : digits;
  if (!raw) return null;
  if (raw.length >= 10) {
    const ddd = raw.slice(0, 2);
    let number = raw.slice(2);
    if (number.length === 9) number = number.slice(1);
    return `55${ddd}${number}`;
  }
  return `55${raw}`;
}

function buildTicketLink(orderCode) {
  return `${getTicketBaseUrl()}/${encodeURIComponent(orderCode)}`;
}

function buildWhatsappMessage({
  buyerName, eventName, eventDate, orderCode
}) {
  const link = buildTicketLink(orderCode);
  const greeting = buyerName ? `Olá, *${buyerName.split(' ')[0]}*!` : 'Olá!';
  const dataFormatada = eventDate
    ? moment(eventDate).tz(TIMEZONE).format('DD/MM/YYYY [às] HH:mm')
    : null;
  return [
    greeting,
    '',
    `Seguem os ingressos da sua inscrição em *${eventName}*${dataFormatada ? ` (${dataFormatada})` : ''}.`,
    '',
    `🎟️ Código do pedido: *${orderCode}*`,
    `🔗 Acesse seu ingresso: ${link}`,
    '',
    'Apresente este link na entrada do evento para fazer check-in.',
    '',
    'Em caso de dúvidas, responda esta mensagem.',
    'Equipe IECG 🙏',
  ].join('\n');
}

function buildEmailHtml({
  buyerName, eventName, eventDate, orderCode
}) {
  const link = buildTicketLink(orderCode);
  const dataFormatada = eventDate
    ? moment(eventDate).tz(TIMEZONE).format('DD/MM/YYYY [às] HH:mm')
    : null;
  const firstName = buyerName ? buyerName.split(' ')[0] : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Seu ingresso</title></head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;color:#222;">
  <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <tr><td style="padding:24px 28px;background:#1e40af;color:#fff;">
      <h2 style="margin:0;font-size:20px;">🎟️ Seu ingresso está pronto</h2>
    </td></tr>
    <tr><td style="padding:28px;">
      <p style="margin:0 0 16px;font-size:16px;">${firstName ? `Olá, <strong>${firstName}</strong>!` : 'Olá!'}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Seguem os detalhes da sua inscrição em <strong>${eventName}</strong>${dataFormatada ? ` (${dataFormatada})` : ''}.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#555;">Código do pedido</p>
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#111;">${orderCode}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#555;">Acesse seu ingresso</p>
      <p style="margin:0 0 24px;">
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Abrir ingresso</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#888;">Ou copie o link abaixo:</p>
      <p style="margin:0 0 24px;font-size:13px;color:#555;word-break:break-all;">${link}</p>
      <p style="margin:0 0 0;font-size:14px;line-height:1.5;color:#555;">
        Apresente este link na entrada do evento para fazer o check-in. Em caso de dúvidas, responda este email.
      </p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;color:#888;font-size:12px;text-align:center;">
      Portal IECG — Igreja Evangélica Cristo Glória
    </td></tr>
  </table>
</body></html>`.trim();
}

function buildEmailText({
  buyerName, eventName, eventDate, orderCode
}) {
  const link = buildTicketLink(orderCode);
  const dataFormatada = eventDate
    ? moment(eventDate).tz(TIMEZONE).format('DD/MM/YYYY [às] HH:mm')
    : null;
  const firstName = buyerName ? buyerName.split(' ')[0] : '';
  return [
    firstName ? `Olá, ${firstName}!` : 'Olá!',
    '',
    `Seguem os detalhes da sua inscrição em ${eventName}${dataFormatada ? ` (${dataFormatada})` : ''}.`,
    '',
    `Código do pedido: ${orderCode}`,
    `Link do ingresso: ${link}`,
    '',
    'Apresente este link na entrada do evento para fazer o check-in.',
    '',
    'Equipe IECG',
  ].join('\n');
}

async function loadRegistration(registrationId) {
  const registration = await Registration.findByPk(registrationId, {
    include: [{ model: Event, as: 'event' }],
  });
  if (!registration) throw new Error('Inscrição não encontrada');
  if (!registration.orderCode) throw new Error('Inscrição sem orderCode (não há link de ticket)');
  return registration;
}

async function resendByWhatsapp(registrationId, { instanceName } = {}) {
  const registration = await loadRegistration(registrationId);
  const buyer = registration.buyerData || {};
  const phone = buyer.buyer_whatsapp || buyer.buyer_phone;
  const normalizedPhone = normalizeWhatsappDigits(phone);
  if (!normalizedPhone) {
    throw new Error('Comprador sem WhatsApp válido em buyerData');
  }

  const message = buildWhatsappMessage({
    buyerName: buyer.buyer_name,
    eventName: registration.event?.name || 'evento',
    eventDate: registration.event?.startDate || registration.event?.date,
    orderCode: registration.orderCode,
  });

  const evolutionInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME;
  const validation = await evolutionApiService.validarNumeroWhatsapp(normalizedPhone, evolutionInstance);
  const isValid = !validation || (typeof validation.valid === 'boolean' ? validation.valid : true);
  if (!isValid) {
    throw new Error(validation?.message || 'Número de WhatsApp inválido ou desconectado');
  }

  const result = await evolutionApiService.enviarMensagemTexto(normalizedPhone, message, evolutionInstance);
  if (!result.sucesso) {
    throw new Error(result.erro || 'Falha ao enviar via Evolution API');
  }

  return {
    channel: 'whatsapp',
    recipient: normalizedPhone,
    externalId: result.externalId,
    orderCode: registration.orderCode,
    link: buildTicketLink(registration.orderCode),
  };
}

async function resendByEmail(registrationId) {
  if (!emailService.isConfigured()) {
    throw new Error('SMTP não configurado (defina SMTP_HOST/USER/PASS no .env)');
  }
  const registration = await loadRegistration(registrationId);
  const buyer = registration.buyerData || {};
  const recipient = buyer.buyer_email;
  if (!recipient) {
    throw new Error('Comprador sem email em buyerData');
  }

  const ctx = {
    buyerName: buyer.buyer_name,
    eventName: registration.event?.name || 'evento',
    eventDate: registration.event?.startDate || registration.event?.date,
    orderCode: registration.orderCode,
  };
  const html = buildEmailHtml(ctx);
  const text = buildEmailText(ctx);
  const subject = `🎟️ Seu ingresso — ${ctx.eventName}`;

  const result = await emailService.sendMail({
    to: recipient,
    subject,
    html,
    text,
  });

  return {
    channel: 'email',
    recipient,
    externalId: result.messageId,
    orderCode: registration.orderCode,
    link: buildTicketLink(registration.orderCode),
  };
}

async function resend(registrationId, channel, options = {}) {
  if (channel === 'whatsapp') return resendByWhatsapp(registrationId, options);
  if (channel === 'email') return resendByEmail(registrationId);
  throw new Error(`Canal "${channel}" não suportado. Use "email" ou "whatsapp".`);
}

module.exports = {
  resend,
  resendByWhatsapp,
  resendByEmail,
  buildTicketLink,
  buildWhatsappMessage,
  buildEmailHtml,
  buildEmailText,
};
