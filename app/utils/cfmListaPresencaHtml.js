const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function parseDt(d) {
  if (!d) return { mes: '', dia: '', mesAbr: '' };
  const [, mes, dia] = d.split('-');
  const mesNum = parseInt(mes, 10);
  return { mes: mesNum, dia: parseInt(dia, 10), mesAbr: MESES_PT[mesNum - 1] };
}

function fmtPeriodo(ini, fim) {
  const fmt = (d) => { const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };
  return [ini && fmt(ini), fim && fmt(fim)].filter(Boolean).join(' – ');
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function materiaHtml(mat, turma) {
  const periodo = fmtPeriodo(mat.periodoInicio || turma.periodoInicio, mat.periodoFim || turma.periodoFim);

  const infoRows = [
    `<div class="ir"><b>Saber:</b> ${esc(mat.materiaNome)}</div>`,
    `<div class="ir"><b>Turma:</b> ${esc(turma.numeracao)}</div>`,
    `<div class="ir"><b>Escola:</b> ${esc(turma.escola)}</div>`,
    `<div class="ir"><b>Mestre:</b> ${esc(mat.mestre || '—')}</div>`,
    turma.modulo ? `<div class="ir"><b>Módulo:</b> ${esc(turma.modulo)}</div>` : '',
    periodo ? `<div class="ir"><b>Período:</b> ${esc(periodo)}</div>` : '',
    turma.campus ? `<div class="ir"><b>Campus:</b> ${esc(turma.campus)}</div>` : '',
    `<div class="ir"><b>Total de Aulas:</b> ${mat.aulas.length}</div>`,
  ].join('');

  if (mat.aulas.length === 0) {
    return `<div class="mb"><div class="hb"><div class="ht"><div class="hs">Centro de Formação Ministerial</div><div class="htit">Lista de Presença</div></div><div class="hi">${infoRows}</div></div><div class="na">Nenhuma aula cadastrada.</div></div>`;
  }

  const thMes = mat.aulas.map(a => `<th class="td">${parseDt(a.dataAula).mes}</th>`).join('');
  const thDia = mat.aulas.map(a => `<th class="td">${parseDt(a.dataAula).dia}</th>`).join('');
  const thNum = mat.aulas.map(a => `<th class="td">${a.numero}</th>`).join('');
  const thAbr = mat.aulas.map(a => `<th class="td s">${parseDt(a.dataAula).mesAbr}</th>`).join('');
  const tfMes = mat.aulas.map(a => `<th class="td s">${parseDt(a.dataAula).mes}</th>`).join('');

  const rows = mat.alunos.map((al, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#fafafa';
    const cells = al.marcas.map(m => {
      const color = m === 'F' ? '#cc0000' : m === 'P' ? '#166534' : '#333';
      const fw = m ? 'bold' : 'normal';
      const txt = m === 'P' ? 'P' : m === 'F' ? 'F' : '';
      return `<td class="tc" style="color:${color};font-weight:${fw}">${txt}</td>`;
    }).join('');
    return `<tr style="background:${bg}"><td class="tn2">${esc(al.nome)}</td><td class="tn">${al.numero}</td>${cells}</tr>`;
  }).join('');

  return `<div class="mb">
<div class="hb">
  <div class="ht"><div class="hs">Centro de Formação Ministerial</div><div class="htit">Lista de Presença</div></div>
  <div class="hi">${infoRows}</div>
</div>
<table>
  <thead>
    <tr><th class="tl" rowspan="3">Alunos</th><th class="tn" rowspan="3">Nº</th>${thMes}</tr>
    <tr>${thDia}</tr>
    <tr>${thNum}</tr>
    <tr><th class="tl s">Nome completo</th><th class="tn s">Nº</th>${thAbr}</tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><th class="tl s">Mês:</th><th class="tn"></th>${tfMes}</tr></tfoot>
</table>
<div class="sig">
  <div class="sl">Assinatura do Mestre</div>
  <div class="sl">Assinatura da Coordenação</div>
  <div class="sl">Data</div>
</div>
</div>`;
}

export default function generateListaPresencaHtml(data) {
  const { turma, materias } = data;
  const blocks = materias.map((mat, idx) => {
    const pb = idx < materias.length - 1 ? ' style="page-break-after:always"' : '';
    return `<div${pb}>${materiaHtml(mat, turma)}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Lista de Presença – ${esc(turma.escola)} Turma ${esc(turma.numeracao)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;background:#fff;color:#111;padding:16px 20px}
.mb{margin-bottom:36px}
.hb{border:2px solid #111;border-radius:4px;overflow:hidden;margin-bottom:4px}
.ht{background:#1a1a1a;color:#fff;text-align:center;padding:6px 10px}
.hs{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#d4a017;font-weight:700;margin-bottom:2px}
.htit{font-size:14px;font-weight:700;letter-spacing:1px}
.hi{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;padding:6px 12px;border-top:1px solid #ccc;font-size:11px}
.ir{display:flex;gap:4px}
table{width:100%;border-collapse:collapse;font-size:10px}
.tl{border:1px solid #bbb;padding:2px 4px;text-align:left;background:#f2f2f2;font-weight:700;font-size:9px}
.tn{border:1px solid #bbb;padding:2px 3px;text-align:center;background:#f2f2f2;font-weight:700;font-size:9px;width:24px;min-width:24px}
.td{border:1px solid #bbb;padding:2px 3px;text-align:center;background:#f2f2f2;font-weight:700;font-size:9px}
.s{color:#666;font-weight:400}
.tn2{border:1px solid #ccc;padding:2px 6px;text-align:left;font-size:10px;height:18px;white-space:nowrap}
.tc{border:1px solid #ccc;padding:2px 3px;text-align:center;font-size:10px;height:18px}
tfoot .tl,.tfoot .tn{background:#f9f9f9}
.sig{display:flex;gap:40px;margin-top:20px}
.sl{flex:1;border-top:1px solid #333;padding-top:4px;font-size:10px;color:#555}
.na{padding:12px;border:1px solid #ccc;color:#888;text-align:center}
@page{margin:12mm 10mm;size:A4 landscape}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>
</head>
<body>${blocks}</body>
</html>`;
}
