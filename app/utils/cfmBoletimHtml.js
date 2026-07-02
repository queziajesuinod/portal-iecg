function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtNota(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1);
}

function fmtPeriodo(ini, fim) {
  const fmt = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };
  return [ini && fmt(ini), fim && fmt(fim)].filter(Boolean).join(' – ');
}

export default function generateBoletimHtml(data) {
  const { turma, alunos } = data;

  const materias = alunos.length > 0 ? (alunos[0].materias || []) : [];
  const materiaNames = materias.map(m => m.materiaNome);

  const periodo = fmtPeriodo(turma.periodoInicio, turma.periodoFim);

  const aprovados = alunos.filter(a => a.aprovado === true || a.status === 'CONCLUIDO').length;
  const reprovados = alunos.filter(a => a.aprovado === false || a.status === 'REPROVADO').length;
  const pendentes = alunos.length - aprovados - reprovados;

  const escola = turma.escola?.nome || turma.escola || '';
  const modulo = turma.modulo?.nome || turma.modulo || '';
  const campus = turma.campus?.nome || turma.campus || '';

  const materiaHeaders = materiaNames.map(name => `<th colspan="2" class="thm">${esc(name)}</th>`
  ).join('');

  const materiaSubHeaders = materiaNames.map(() => '<th class="tn">Nota</th><th class="tn">Faltas</th>'
  ).join('');

  const rows = alunos.map((aluno, idx) => {
    const resultadoGeral = aluno.aprovado === true || aluno.status === 'CONCLUIDO' ? 'APR'
      : aluno.aprovado === false || aluno.status === 'REPROVADO' ? 'REP'
        : '—';
    const resColor = resultadoGeral === 'APR' ? '#166534' : resultadoGeral === 'REP' ? '#cc0000' : '#555';
    const bg = idx % 2 === 0 ? '#fff' : '#f7f7f7';

    const matCells = materiaNames.map(name => {
      const mat = (aluno.materias || []).find(m => m.materiaNome === name);
      if (!mat) return '<td class="tc">—</td><td class="tc">—</td>';
      const faltas = mat.totalAulas - mat.presentes;
      const notaColor = mat.aprovadoMateria === false ? '#cc0000' : '#111';
      const faltasColor = faltas > 0 ? '#cc0000' : '#111';
      return `<td class="tc" style="color:${notaColor};font-weight:bold">${fmtNota(mat.nota)}</td><td class="tc" style="color:${faltasColor}">${faltas}</td>`;
    }).join('');

    return `<tr style="background:${bg}">
      <td class="tc num">${idx + 1}</td>
      <td class="tl2">${esc(aluno.nome)}</td>
      ${matCells}
      <td class="tc" style="color:${resColor};font-weight:700">${resultadoGeral}</td>
    </tr>`;
  }).join('');

  const summaryMat = materiaNames.map(() => '<td class="tc" colspan="2"></td>').join('');
  const summaryLabel = pendentes > 0
    ? `APR: ${aprovados} | REP: ${reprovados} | PEN: ${pendentes}`
    : `APR: ${aprovados} | REP: ${reprovados}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Boletim Geral – ${esc(escola)} Turma ${esc(turma.numeracao)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;background:#fff;color:#111;padding:12px 16px}
.hdr{border:2px solid #111;border-radius:4px;overflow:hidden;margin-bottom:10px}
.ht{background:#1a1a1a;color:#fff;text-align:center;padding:7px 10px}
.hs{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a017;font-weight:700;margin-bottom:2px}
.htit{font-size:14px;font-weight:700;letter-spacing:1px}
.hi{display:flex;gap:20px;padding:6px 12px;border-top:1px solid #ccc;font-size:11px;flex-wrap:wrap}
.ir{display:flex;gap:4px}
.stats{display:flex;gap:12px;margin-bottom:10px}
.stat{background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:4px 14px;text-align:center;font-size:10px}
.stat b{display:block;font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:10px}
.thm{border:1px solid #666;padding:3px 4px;text-align:center;background:#2d2d2d;color:#fff;font-weight:700;font-size:9px;text-transform:uppercase;white-space:nowrap}
.tl{border:1px solid #bbb;padding:3px 6px;text-align:left;background:#f2f2f2;font-weight:700;font-size:9px;text-transform:uppercase;white-space:nowrap}
.tn{border:1px solid #bbb;padding:3px 4px;text-align:center;background:#f2f2f2;font-weight:700;font-size:9px}
.tl2{border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:10px;height:22px;min-width:140px}
.tc{border:1px solid #ccc;padding:3px 4px;text-align:center;font-size:10px;height:22px}
.num{color:#888;min-width:22px}
.sum{background:#efefef;border-top:2px solid #555;font-weight:700}
@page{margin:10mm 8mm;size:A4 landscape}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>
</head>
<body>
<div class="hdr">
  <div class="ht">
    <div class="hs">Centro de Formação Ministerial</div>
    <div class="htit">Boletim Geral da Turma</div>
  </div>
  <div class="hi">
    ${escola ? `<div class="ir"><b>Escola:</b>&nbsp;${esc(escola)}</div>` : ''}
    ${modulo ? `<div class="ir"><b>Módulo:</b>&nbsp;${esc(modulo)}</div>` : ''}
    ${turma.numeracao ? `<div class="ir"><b>Turma:</b>&nbsp;${esc(turma.numeracao)}</div>` : ''}
    ${campus ? `<div class="ir"><b>Campus:</b>&nbsp;${esc(campus)}</div>` : ''}
    ${periodo ? `<div class="ir"><b>Período:</b>&nbsp;${esc(periodo)}</div>` : ''}
    <div class="ir"><b>Status:</b>&nbsp;ENCERRADA</div>
  </div>
</div>
<div class="stats">
  <div class="stat"><b>${alunos.length}</b>Alunos</div>
  <div class="stat" style="border-color:#166534"><b style="color:#166534">${aprovados}</b>Aprovados</div>
  <div class="stat" style="border-color:#cc0000"><b style="color:#cc0000">${reprovados}</b>Reprovados</div>
  ${pendentes > 0 ? `<div class="stat"><b>${pendentes}</b>Pendentes</div>` : ''}
</div>
<table>
  <thead>
    <tr>
      <th class="tl" rowspan="2" style="width:22px">#</th>
      <th class="tl" rowspan="2">Aluno</th>
      ${materiaHeaders}
      <th class="tl" rowspan="2" style="min-width:52px">Resultado</th>
    </tr>
    <tr>${materiaSubHeaders}</tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="sum">
      <td class="tc" colspan="2" style="font-size:10px;text-align:left;padding-left:6px">Total: ${alunos.length} alunos</td>
      ${summaryMat}
      <td class="tc" style="font-size:9px;white-space:nowrap">${summaryLabel}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}
