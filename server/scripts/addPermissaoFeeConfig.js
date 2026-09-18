/* eslint-disable no-console */
/**
 * Cria a permissão FEE_CONFIG_MANAGE (configurar a tabela de taxas do Financeiro)
 * e associa ao perfil Administrador. Coordenadores NÃO recebem — logo não configuram taxas.
 *
 * Uso:
 *   node server/scripts/addPermissaoFeeConfig.js            # executa
 *   node server/scripts/addPermissaoFeeConfig.js --dry-run  # só mostra
 *
 * Idempotente.
 */
require('dotenv').config();
const uuid = require('uuid');
const {
  sequelize, Perfil, Permissao, PerfilPermissao
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSAO = {
  nome: 'FEE_CONFIG_MANAGE',
  descricao: 'Configurar a tabela de taxas (fee config) do Financeiro'
};
const PERFIL_DESCRICAO = process.env.SEED_ADMIN_PERFIL || 'Administrador';

async function main() {
  console.log(`\n=== addPermissaoFeeConfig ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);
  await sequelize.authenticate();

  const [permissao, criada] = await Permissao.findOrCreate({
    where: { nome: PERMISSAO.nome },
    defaults: { id: uuid.v4(), ...PERMISSAO },
  });
  console.log(`${criada ? '+ CRIADA' : '─ JÁ EXISTE'}: permissão ${PERMISSAO.nome}`);

  const perfil = await Perfil.findOne({ where: { descricao: PERFIL_DESCRICAO } });
  if (!perfil) {
    console.warn(`Perfil "${PERFIL_DESCRICAO}" não encontrado. Permissão criada, mas não associada.`);
  } else {
    const jaAssociado = await PerfilPermissao.findOne({
      where: { perfilId: perfil.id, permissaoId: permissao.id },
    });
    if (jaAssociado) {
      console.log(`─ JÁ ASSOCIADA ao perfil ${PERFIL_DESCRICAO}.`);
    } else {
      console.log(`+ ASSOCIANDO ao perfil ${PERFIL_DESCRICAO}.`);
      if (!isDryRun) {
        await PerfilPermissao.create({ perfilId: perfil.id, permissaoId: permissao.id });
      }
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(isDryRun ? '[DRY-RUN] Nenhuma alteração gravada.' : 'Concluído com sucesso.');
  console.log('');
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
