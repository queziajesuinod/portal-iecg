/**
 * Notificacoes da lista de espera (e-mail + WhatsApp).
 * Canais escolhidos por evento em Event.waitlistChannels = { email, whatsapp }.
 */
const moment = require('moment-timezone');
const { Event, EventBatch } = require('../models');
const emailService = require('./emailService');
const evolutionApiService = require('./evolutionApiService');

const TIMEZONE = 'America/Campo_Grande';

function getOfferBaseUrl() {
  return (process.env.WAITLIST_OFFER_BASE_URL
    || process.env.PUBLIC_APP_URL
    || 'https://app.iecg.com.br').replace(/\/+$/, '');
}

// Link publico para pagar a inscricao pendente.
// BALANCE_DUE -> tela de pagamento pendente (escolhe sinal/total). SINGLE -> mostra o PIX cheio.
function buildOfferLink(orderCode, paymentMode) {
  const base = `${getOfferBaseUrl()}/inscricao/${encodeURIComponent(orderCode)}`;
  return paymentMode === 'BALANCE_DUE' ? `${base}/visualizacao` : base;
}

function fmtDate(value) {
  if (!value) return null;
  return moment(value).tz(TIMEZONE).format('DD/MM/YYYY [as] HH:mm');
}

function firstName(name) {
  return name ? String(name).trim().split(/\s+/)[0] : '';
}

async function loadContext(entry) {
  const event = entry.event || await Event.findByPk(entry.eventId, {
    attributes: ['id', 'title', 'startDate', 'waitlistChannels', 'registrationPaymentMode']
  });
  const batch = entry.batch || await EventBatch.findByPk(entry.batchId, {
    attributes: ['id', 'name', 'sector']
  });
  return { event, batch };
}

function channelsFor(event) {
  const cfg = event?.waitlistChannels || { email: true, whatsapp: false };
  return { email: cfg.email !== false, whatsapp: cfg.whatsapp === true };
}

// ---------- Templates ----------

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

function tmplJoined({
  nome, eventName, batchName, position
}) {
  const ola = nome ? `Ola, <strong>${firstName(nome)}</strong>!` : 'Ola!';
  const pos = position ? ` Sua posicao atual e <strong>#${position}</strong>.` : '';
  const html = emailShell('Voce entrou na lista de espera', `
    <p style="font-size:16px;margin:0 0 16px;">${ola}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
      O lote <strong>${batchName}</strong> de <strong>${eventName}</strong> esta esgotado, entao voce entrou na
      <strong>lista de espera</strong>.${pos}
    </p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px;">
      Assim que uma vaga abrir, enviaremos um link para voce concluir o pagamento e garantir sua inscricao.
      Fique de olho no seu e-mail e WhatsApp.
    </p>`);
  const text = [
    nome ? `Ola, ${firstName(nome)}!` : 'Ola!',
    '',
    `O lote ${batchName} de ${eventName} esta esgotado. Voce entrou na lista de espera.${position ? ` Posicao atual: #${position}.` : ''}`,
    'Assim que abrir vaga, enviaremos um link para concluir o pagamento.',
    '',
    'Equipe IECG',
  ].join('\n');
  return { subject: `Lista de espera — ${eventName}`, html, text };
}

function tmplOffer({
  nome, eventName, batchName, link, prazo, parcial
}) {
  const ola = nome ? `Ola, <strong>${firstName(nome)}</strong>!` : 'Ola!';
  const prazoTxt = prazo ? ` Voce tem ate <strong>${prazo}</strong> para pagar, ou a vaga sera oferecida ao proximo da fila.` : '';
  const parcialHtml = parcial
    ? `<p style="font-size:14px;line-height:1.5;margin:0 0 20px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;">
         💡 Voce pode pagar apenas o <strong>sinal</strong> agora para garantir a sua vaga — o valor restante pode ser pago depois.
       </p>`
    : '';
  const parcialText = parcial
    ? 'Voce pode pagar apenas o sinal agora para garantir a sua vaga (o restante fica para depois).'
    : '';
  const html = emailShell('Abriu uma vaga para voce! 🎉', `
    <p style="font-size:16px;margin:0 0 16px;">${ola}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
      Boas noticias: abriu uma vaga no lote <strong>${batchName}</strong> de <strong>${eventName}</strong> e ela e sua!
    </p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 20px;color:#b91c1c;">${prazoTxt}</p>
    ${parcialHtml}
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Pagar e garantir minha vaga</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#888;">Ou copie o link:</p>
    <p style="margin:0;font-size:13px;color:#555;word-break:break-all;">${link}</p>`);
  const text = [
    nome ? `Ola, ${firstName(nome)}!` : 'Ola!',
    '',
    `Abriu uma vaga no lote ${batchName} de ${eventName} e ela e sua!`,
    prazo ? `Pague ate ${prazo} para nao perder a vaga.` : '',
    parcialText,
    `Link para pagar: ${link}`,
    '',
    'Equipe IECG',
  ].filter(Boolean).join('\n');
  return { subject: `🎉 Abriu vaga — ${eventName}`, html, text };
}

function tmplExpired({ nome, eventName, batchName }) {
  const ola = nome ? `Ola, ${firstName(nome)}` : 'Ola';
  const html = emailShell('Sua oferta de vaga expirou', `
    <p style="font-size:16px;margin:0 0 16px;">${ola},</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px;">
      O prazo para concluir o pagamento da vaga no lote <strong>${batchName}</strong> de <strong>${eventName}</strong> terminou,
      e a vaga foi oferecida ao proximo da fila.
    </p>
    <p style="font-size:15px;line-height:1.5;margin:0;">Se ainda tiver interesse, entre novamente na lista de espera.</p>`);
  const text = [
    `${ola},`,
    '',
    `O prazo para pagar a vaga no lote ${batchName} de ${eventName} expirou e a vaga foi para o proximo da fila.`,
    'Se tiver interesse, entre novamente na lista de espera.',
    '',
    'Equipe IECG',
  ].join('\n');
  return { subject: `Oferta de vaga expirou — ${eventName}`, html, text };
}

// ---------- Envio ----------

async function enviar(entry, tmpl) {
  const { event } = await loadContext(entry);
  const channels = channelsFor(event);
  const result = {};

  if (channels.email && entry.contactEmail && emailService.isConfigured()) {
    try {
      const info = await emailService.sendMail({
        to: entry.contactEmail, subject: tmpl.subject, html: tmpl.html, text: tmpl.text
      });
      result.email = { ok: true, messageId: info.messageId };
    } catch (err) {
      result.email = { ok: false, error: err.message };
    }
  }

  if (channels.whatsapp && entry.contactWhatsapp) {
    try {
      const r = await evolutionApiService.enviarMensagemTexto(entry.contactWhatsapp, tmpl.text);
      result.whatsapp = r.sucesso ? { ok: true, externalId: r.externalId } : { ok: false, error: r.erro };
    } catch (err) {
      result.whatsapp = { ok: false, error: err.message };
    }
  }

  await entry.update({ lastNotifiedChannels: result }).catch(() => {});
  return result;
}

async function notifyJoined(entry, { position } = {}) {
  const { event, batch } = await loadContext(entry);
  return enviar(entry, tmplJoined({
    nome: entry.contactName,
    eventName: event?.title || 'evento',
    batchName: batch?.name || 'lote',
    position,
  }));
}

async function notifyOffer(entry, registration) {
  const { event, batch } = await loadContext(entry);
  return enviar(entry, tmplOffer({
    nome: entry.contactName,
    eventName: event?.title || 'evento',
    batchName: batch?.name || 'lote',
    link: buildOfferLink(registration.orderCode, event?.registrationPaymentMode),
    prazo: fmtDate(entry.offerExpiresAt),
  }));
}

async function notifyExpired(entry) {
  const { event, batch } = await loadContext(entry);
  return enviar(entry, tmplExpired({
    nome: entry.contactName,
    eventName: event?.title || 'evento',
    batchName: batch?.name || 'lote',
  }));
}

module.exports = {
  notifyJoined,
  notifyOffer,
  notifyExpired,
  buildOfferLink,
};
