/**
 * Diagnóstico de SMTP / "Esqueci minha senha".
 *
 * Uso (na RAIZ do projeto, no servidor de produção, com o .env de prod presente):
 *   node server/scripts/diagSmtp.js                      -> só checa config + conexão
 *   node server/scripts/diagSmtp.js destino@exemplo.com  -> checa e ENVIA e-mail de teste
 *
 * Não altera nenhuma senha nem grava nada no banco. Seguro para rodar em produção.
 */
require('dotenv').config();
const emailService = require('../services/emailService');

function mask(v) {
  if (!v) return '(vazio)';
  const s = String(v);
  if (s.length <= 3) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}***${s.slice(-1)} (len ${s.length})`;
}

(async () => {
  console.log('=== Diagnóstico SMTP — Portal IECG ===\n');
  console.log('NODE_ENV        :', process.env.NODE_ENV || '(não definido)');
  console.log('cwd             :', process.cwd());

  const cfg = emailService.getConfig();
  console.log('\n--- Config lida (process.env) ---');
  console.log('SMTP_HOST       :', cfg.host || '(vazio)');
  console.log('SMTP_PORT       :', cfg.port);
  console.log('SMTP_SECURE     :', cfg.secure);
  console.log('SMTP_USER       :', cfg.user || '(vazio)');
  console.log('SMTP_PASS       :', mask(cfg.pass));
  console.log('SMTP_FROM       :', cfg.from || '(vazio)');
  console.log('SMTP_FROM_NAME  :', cfg.fromName || '(vazio)');
  console.log('SMTP_REPLY_TO   :', cfg.replyTo || '(vazio)');
  console.log('PUBLIC_BASE_URL :', process.env.PUBLIC_BASE_URL || '(vazio)');

  if (!emailService.isConfigured()) {
    console.error('\n[X] SMTP NÃO configurado: faltam SMTP_HOST, SMTP_USER e/ou SMTP_PASS no .env de produção.');
    console.error('    -> Esta é a causa do "não envia e-mail". Preencha essas variáveis e reinicie o serviço.');
    process.exit(1);
  }
  console.log('\n[OK] Config mínima presente (host + user + pass).');

  console.log('\n--- Testando conexão/autenticação no servidor SMTP ---');
  try {
    const r = await emailService.verifyConnection();
    console.log('[OK] Conexão e login SMTP funcionando. Remetente:', r.from);
  } catch (err) {
    console.error('[X] Falha ao conectar/autenticar no SMTP:', err.message);
    console.error('    Causas comuns: senha/app-password errada, porta bloqueada por firewall,');
    console.error('    SMTP_SECURE incompatível com a porta (465=true, 587=false), ou host errado.');
    process.exit(1);
  }

  const to = process.argv[2];
  if (!to) {
    console.log('\nConexão OK. Para enviar um e-mail de teste real, rode:');
    console.log('  node server/scripts/diagSmtp.js seu-email@exemplo.com');
    process.exit(0);
  }

  console.log(`\n--- Enviando e-mail de teste para: ${to} ---`);
  try {
    const info = await emailService.sendMail({
      to,
      subject: 'Portal IECG - Teste de SMTP',
      text: 'Se você recebeu este e-mail, o envio de e-mails do Portal IECG está funcionando.',
      html: '<p>Se você recebeu este e-mail, o envio de e-mails do <b>Portal IECG</b> está funcionando.</p>',
    });
    console.log('[OK] Enviado.');
    console.log('  messageId:', info.messageId);
    console.log('  accepted :', info.accepted);
    console.log('  rejected :', info.rejected);
    console.log('  response :', info.response);
    console.log('\nVerifique a caixa de entrada (e SPAM) do destinatário.');
  } catch (err) {
    console.error('[X] Falha ao enviar e-mail de teste:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();
