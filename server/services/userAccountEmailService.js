const emailService = require('./emailService');

const PORTAL_NAME = 'Portal IECG';

function resolveLoginUrl() {
  const base = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!base) return '';
  return `${base}/login`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _infoRow(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<tr>
      <td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:130px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#111;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;
}

function _htmlAccount({
  action, name, email, username, telefone, password, loginUrl,
}) {
  const isCreate = action === 'created';
  const title = isCreate ? 'Conta criada' : 'Conta atualizada';
  const intro = isCreate
    ? `Sua conta no ${PORTAL_NAME} foi criada. Abaixo estão seus dados de acesso à plataforma.`
    : `Seus dados de acesso ao ${PORTAL_NAME} foram atualizados. Confira as informações abaixo.`;

  const passwordBlock = password
    ? `<tr><td colspan="2" style="padding:16px 0 0;">
          <div style="background:#faf7ef;border:1px solid #e7dcc0;border-radius:8px;padding:14px 16px;">
            <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Senha da plataforma</p>
            <p style="margin:0;color:#111;font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:1px;">${escapeHtml(password)}</p>
          </div>
        </td></tr>`
    : `<tr><td colspan="2" style="padding:16px 0 0;">
          <p style="margin:0;color:#666;font-size:12px;">A senha da plataforma não foi alterada nesta atualização.</p>
        </td></tr>`;

  const loginButton = loginUrl
    ? `<tr><td style="padding:24px 32px 8px;text-align:center;">
          <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#0d0d0d;color:#d4a017;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;">Acessar o Portal</a>
        </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
        <tr><td style="background:#0d0d0d;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#d4a017;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">${escapeHtml(PORTAL_NAME)}</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${escapeHtml(title)}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 18px;color:#444;font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${_infoRow('Nome', name)}
            ${_infoRow('E-mail', email)}
            ${_infoRow('Usuário', username)}
            ${_infoRow('Telefone', telefone)}
            ${passwordBlock}
          </table>
        </td></tr>
        ${loginButton}
        <tr><td style="padding:24px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;line-height:1.5;">Por segurança, não compartilhe esta senha. Este é um e-mail automático do ${escapeHtml(PORTAL_NAME)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia e-mail notificando a criação ou alteração de uma conta de usuário.
 * Nunca lança erro: falhas de envio são logadas e ignoradas para não
 * interromper o fluxo de criação/atualização do usuário.
 *
 * @param {'created'|'updated'} action
 * @param {object} user - dados do usuário (name, email, username, telefone)
 * @param {string|null} password - senha em texto puro, quando disponível
 */
async function sendAccountNotification(action, user, password) {
  try {
    if (!user || !user.email) {
      return { sent: false, reason: 'sem-email' };
    }
    if (!emailService.isConfigured()) {
      console.warn('[userAccountEmail] SMTP nao configurado; e-mail de conta nao enviado');
      return { sent: false, reason: 'smtp-nao-configurado' };
    }

    const loginUrl = resolveLoginUrl();
    const subject = action === 'created'
      ? `${PORTAL_NAME} - Sua conta foi criada`
      : `${PORTAL_NAME} - Sua conta foi atualizada`;

    const html = _htmlAccount({
      action,
      name: user.name,
      email: user.email,
      username: user.username,
      telefone: user.telefone,
      password: password || null,
      loginUrl,
    });

    const textLines = [
      action === 'created' ? 'Sua conta no Portal IECG foi criada.' : 'Seus dados de acesso ao Portal IECG foram atualizados.',
      '',
      user.name ? `Nome: ${user.name}` : '',
      `E-mail: ${user.email}`,
      user.username ? `Usuario: ${user.username}` : '',
      password ? `Senha da plataforma: ${password}` : 'A senha da plataforma nao foi alterada nesta atualizacao.',
      loginUrl ? `\nAcesse: ${loginUrl}` : '',
    ].filter((line) => line !== '');

    await emailService.sendMail({
      to: user.email,
      subject,
      html,
      text: textLines.join('\n'),
    });

    return { sent: true };
  } catch (error) {
    console.error(`[userAccountEmail] Falha ao enviar e-mail de conta (${action}):`, error.message);
    return { sent: false, reason: 'erro', error: error.message };
  }
}

module.exports = {
  sendAccountNotification,
};
