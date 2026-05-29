const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedConfigFingerprint = null;

function getConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'Portal IECG',
    replyTo: process.env.SMTP_REPLY_TO || '',
  };
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

function fingerprintConfig(cfg) {
  return [cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass].join('|');
}

function getTransporter() {
  const cfg = getConfig();
  if (!isConfigured()) {
    throw new Error('SMTP nao configurado (defina SMTP_HOST, SMTP_USER, SMTP_PASS no .env)');
  }
  const fp = fingerprintConfig(cfg);
  if (cachedTransporter && cachedConfigFingerprint === fp) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
  cachedConfigFingerprint = fp;
  return cachedTransporter;
}

function buildFromAddress() {
  const cfg = getConfig();
  if (!cfg.from) return cfg.user;
  if (cfg.fromName) return `"${cfg.fromName}" <${cfg.from}>`;
  return cfg.from;
}

async function verifyConnection() {
  const transporter = getTransporter();
  await transporter.verify();
  return { ok: true, from: buildFromAddress() };
}

async function sendMail({
  to, subject, html, text, attachments, cc, bcc, headers,
}) {
  if (!to) throw new Error('Destinatario "to" obrigatorio');
  if (!subject) throw new Error('"subject" obrigatorio');
  if (!html && !text) throw new Error('"html" ou "text" obrigatorio');

  const cfg = getConfig();
  const transporter = getTransporter();
  const message = {
    from: buildFromAddress(),
    to,
    subject,
    html: html || undefined,
    text: text || undefined,
  };
  if (cc) message.cc = cc;
  if (bcc) message.bcc = bcc;
  if (cfg.replyTo) message.replyTo = cfg.replyTo;
  if (Array.isArray(attachments) && attachments.length) message.attachments = attachments;
  if (headers && typeof headers === 'object') message.headers = headers;

  const info = await transporter.sendMail(message);
  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

module.exports = {
  isConfigured,
  getConfig,
  verifyConnection,
  sendMail,
};
