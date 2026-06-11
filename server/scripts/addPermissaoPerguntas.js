/* eslint-disable no-console */
/**
 * Adiciona as permissões do módulo de Perguntas ao Vivo e as associa ao
 * perfil Administrador:
 *   - PERGUNTAS_AO_VIVO_GERENCIAR: criar/editar/excluir salas, aparência e moderar
 *   - PERGUNTAS_AO_VIVO_MODERAR:   apenas moderar as perguntas das salas
 *
 * Uso:
 *   node server/scripts/addPermissaoPerguntas.js            # executa
 *   node server/scripts/addPermissaoPerguntas.js --dry-run  # só mostra
 *
 * Idempotente: usa findOrCreate e verifica associação antes de criar.
 */

require('dotenv').config();
const uuid = require('uuid');
const {
  sequelize, Perfil, Permissao, PerfilPermissao,
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSOES = [
  { nome: 'PERGUNTAS_AO_VIVO_GERENCIAR', descricao: 'Criar, editar e excluir salas de Perguntas ao Vivo, além de moderar' },
  { nome: 'PERGUNTAS_AO_VIVO_MODERAR', descricao: 'Moderar as perguntas das salas de Perguntas ao Vivo' },
];
const PERFIL_DESCRICAO = process.env.SEED_ADMIN_PERFIL || 'Administrador';

async function main() {
  console.log(`\n=== addPermissaoPerguntas ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  const perfil = await Perfil.findOne({ where: { descricao: PERFIL_DESCRICAO } });
  if (!perfil) {
    console.warn(`Perfil "${PERFIL_DESCRICAO}" não encontrado. As permissões serão criadas, mas não associadas.`);
  }

  for (const def of PERMISSOES) {
    // eslint-disable-next-line no-await-in-loop
    const [permissao, criada] = await Permissao.findOrCreate({
      where: { nome: def.nome },
      defaults: { id: uuid.v4(), ...def },
    });
    console.log(`${criada ? '+ CRIADA' : '─ JÁ EXISTE'}: permissão ${def.nome}`);

    if (perfil) {
      // eslint-disable-next-line no-await-in-loop
      const jaAssociado = await PerfilPermissao.findOne({
        where: { perfilId: perfil.id, permissaoId: permissao.id },
      });
      if (jaAssociado) {
        console.log(`  ─ JÁ ASSOCIADA ao perfil ${PERFIL_DESCRICAO}.`);
      } else {
        console.log(`  + ASSOCIANDO ao perfil ${PERFIL_DESCRICAO}.`);
        if (!isDryRun) {
          // eslint-disable-next-line no-await-in-loop
          await PerfilPermissao.create({ perfilId: perfil.id, permissaoId: permissao.id });
        }
      }
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
