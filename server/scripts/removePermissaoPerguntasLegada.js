/* eslint-disable no-console */
/**
 * Remove a permissão legada PERGUNTAS_AO_VIVO (substituída por
 * PERGUNTAS_AO_VIVO_GERENCIAR e PERGUNTAS_AO_VIVO_MODERAR) e suas associações.
 *
 * Uso:
 *   node server/scripts/removePermissaoPerguntasLegada.js            # executa
 *   node server/scripts/removePermissaoPerguntasLegada.js --dry-run  # só mostra
 *
 * Idempotente: se a permissão não existir, não faz nada.
 */

require('dotenv').config();
const { sequelize, Permissao, PerfilPermissao } = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const NOME = 'PERGUNTAS_AO_VIVO';

async function main() {
  console.log(`\n=== removePermissaoPerguntasLegada ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  const permissao = await Permissao.findOne({ where: { nome: NOME } });
  if (!permissao) {
    console.log(`─ Permissão ${NOME} não existe. Nada a fazer.`);
  } else {
    const assoc = await PerfilPermissao.count({ where: { permissaoId: permissao.id } });
    console.log(`Encontrada permissão ${NOME} com ${assoc} associação(ões) de perfil.`);
    if (!isDryRun) {
      await PerfilPermissao.destroy({ where: { permissaoId: permissao.id } });
      await permissao.destroy();
      console.log(`+ REMOVIDA: permissão ${NOME} e suas associações.`);
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(isDryRun ? '[DRY-RUN] Nenhuma alteração gravada.' : 'Concluído com sucesso.');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
