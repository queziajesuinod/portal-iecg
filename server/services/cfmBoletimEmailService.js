const { CfmInscricao, Member } = require('../models');
const emailService = require('./emailService');
const cfm = require('./cfmService');

function _fmtData(d) {
  if (!d) return '';
  const [a, m, dia] = String(d).split('-');
  return dia ? `${dia}/${m}/${a}` : d;
}

function _fmtNota(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1);
}

function _fmtFreq(p) {
  if (p === null || p === undefined) return '—';
  return `${Math.round(Number(p))}%`;
}

function _htmlBoletim(aluno, turmaInfo) {
  const {
    nome, aprovado, status, materias
  } = aluno;
  const {
    escola, modulo, campus, numeracao, periodoInicio, periodoFim
  } = turmaInfo;

  let resultadoGeral;
  if (aprovado === true) resultadoGeral = 'APROVADO';
  else if (aprovado === false) resultadoGeral = 'REPROVADO';
  else resultadoGeral = status === 'CONCLUIDO' ? 'APROVADO' : status === 'REPROVADO' ? 'REPROVADO' : '—';

  const resultColor = resultadoGeral === 'APROVADO' ? '#15803d' : resultadoGeral === 'REPROVADO' ? '#dc2626' : '#555';

  const infoPartes = [
    escola && `<b>Escola:</b> ${escola}`,
    modulo && `<b>Módulo:</b> ${modulo}`,
    campus && `<b>Campus:</b> ${campus}`,
  ].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  const periodo = periodoInicio && periodoFim
    ? `${_fmtData(periodoInicio)} – ${_fmtData(periodoFim)}`
    : '';

  const materiaRows = materias.map((mat, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const faltas = mat.totalAulas - mat.presentes;
    const res = mat.aprovadoMateria === true ? 'APROVADO' : mat.aprovadoMateria === false ? 'REPROVADO' : '—';
    const resColor = mat.aprovadoMateria === true ? '#15803d' : mat.aprovadoMateria === false ? '#dc2626' : '#888';
    const faltasColor = faltas > 0 ? '#dc2626' : '#111';
    const faltasBold = faltas > 0 ? 'bold' : 'normal';
    return `<tr style="background:${bg};">
      <td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:12px;">${mat.materiaNome || '—'}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">${mat.totalAulas}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">${mat.presentes}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;color:${faltasColor};font-weight:${faltasBold};">${faltas}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;">${_fmtFreq(mat.percentualPresenca)}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;font-weight:bold;">${_fmtNota(mat.nota)}</td>
      <td style="padding:7px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;color:${resColor};font-weight:bold;">${res}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
        <tr><td style="background:#0d0d0d;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#d4a017;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Centro de Formação Ministerial</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Boletim Escolar</p>
        </td></tr>
        <tr><td style="padding:24px 32px 16px;">
          <p style="margin:0 0 2px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Aluno</p>
          <p style="margin:0 0 10px;color:#111;font-size:20px;font-weight:700;">${nome}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#444;">${infoPartes}</p>
          <p style="margin:0;font-size:12px;color:#555;"><b>Turma:</b> ${numeracao}${periodo ? `&nbsp;&nbsp;·&nbsp;&nbsp;<b>Período:</b> ${periodo}` : ''}</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#1a1a1a;color:#ffffff;">
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;border:1px solid #374151;">Matéria</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:52px;">Aulas</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:64px;">Presenças</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:48px;">Faltas</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:52px;">Freq.%</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:48px;">Nota</th>
                <th style="padding:8px 8px;text-align:center;font-size:11px;font-weight:600;border:1px solid #374151;width:76px;">Resultado</th>
              </tr>
            </thead>
            <tbody>${materiaRows}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6;">
                <td colspan="6" style="padding:9px 10px;font-size:12px;font-weight:700;border:1px solid #d1d5db;border-top:2px solid #374151;">RESULTADO GERAL</td>
                <td style="padding:9px 8px;text-align:center;font-size:13px;font-weight:700;border:1px solid #d1d5db;border-top:2px solid #374151;color:${resultColor};">${resultadoGeral}</td>
              </tr>
            </tfoot>
          </table>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:14px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#aaa;font-size:11px;">Portal IECG · Centro de Formação Ministerial</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function enviarBoletimTurma(turmaId) {
  const [{ turma, alunos }, inscricoes] = await Promise.all([
    cfm.getPainel(turmaId),
    cfm.listInscricoes(turmaId),
  ]);

  const emailMap = {};
  for (const insc of inscricoes) {
    if (insc.memberId && insc.membro?.email) {
      emailMap[insc.id] = insc.membro.email;
    }
  }

  const turmaInfo = {
    escola: turma.escola?.nome || turma.escola || '',
    modulo: turma.modulo?.nome || turma.modulo || '',
    campus: turma.campus?.nome || turma.campus || '',
    numeracao: turma.numeracao,
    periodoInicio: turma.periodoInicio,
    periodoFim: turma.periodoFim,
  };

  const { escola } = turmaInfo;
  const { numeracao } = turmaInfo;

  const semEmail = [];
  const erros = [];
  let enviados = 0;

  await Promise.allSettled(alunos.map(async (aluno) => {
    const email = emailMap[aluno.inscricaoId];
    if (!email) {
      semEmail.push(aluno.nome);
      return;
    }
    try {
      await emailService.sendMail({
        to: email,
        subject: `Boletim CFM – ${escola} Turma ${numeracao}`,
        html: _htmlBoletim(aluno, turmaInfo),
      });
      enviados += 1;
    } catch (e) {
      console.error(`[cfmBoletim] erro ao enviar para ${email}:`, e.message);
      erros.push(aluno.nome);
    }
  }));

  return { enviados, semEmail, erros };
}

async function enviarBoletimInscricao(inscricaoId) {
  const insc = await CfmInscricao.findByPk(inscricaoId, {
    include: [{ model: Member, as: 'membro', attributes: ['id', 'email', 'preferredName', 'fullName'] }],
    attributes: ['id', 'turmaId', 'memberId'],
  });
  if (!insc) throw new Error('Inscrição não encontrada');

  const email = insc.membro?.email;
  const nomeAluno = insc.membro?.preferredName || insc.membro?.fullName || 'Aluno';
  if (!email) return { ok: false, motivo: 'sem_email', nome: nomeAluno };

  const { turma, alunos } = await cfm.getPainel(insc.turmaId);
  const aluno = alunos.find(a => a.inscricaoId === inscricaoId);
  if (!aluno) throw new Error('Aluno não encontrado no painel');

  const turmaInfo = {
    escola: turma.escola?.nome || turma.escola || '',
    modulo: turma.modulo?.nome || turma.modulo || '',
    campus: turma.campus?.nome || turma.campus || '',
    numeracao: turma.numeracao,
    periodoInicio: turma.periodoInicio,
    periodoFim: turma.periodoFim,
  };

  await emailService.sendMail({
    to: email,
    subject: `Boletim CFM – ${turmaInfo.escola} Turma ${turmaInfo.numeracao}`,
    html: _htmlBoletim(aluno, turmaInfo),
  });

  return { ok: true, nome: aluno.nome };
}

module.exports = { enviarBoletimTurma, enviarBoletimInscricao };
