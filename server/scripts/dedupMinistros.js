/* eslint-disable no-console */
/**
 * Deduplicação de ministros — detecta nomes similares e mescla os duplicados.
 *
 * Uso:
 *   # Só analisa, mostra grupos sugeridos:
 *   node server/scripts/dedupMinistros.js
 *
 *   # Aplica a fusão dos grupos confirmados:
 *   node server/scripts/dedupMinistros.js --apply
 *
 *   # Gera arquivo JSON com mapeamento para editar antes de aplicar:
 *   node server/scripts/dedupMinistros.js --exportar mapeamento.json
 *
 *   # Aplica um mapeamento exportado e editado manualmente:
 *   node server/scripts/dedupMinistros.js --importar mapeamento.json --apply
 *
 * Estratégia de detecção:
 *   1. Remove títulos (Pastor, Pastora, Pr., Pra., Apóstolo, Ap., Bispo...)
 *   2. Remove acentos, pontuação e espaços extras
 *   3. Agrupa por nome base normalizado (correspondência exata após normalização)
 *   4. Dentro de cada grupo, mantém o nome com MAIS usos em registros de culto
 *      (em caso de empate, mantém o mais curto/sem pontuação)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { Ministro } = require('../models');

const isDryRun = !process.argv.includes('--apply');
const exportarPath = process.argv.includes('--exportar')
  ? process.argv[process.argv.indexOf('--exportar') + 1]
  : null;
const importarPath = process.argv.includes('--importar')
  ? process.argv[process.argv.indexOf('--importar') + 1]
  : null;

const schema = process.env.DB_SCHEMA || 'dev_iecg';

// ─── Normalização ─────────────────────────────────────────────────────────────

const TITULOS = [
  'apostolo', 'apóstolo', 'ap', 'pastor', 'pastora', 'pr', 'pra',
  'bispo', 'bispa', 'missionario', 'missionária', 'diacono', 'diacona',
  'presbitero', 'presbitera', 'evangelista', 'profeta', 'profetisa',
];

function removerAcentos(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizarNome(nome) {
  let s = removerAcentos(String(nome || ''))
    .toLowerCase()
    .replace(/[.,\-_]+/g, ' ') // pontuação → espaço
    .replace(/\s+/g, ' ')
    .trim();

  // Remove títulos do início (pode ter vários, ex: "Ap. Pastor Breno")
  let alterou = true;
  while (alterou) {
    alterou = false;
    for (const titulo of TITULOS) {
      const re = new RegExp(`^${titulo}\\b\\s*`, 'i');
      if (re.test(s)) {
        s = s.replace(re, '').trim();
        alterou = true;
      }
    }
  }

  return s.trim();
}

// ─── Levenshtein (para detectar erros de digitação menores) ───────────────────

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Similaridade 0–1 (1 = idêntico)
function similaridade(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Agrupamento ─────────────────────────────────────────────────────────────

function agrupar(ministros, threshold = 0.80) {
  const grupos = [];
  const alocados = new Set();

  for (let i = 0; i < ministros.length; i += 1) {
    if (alocados.has(i)) continue;
    const grupo = [i];
    const baseI = normalizarNome(ministros[i].nome);

    for (let j = i + 1; j < ministros.length; j += 1) {
      if (alocados.has(j)) continue;
      const baseJ = normalizarNome(ministros[j].nome);
      const sim = similaridade(baseI, baseJ);
      if (sim >= threshold) {
        grupo.push(j);
        alocados.add(j);
      }
    }

    alocados.add(i);
    if (grupo.length > 1) grupos.push(grupo.map((idx) => ministros[idx]));
  }

  return grupos;
}

// ─── Escolhe o nome canônico de um grupo ─────────────────────────────────────

function escolherCanônico(grupo) {
  // Mais usos → depois mais curto → depois sem pontuação
  return grupo.slice().sort((a, b) => {
    if (b.usos !== a.usos) return b.usos - a.usos;
    if (a.nome.length !== b.nome.length) return a.nome.length - b.nome.length;
    const pontA = (a.nome.match(/[.,]/g) || []).length;
    const pontB = (b.nome.match(/[.,]/g) || []).length;
    return pontA - pontB;
  })[0];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await sequelize.authenticate();

  // Conta usos de cada ministro
  const usoRows = await sequelize.query(
    `SELECT "ministroId", COUNT(*) as usos
     FROM "${schema}"."registro_culto_ministro"
     GROUP BY "ministroId"`,
    { type: QueryTypes.SELECT }
  );
  const usoMap = new Map(usoRows.map((r) => [r.ministroId, Number(r.usos)]));

  const todos = await Ministro.findAll({ order: [['nome', 'ASC']], raw: true });
  const ministros = todos.map((m) => ({ ...m, usos: usoMap.get(m.id) || 0 }));

  console.log(`\nMinistros no banco: ${ministros.length}`);

  // ── Carrega mapeamento externo se --importar ────────────────────────────
  let grupos;
  if (importarPath) {
    const arquivoAbs = path.resolve(importarPath);
    if (!fs.existsSync(arquivoAbs)) {
      console.error(`\nArquivo não encontrado: ${arquivoAbs}`);
      console.error('Gere o arquivo primeiro com:');
      console.error(`  node server/scripts/dedupMinistros.js --exportar ${importarPath}`);
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(arquivoAbs, 'utf-8'));
    grupos = raw.map((g) => ({
      manter: ministros.find((m) => m.id === g.manterId) || { id: g.manterId, nome: g.manter, usos: 0 },
      mesclar: g.mesclar.map((id) => ministros.find((m) => m.id === id)).filter(Boolean),
    }));
    console.log(`Mapeamento importado: ${grupos.length} grupos`);
  } else {
    // ── Detecta automaticamente ─────────────────────────────────────────
    const gruposDetectados = agrupar(ministros, 0.80);
    grupos = gruposDetectados.map((g) => ({
      manter: escolherCanônico(g),
      mesclar: g.filter((m) => m.id !== escolherCanônico(g).id),
    }));
    console.log(`Grupos similares detectados: ${grupos.length}`);
  }

  if (grupos.length === 0) {
    console.log('\nNenhum duplicado detectado.');
    await sequelize.close();
    return;
  }

  // ── Exibe os grupos ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  grupos.forEach((g, i) => {
    console.log(`\nGrupo ${i + 1}:`);
    console.log(`  ✔ MANTER : "${g.manter.nome}" (${g.manter.usos} uso(s))`);
    g.mesclar.forEach((m) => console.log(`  ✘ MESCLAR: "${m.nome}" (${m.usos} uso(s))`));
  });
  console.log('\n══════════════════════════════════════════════════════════');

  // ── Exportar JSON para edição manual ──────────────────────────────────
  if (exportarPath) {
    const saida = grupos.map((g) => ({
      manter: g.manter.nome,
      manterId: g.manter.id,
      mesclar: g.mesclar.map((m) => m.id),
      mesclarNomes: g.mesclar.map((m) => m.nome),
    }));
    fs.writeFileSync(path.resolve(exportarPath), JSON.stringify(saida, null, 2), 'utf-8');
    console.log(`\nMapeamento salvo em: ${exportarPath}`);
    console.log('Edite o arquivo (altere "manterId" ou remova grupos indesejados) e rode com --importar para aplicar.');
    await sequelize.close();
    return;
  }

  if (isDryRun) {
    console.log('\n[DRY-RUN] Para aplicar: node server/scripts/dedupMinistros.js --apply');
    console.log('Para revisar antes: node server/scripts/dedupMinistros.js --exportar mapeamento.json');
    await sequelize.close();
    return;
  }

  // ── Aplica a mesclagem ─────────────────────────────────────────────────
  let totalMesclados = 0;
  let totalErros = 0;

  for (const g of grupos) {
    for (const duplicado of g.mesclar) {
      const t = await sequelize.transaction();
      try {
        // 1. Redireciona vínculos com registros de culto para o canônico
        //    Evita duplicar um vínculo que já existe (ON CONFLICT DO NOTHING via raw)
        const vinculosExistentes = await sequelize.query(
          `SELECT "registroCultoId" FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: g.manter.id }, type: QueryTypes.SELECT, transaction: t }
        );
        const jaVinculados = new Set(vinculosExistentes.map((v) => v.registroCultoId));

        const vinculosDuplicado = await sequelize.query(
          `SELECT "registroCultoId" FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: duplicado.id }, type: QueryTypes.SELECT, transaction: t }
        );

        for (const v of vinculosDuplicado) {
          if (!jaVinculados.has(v.registroCultoId)) {
            await sequelize.query(
              `INSERT INTO "${schema}"."registro_culto_ministro" ("ministroId","registroCultoId") VALUES (:manter,:culto)`,
              { replacements: { manter: g.manter.id, culto: v.registroCultoId }, type: QueryTypes.INSERT, transaction: t }
            );
          }
        }

        // 2. Remove os vínculos do duplicado
        await sequelize.query(
          `DELETE FROM "${schema}"."registro_culto_ministro" WHERE "ministroId" = :id`,
          { replacements: { id: duplicado.id }, type: QueryTypes.DELETE, transaction: t }
        );

        // 3. Deleta o ministro duplicado
        await Ministro.destroy({ where: { id: duplicado.id }, transaction: t });

        await t.commit();
        console.log(`  ✔ "${duplicado.nome}" → "${g.manter.nome}"`);
        totalMesclados += 1;
      } catch (err) {
        await t.rollback();
        console.error(`  ✘ Erro ao mesclar "${duplicado.nome}": ${err.message}`);
        totalErros += 1;
      }
    }

    // Atualiza quemMinistrou nos registros de culto que ainda referenciam os nomes antigos
    for (const duplicado of g.mesclar) {
      try {
        await sequelize.query(
          `UPDATE "${schema}"."registro_culto" SET "quemMinistrou" = REPLACE("quemMinistrou", :antigo, :novo)
           WHERE "quemMinistrou" LIKE :like`,
          {
            replacements: { antigo: duplicado.nome, novo: g.manter.nome, like: `%${duplicado.nome}%` },
            type: QueryTypes.UPDATE,
          }
        );
      } catch (err) {
        // não crítico
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`Mesclados com sucesso : ${totalMesclados}`);
  if (totalErros > 0) console.log(`Erros                : ${totalErros}`);
  console.log('══════════════════════════════════════════════════════════\n');

  await sequelize.close();
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
