/* eslint-disable no-console */
/**
 * Converte o CSV exportado do Google Forms (Respostas) para JSON
 * no formato esperado pelo script importarCultosJSON.js.
 *
 * Uso:
 *   node server/scripts/converterCsvCultosParaJson.js <arquivo.csv> [saida.json]
 *
 * Exemplo:
 *   node server/scripts/converterCsvCultosParaJson.js dados/cultos.csv dados/cultos.json
 *
 * Depois de gerar o JSON, importe com:
 *   node server/scripts/importarCultosJSON.js dados/cultos.json --campus "IECG Centro" --ministerio "Geral" --dry-run
 *   node server/scripts/importarCultosJSON.js dados/cultos.json --campus "IECG Centro" --ministerio "Geral"
 *
 * Notas sobre limpeza automática:
 *   - Remove pontos/vírgulas em valores numéricos (ex: "282." → "282")
 *   - Normaliza datas com anos claramente errados (ex: "0225" → avisa e descarta)
 *   - Normaliza horários com segundos (ex: "08:30:00" → "08:30")
 *   - Remove linhas onde DATA ou HORÁRIO estão em branco
 */

const fs = require('fs');
const path = require('path');

const csvArg = process.argv[2];
const saidaArg = process.argv[3];

if (!csvArg) {
  console.error('Uso: node converterCsvCultosParaJson.js <arquivo.csv> [saida.json]');
  process.exit(1);
}

const csvPath = path.resolve(csvArg);
if (!fs.existsSync(csvPath)) {
  console.error(`Arquivo não encontrado: ${csvPath}`);
  process.exit(1);
}

// ─── Parseia CSV respeitando campos entre aspas ───────────────────────────────
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content) {
  // Remove BOM UTF-8 se presente
  const cleaned = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const values = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
    return obj;
  });
  return { headers, rows };
}

// ─── Normaliza valor numérico com ponto/vírgula/espaço no fim ───────────────
function limparNumero(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/[.,\s]+$/, '') // remove ponto/vírgula no fim
    .replace(/\s/g, '');
}

// ─── Normaliza horário: "08:30:00" → "08:30", "08:30" → "08:30" ─────────────
function limparHorario(str) {
  if (!str) return str;
  const s = String(str).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return s;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

// ─── Valida data: descarta anos claramente errados (<1900 ou >2100) ──────────
function validarData(str) {
  if (!str) return false;
  const parts = String(str).trim().split(/[/\-]/); // eslint-disable-line no-useless-escape
  if (parts.length !== 3) return false;
  const anos = parts.filter((p) => p.length === 4 || p.length > 4);
  for (const a of anos) {
    const n = parseInt(a, 10);
    if (n < 1900 || n > 2100) return false;
  }
  return true;
}

// ─── Mapeamento de colunas: o CSV do Forms tem os mesmos nomes ───────────────
// Apenas limpeza e normalização — sem renomear.
function normalizar(row, avisos, i) {
  const linha = i + 2; // +2: header é linha 1, dados começam na 2

  const data = (row.DATA || '').trim();
  if (!data) { avisos.push(`Linha ${linha}: DATA vazia — ignorada`); return null; }
  if (!validarData(data)) { avisos.push(`Linha ${linha}: DATA inválida "${data}" — ignorada`); return null; }

  const horario = limparHorario((row['HORÁRIO'] || row.HORARIO || '').trim());
  if (!horario) { avisos.push(`Linha ${linha}: HORÁRIO vazio — ignorada`); return null; }

  return {
    DATA: data,
    HORÁRIO: horario,
    'TIPO DE EVENTO': (row['TIPO DE EVENTO'] || '').trim(),
    'Tipo de Culto': (row['Tipo de Culto'] || '').trim(),
    'QUEM MINISTROU?': (row['QUEM MINISTROU?'] || row['QUEM MINISTROU:'] || '').trim(),
    'TÍTULO DA MENSAGEM': (row['TÍTULO DA MENSAGEM'] || row['TITULO DA MENSAGEM'] || '').trim(),
    'O CULTO FOI DE UMA SÉRIE?': (row['O CULTO FOI DE UMA SÉRIE?'] || row['O CULTO FOI DE UMA SERIE?'] || '').trim(),
    'SE FOR SÉRIE, QUAL NOME?': (row['SE FOR SÉRIE, QUAL NOME?'] || row['SE FOR SERIE, QUAL NOME?'] || '').trim(),
    'QUANTIDADE DE HOMENS': limparNumero(row['QUANTIDADE DE HOMENS']),
    'QUANTIDADE DE MULHERES': limparNumero(row['QUANTIDADE DE MULHERES']),
    'QUANTIDADE DE CRIANÇAS': limparNumero(row['QUANTIDADE DE CRIANÇAS'] || row['QUANTIDADE DE CRIANCAS']),
    'QUANTIDADE DE BEBÊS': limparNumero(row['QUANTIDADE DE BEBÊS'] || row['QUANTIDADE DE BEBES']),
    'QUANTIDADE DE VOLUNTÁRIOS': limparNumero(row['QUANTIDADE DE VOLUNTÁRIOS'] || row['QUANTIDADE DE VOLUNTARIOS']),
    'COMENTÁRIOS ADICIONAIS': (row['COMENTÁRIOS ADICIONAIS'] || row['COMENTARIOS ADICIONAIS'] || '').trim(),
    CAMPUS: (row.CAMPUS || '').trim(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const raw = fs.readFileSync(csvPath, 'utf-8');
const { rows } = parseCsv(raw);

console.log(`\nCSV lido: ${rows.length} linhas de dados`);

const avisos = [];
const resultado = rows
  .map((r, i) => normalizar(r, avisos, i))
  .filter(Boolean);

if (avisos.length > 0) {
  console.log(`\nAvisos (${avisos.length}):`);
  avisos.forEach((a) => console.log(`  ${a}`));
}

console.log(`\nRegistros válidos: ${resultado.length}`);

const saidaPath = saidaArg
  ? path.resolve(saidaArg)
  : csvPath.replace(/\.csv$/i, '.json');

fs.writeFileSync(saidaPath, JSON.stringify(resultado, null, 2), 'utf-8');
console.log(`\nJSON salvo em: ${saidaPath}`);
console.log('\nPróximos passos:');
console.log(`  # Simular (sem gravar):
  node server/scripts/importarCultosJSON.js "${saidaPath}" --campus "IECG Centro" --ministerio "Geral" --dry-run\n`);
console.log(`  # Importar de verdade:
  node server/scripts/importarCultosJSON.js "${saidaPath}" --campus "IECG Centro" --ministerio "Geral"\n`);
