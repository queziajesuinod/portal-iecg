const QRCode = require('qrcode');
const emailService = require('./emailService');
const evolutionApiService = require('./evolutionApiService');
const {
  CfmInscricao, CfmTurma, CfmEscola, Member
} = require('../models');

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.iecg.com.br';
const WAPP_POOL = 'IECG';

async function _carregarInscricao(inscricaoId) {
  return CfmInscricao.findByPk(inscricaoId, {
    include: [
      {
        model: CfmTurma,
        as: 'turma',
        include: [{ model: CfmEscola, as: 'escola' }],
      },
      { model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName', 'phone', 'whatsapp', 'email'] },
    ],
  });
}

function _nomeAluno(inscricao) {
  if (inscricao.membro) return inscricao.membro.preferredName || inscricao.membro.fullName;
  return inscricao.nomeNaoMembro || 'Aluno';
}

function _telefone(inscricao) {
  if (!inscricao.membro) return null;
  return inscricao.membro.whatsapp || inscricao.membro.phone || null;
}

function _email(inscricao) {
  return inscricao.membro?.email || null;
}

async function gerarQrBase64(tokenQr) {
  const conteudo = `${PORTAL_URL}/cfm/c/${tokenQr}`;
  const buffer = await QRCode.toBuffer(conteudo, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#0d0d0d', light: '#ffffff' },
  });
  return buffer.toString('base64');
}

function _htmlEmail(nome, turma, qrBase64) {
  const escola = turma?.escola?.nome || 'CFM';
  const numeracao = turma?.numeracao || '';
  const periodo = turma?.periodoInicio && turma?.periodoFim
    ? `${_fmtData(turma.periodoInicio)} – ${_fmtData(turma.periodoFim)}`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
        <!-- Header -->
        <tr><td style="background:#0d0d0d;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#d4a017;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">CENTRO DE FORMAÇÃO DE MINISTÉRIO</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Cartão do Aluno</p>
        </td></tr>
        <!-- Info -->
        <tr><td style="padding:28px 32px 20px;">
          <p style="margin:0 0 4px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Aluno</p>
          <p style="margin:0 0 18px;color:#111;font-size:20px;font-weight:700;">${nome}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-right:12px;">
                <p style="margin:0 0 2px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Escola</p>
                <p style="margin:0;color:#333;font-size:14px;font-weight:600;">${escola}</p>
              </td>
              <td width="50%">
                <p style="margin:0 0 2px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Turma</p>
                <p style="margin:0;color:#333;font-size:14px;font-weight:600;">${numeracao}</p>
              </td>
            </tr>
            ${periodo ? `<tr><td colspan="2" style="padding-top:14px;">
              <p style="margin:0 0 2px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Período</p>
              <p style="margin:0;color:#333;font-size:14px;">${periodo}</p>
            </td></tr>` : ''}
          </table>
        </td></tr>
        <!-- QR -->
        <tr><td style="padding:0 32px 28px;text-align:center;">
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;display:inline-block;">
            <img src="data:image/png;base64,${qrBase64}" width="200" height="200" alt="QR Code" style="display:block;" />
          </div>
          <p style="margin:12px 0 0;color:#666;font-size:12px;">Apresente este QR Code na entrada de cada aula</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#aaa;font-size:11px;">Portal IECG · Este cartão é pessoal e intransferível</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function _fmtData(d) {
  if (!d) return '';
  const [a, m, dia] = String(d).split('-');
  return dia ? `${dia}/${m}/${a}` : d;
}

async function enviarCartaoEmail(inscricao, qrBase64) {
  const dest = _email(inscricao);
  if (!dest) return { ok: false, motivo: 'sem_email' };

  const nome = _nomeAluno(inscricao);
  const escola = inscricao.turma?.escola?.nome || 'CFM';
  const numeracao = inscricao.turma?.numeracao || '';

  try {
    await emailService.sendMail({
      to: dest,
      subject: `Seu Cartão CFM – ${escola} ${numeracao}`,
      html: _htmlEmail(nome, inscricao.turma, qrBase64),
      attachments: [{
        filename: 'qrcode-cfm.png',
        content: Buffer.from(qrBase64, 'base64'),
        contentType: 'image/png',
      }],
    });
    return { ok: true };
  } catch (e) {
    console.error('[cfmCartao] erro email:', e.message);
    return { ok: false, motivo: e.message };
  }
}

async function enviarCartaoWhatsApp(inscricao, qrBase64) {
  const tel = _telefone(inscricao);
  if (!tel) return { ok: false, motivo: 'sem_telefone' };

  const nome = _nomeAluno(inscricao);
  const escola = inscricao.turma?.escola?.nome || 'CFM';
  const numeracao = inscricao.turma?.numeracao || '';
  const periodo = inscricao.turma?.periodoInicio && inscricao.turma?.periodoFim
    ? `📅 Período: ${_fmtData(inscricao.turma.periodoInicio)} – ${_fmtData(inscricao.turma.periodoFim)}\n`
    : '';

  const legenda = `🎓 *Cartão CFM – ${escola}*\n\n*Aluno:* ${nome}\n*Turma:* ${numeracao}\n${periodo}\n📲 Apresente este QR Code na entrada de cada aula.\n_Cartão pessoal e intransferível._`;

  try {
    const r = await evolutionApiService.enviarImagemBase64(
      tel,
      qrBase64,
      legenda,
      WAPP_POOL,
    );
    return r.sucesso ? { ok: true } : { ok: false, motivo: r.erro };
  } catch (e) {
    console.error('[cfmCartao] erro whatsapp:', e.message);
    return { ok: false, motivo: e.message };
  }
}

async function enviarCartaoAluno(inscricaoId) {
  const inscricao = await _carregarInscricao(inscricaoId);
  if (!inscricao) throw new Error('Inscrição não encontrada');

  const qrBase64 = await gerarQrBase64(inscricao.tokenQr);

  const [email, whatsapp] = await Promise.allSettled([
    enviarCartaoEmail(inscricao, qrBase64),
    enviarCartaoWhatsApp(inscricao, qrBase64),
  ]);

  return {
    nome: _nomeAluno(inscricao),
    email: email.status === 'fulfilled' ? email.value : { ok: false, motivo: email.reason?.message },
    whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : { ok: false, motivo: whatsapp.reason?.message },
  };
}

module.exports = { gerarQrBase64, enviarCartaoAluno };
