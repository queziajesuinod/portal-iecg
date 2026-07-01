function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtPeriodo(ini, fim) {
  const fmt = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };
  return [ini && fmt(ini), fim && fmt(fim)].filter(Boolean).join(' – ');
}

function fmtNota(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1);
}

function fmtFreq(p) {
  if (p === null || p === undefined) return '—';
  return `${Number(p).toFixed(0)}%`;
}

function alunoHtml(aluno, turmaInfo) {
  const {
    nome, status, aprovado, materias
  } = aluno;
  const {
    escola, modulo, campus, numeracao, periodoInicio, periodoFim
  } = turmaInfo;

  const periodo = fmtPeriodo(periodoInicio, periodoFim);

  let resultadoGeral;
  if (aprovado === true) resultadoGeral = 'APROVADO';
  else if (aprovado === false) resultadoGeral = 'REPROVADO';
  else resultadoGeral = status === 'CONCLUIDO' ? 'APROVADO' : status === 'REPROVADO' ? 'REPROVADO' : '—';

  const resultColor = resultadoGeral === 'APROVADO' ? '#166534' : resultadoGeral === 'REPROVADO' ? '#cc0000' : '#555';

  const infoRows = [
    `<div class="ir"><b>Aluno:</b> ${esc(nome)}</div>`,
    `<div class="ir"><b>Turma:</b> ${esc(numeracao)}</div>`,
    escola ? `<div class="ir"><b>Escola:</b> ${esc(escola)}</div>` : '',
    modulo ? `<div class="ir"><b>Módulo:</b> ${esc(modulo)}</div>` : '',
    campus ? `<div class="ir"><b>Campus:</b> ${esc(campus)}</div>` : '',
    periodo ? `<div class="ir"><b>Período:</b> ${esc(periodo)}</div>` : '',
  ].filter(Boolean).join('');

  const rows = materias.map((mat, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#fafafa';
    const faltas = mat.totalAulas - mat.presentes;
    const res = mat.aprovadoMateria === true ? 'APROVADO' : mat.aprovadoMateria === false ? 'REPROVADO' : '—';
    const resColor = mat.aprovadoMateria === true ? '#166534' : mat.aprovadoMateria === false ? '#cc0000' : '#888';
    const faltasColor = faltas > 0 ? '#cc0000' : '#333';
    return `<tr style="background:${bg}">
      <td class="tl2">${esc(mat.materiaNome)}</td>
      <td class="tc">${mat.totalAulas}</td>
      <td class="tc">${mat.presentes}</td>
      <td class="tc" style="color:${faltasColor};font-weight:${faltas > 0 ? 'bold' : 'normal'}">${faltas}</td>
      <td class="tc">${fmtFreq(mat.percentualPresenca)}</td>
      <td class="tc" style="font-weight:bold">${fmtNota(mat.nota)}</td>
      <td class="tc" style="color:${resColor};font-weight:bold">${res}</td>
    </tr>`;
  }).join('');

  return `<div class="mb">
<div class="hb">
  <div class="ht"><div class="hs">Centro de Formação Ministerial</div><div class="htit">Boletim Escolar</div></div>
  <div class="hi">${infoRows}</div>
</div>
<table>
  <thead>
    <tr>
      <th class="tl">Matéria (Saber)</th>
      <th class="tn">Total Aulas</th>
      <th class="tn">Presenças</th>
      <th class="tn">Faltas</th>
      <th class="tn">Freq. %</th>
      <th class="tn">Nota</th>
      <th class="tn">Resultado</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr style="background:#f0f0f0;border-top:2px solid #555">
      <td class="tl2" style="font-weight:700;font-size:10px;letter-spacing:.5px">RESULTADO GERAL</td>
      <td class="tc" style="color:#888">—</td>
      <td class="tc" style="color:#888">—</td>
      <td class="tc" style="color:#888">—</td>
      <td class="tc" style="color:#888">—</td>
      <td class="tc" style="color:#888">—</td>
      <td class="tc" style="color:${resultColor};font-weight:700;font-size:11px">${resultadoGeral}</td>
    </tr>
  </tbody>
</table>
<div class="sig">
  <div class="sl">Assinatura do Aluno</div>
  <div class="sl">Assinatura da Coordenação</div>
  <div class="sl">Data</div>
</div>
</div>`;
}

export default function generateBoletimHtml(data) {
  const { turma, alunos } = data;
  const turmaInfo = {
    escola: turma.escola?.nome || turma.escola || '',
    modulo: turma.modulo?.nome || turma.modulo || '',
    campus: turma.campus?.nome || turma.campus || '',
    numeracao: turma.numeracao,
    periodoInicio: turma.periodoInicio,
    periodoFim: turma.periodoFim,
  };

  const blocks = alunos.map((aluno, idx) => {
    const pb = idx < alunos.length - 1 ? ' style="page-break-after:always"' : '';
    return `<div${pb}>${alunoHtml(aluno, turmaInfo)}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Boletim – ${esc(turmaInfo.escola)} Turma ${esc(turmaInfo.numeracao)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;background:#fff;color:#111;padding:12px 16px}
.mb{margin-bottom:36px}
.hb{border:2px solid #111;border-radius:4px;overflow:hidden;margin-bottom:6px}
.ht{background:#1a1a1a;color:#fff;text-align:center;padding:6px 10px}
.hs{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a017;font-weight:700;margin-bottom:2px}
.htit{font-size:14px;font-weight:700;letter-spacing:1px}
.hi{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;padding:6px 12px;border-top:1px solid #ccc;font-size:11px}
.ir{display:flex;gap:4px}
table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px}
.tl{border:1px solid #bbb;padding:3px 6px;text-align:left;background:#f2f2f2;font-weight:700;font-size:9px;text-transform:uppercase}
.tn{border:1px solid #bbb;padding:3px 4px;text-align:center;background:#f2f2f2;font-weight:700;font-size:9px;min-width:56px}
.tl2{border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:10px;height:22px}
.tc{border:1px solid #ccc;padding:3px 4px;text-align:center;font-size:10px;height:22px}
.sig{display:flex;gap:40px;margin-top:20px}
.sl{flex:1;border-top:1px solid #333;padding-top:4px;font-size:10px;color:#555}
@page{margin:12mm 10mm;size:A4 portrait}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>
</head>
<body>${blocks}</body>
</html>`;
}
