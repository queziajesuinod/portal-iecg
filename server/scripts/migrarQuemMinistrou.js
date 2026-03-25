/**
 * Migra o campo quemMinistrou (texto livre) para a tabela ministro + junction registro_culto_ministro.
 *
 * Para cada registro de culto que ainda não tem ministros vinculados:
 *   1. Divide o texto de quemMinistrou em nomes (separador: vírgula ou "e")
 *   2. Normaliza cada nome (trim + capitalização simples)
 *   3. Busca ou cria o Ministro pelo nome normalizado
 *   4. Vincula ao registro via setMinistros()
 *
 * Uso:
 *   node server/scripts/migrarQuemMinistrou.js [--dry-run]
 */

require('dotenv').config();
const { sequelize, RegistroCulto, Ministro } = require('../models');

const isDryRun = process.argv.includes('--dry-run');

// ─── Normalização de nomes ────────────────────────────────────────────────────

/**
 * Capitaliza cada palavra do nome.
 * Ex: "léo alcará " → "Léo Alcará"
 */
function normalizarNome(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Divide o campo quemMinistrou em nomes individuais.
 * Aceita separadores: vírgula, " e ", " / "
 */
function extrairNomes(texto) {
  if (!texto || !texto.trim()) return [];
  return texto
    .split(/,|\se\s|\s\/\s/i)
    .map(normalizarNome)
    .filter((n) => n.length > 0);
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function run() {
  await sequelize.authenticate();

  // Carrega todos os registros com seus ministros já vinculados
  const registros = await RegistroCulto.findAll({
    include: [{ model: Ministro, as: 'ministros', attributes: ['id', 'nome'], through: { attributes: [] } }],
    order: [['data', 'ASC']],
  });

  console.log(`\nTotal de registros: ${registros.length}`);
  console.log(`Modo: ${isDryRun ? 'DRY RUN (nada será salvo)' : 'MIGRAÇÃO REAL'}\n`);

  // Cache de ministros já criados nessa execução: nome normalizado → Ministro
  const cacheMinistros = {};

  // Pré-carrega ministros existentes no banco
  const existentes = await Ministro.findAll();
  existentes.forEach((m) => {
    cacheMinistros[m.nome.toLowerCase()] = m;
  });
  console.log(`Ministros já cadastrados: ${existentes.length}\n`);

  let registrosAtualizados = 0;
  let ministrosCriados = 0;
  let registrosPulados = 0;
  const avisos = [];

  for (const registro of registros) {
    // Pula registros que já têm ministros vinculados
    if (registro.ministros && registro.ministros.length > 0) {
      registrosPulados++;
      continue;
    }

    const texto = registro.quemMinistrou;
    if (!texto || !texto.trim()) {
      avisos.push(`[${registro.data}] ID ${registro.id} — quemMinistrou vazio, pulado`);
      registrosPulados++;
      continue;
    }

    const nomes = extrairNomes(texto);
    if (nomes.length === 0) {
      avisos.push(`[${registro.data}] ID ${registro.id} — não foi possível extrair nomes de: "${texto}"`);
      registrosPulados++;
      continue;
    }

    const ministrosDoRegistro = [];

    for (const nome of nomes) {
      const chave = nome.toLowerCase();
      let ministro = cacheMinistros[chave];

      if (!ministro) {
        if (isDryRun) {
          console.log(`  [DRY RUN] Criaria ministro: "${nome}"`);
          ministrosCriados++;
          // Cria objeto fake para o dry-run
          ministro = { id: `fake-${chave}`, nome };
          cacheMinistros[chave] = ministro;
        } else {
          ministro = await Ministro.create({ nome, ativo: true });
          cacheMinistros[chave] = ministro;
          ministrosCriados++;
          console.log(`  + Ministro criado: "${nome}"`);
        }
      }

      ministrosDoRegistro.push(ministro);
    }

    if (isDryRun) {
      console.log(`[DRY RUN] ${registro.data} | "${texto}" → [${nomes.join(', ')}]`);
    } else {
      await registro.setMinistros(ministrosDoRegistro.map((m) => m.id));
      console.log(`${registro.data} | "${texto}" → [${nomes.join(', ')}]`);
    }

    registrosAtualizados++;
  }

  // ── Relatório ──
  console.log('\n══════════════════════════════════════');
  console.log(`Registros atualizados : ${registrosAtualizados}`);
  console.log(`Registros pulados     : ${registrosPulados}`);
  console.log(`Ministros criados     : ${ministrosCriados}`);
  if (avisos.length > 0) {
    console.log(`\nAvisos (${avisos.length}):`);
    avisos.forEach((a) => console.log(' ', a));
  }
  console.log('══════════════════════════════════════\n');

  await sequelize.close();
}

run().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
