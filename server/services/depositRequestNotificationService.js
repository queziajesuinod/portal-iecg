/**
 * Notificacoes da solicitacao de entrada abaixo do minimo (e-mail + WhatsApp).
 * Reaproveita os canais do evento (Event.ticketChannels) e o link de pagamento pendente.
 */
const moment = require('moment-timezone');
const { Event } = require('../models');
const emailService = require('./emailService');
const evolutionApiService = require('./evolutionApiService');
const { buildOfferLink } = require('./waitlistNotificationService');

const TIMEZONE = 'America/Campo_Grande';

function money(v) {
  const n = Number(v) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function fmtDate(value) {
  if (!value) return null;
  return moment(value).tz(TIMEZONE).format('DD/MM/YYYY [as] HH:mm');
}

function firstName(name) {
  return name ? String(name).trim().split(/\s+/)[0] : '';
}

function emailShell(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;color:#222;">
  <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <tr><td style="padding:24px 28px;background:#1e40af;color:#fff;"><h2 style="margin:0;font-size:20px;">${title}</h2></td></tr>
    <tr><td style="padding:28px;">${bodyHtml}</td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;color:#888;font-size:12px;text-align:center;">Portal IECG — Igreja Evangelica Comunidade Global</td></tr>
  </table>
</body></html>`.trim();
}

function channelsFor(event) {
  const cfg = event?.ticketChannels || { email: true, whatsapp: false };
  return { email: cfg.email !== false, whatsapp: cfg.whatsapp === true };
}

async function loadContext(registration) {
  const event = registration.event || await Event.findByPk(registration.eventId, {
    attributes: ['id', 'title', 'ticketChannels', 'registrationPaymentMode']
  });
  const buyer = registration.buyerData || {};
  return {
    event,
    buyerName: buyer.buyer_name || buyer.nome || buyer.name || null,
    email: (buyer.buyer_email || buyer.email || '').trim().toLowerCase() || null,
    whatsapp: buyer.buyer_whatsapp || buyer.buyer_phone || null,
  };
}

async function enviar(registration, ctx, tmpl) {
  const channels = channelsFor(ctx.event);
  const result = {};
  if (channels.email && ctx.email && emailService.isConfigured()) {
    try {
      const info = await emailService.sendMail({
        to: ctx.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text
      });
      result.email = { ok: true, messageId: info.messageId };
    } catch (err) { result.email = { ok: false, error: err.message }; }
  }
  if (channels.whatsapp && ctx.whatsapp) {
    try {
      const r = await evolutionApiService.enviarMensagemTexto(ctx.whatsapp, tmpl.text);
      result.whatsapp = r.sucesso ? { ok: true, externalId: r.externalId } : { ok: false, error: r.erro };
    } catch (err) { result.whatsapp = { ok: false, error: err.message }; }
  }
  return result;
}

async function notifyRequested(registration) {
  const ctx = await loadContext(registration);
  const eventName = ctx.event?.title || 'evento';
  const ola = ctx.buyerName ? `Ola, <strong>${firstName(ctx.buyerName)}</strong>!` : 'Ola!';
  const html = emailShell('Solicitacao recebida', `
    <p style="font-size:16px;margin:0 0 16px;">${ola}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px;">
      Recebemos sua solicitacao para entrar na inscricao de <strong>${eventName}</strong> com
      uma entrada de <strong>${money(registration.requestedDepositAmount)}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.5;margin:0;">
      Nossa equipe vai avaliar e, se aprovada, voce recebe um link para pagar. Fique de olho no e-mail e WhatsApp.
    </p>`);
  const text = [
    ctx.buyerName ? `Ola, ${firstName(ctx.buyerName)}!` : 'Ola!', '',
    `Recebemos sua solicitacao de entrada de ${money(registration.requestedDepositAmount)} para ${eventName}.`,
    'Se aprovada, enviaremos um link para pagar.', '', 'Equipe IECG',
  ].join('\n');
  return enviar(registration, ctx, { subject: `Solicitacao de entrada — ${eventName}`, html, text });
}

async function notifyApproved(registration) {
  const ctx = await loadContext(registration);
  const eventName = ctx.event?.title || 'evento';
  const link = buildOfferLink(registration.orderCode, 'BALANCE_DUE');
  const prazo = fmtDate(registration.depositOfferExpiresAt);
  const ola = ctx.buyerName ? `Ola, <strong>${firstName(ctx.buyerName)}</strong>!` : 'Ola!';
  const html = emailShell('Sua entrada foi aprovada! 🎉', `
    <p style="font-size:16px;margin:0 0 16px;">${ola}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
      Boa noticia: sua entrada de <strong>${money(registration.approvedDepositAmount)}</strong> para
      <strong>${eventName}</strong> foi <strong>aprovada</strong>!
    </p>
    ${prazo ? `<p style="font-size:14px;color:#b91c1c;margin:0 0 16px;">Pague ate <strong>${prazo}</strong> para garantir sua vaga.</p>` : ''}
    <p style="margin:0 0 20px;">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Pagar minha entrada</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#888;">Ou copie o link:</p>
    <p style="margin:0;font-size:13px;color:#555;word-break:break-all;">${link}</p>
    <p style="font-size:13px;color:#888;margin:16px 0 0;">O valor restante pode ser pago depois, conforme as regras do evento.</p>`);
  const text = [
    ctx.buyerName ? `Ola, ${firstName(ctx.buyerName)}!` : 'Ola!', '',
    `Sua entrada de ${money(registration.approvedDepositAmount)} para ${eventName} foi aprovada!`,
    prazo ? `Pague ate ${prazo} para garantir a vaga.` : '',
    `Link para pagar: ${link}`, '', 'Equipe IECG',
  ].filter(Boolean).join('\n');
  return enviar(registration, ctx, { subject: `🎉 Entrada aprovada — ${eventName}`, html, text });
}

async function notifyRejected(registration, { expired = false } = {}) {
  const ctx = await loadContext(registration);
  const eventName = ctx.event?.title || 'evento';
  const ola = ctx.buyerName ? `Ola, ${firstName(ctx.buyerName)}` : 'Ola';
  const motivo = expired
    ? 'o prazo para pagar a entrada aprovada terminou'
    : 'nao foi possivel aprovar sua solicitacao de entrada';
  const html = emailShell('Sobre sua solicitacao de entrada', `
    <p style="font-size:16px;margin:0 0 16px;">${ola},</p>
    <p style="font-size:15px;line-height:1.5;margin:0;">
      Referente a <strong>${eventName}</strong>: ${motivo}. Se ainda tiver interesse, entre em contato ou
      faca a inscricao com o sinal minimo.
    </p>`);
  const text = [
    `${ola},`, '',
    `Referente a ${eventName}: ${motivo}.`,
    'Se ainda tiver interesse, faca a inscricao com o sinal minimo.', '', 'Equipe IECG',
  ].join('\n');
  return enviar(registration, ctx, { subject: `Solicitacao de entrada — ${eventName}`, html, text });
}

module.exports = { notifyRequested, notifyApproved, notifyRejected };
