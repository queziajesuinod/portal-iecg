/* eslint-disable no-console */
/**
 * Cria a permissão COUPONS_MANAGE (criar/editar/remover cupons) e a associa ao
 * perfil Administrador. Cupom passa a ser gerenciável apenas por admin
 * (ADMIN_FULL_ACCESS) ou por quem receber explicitamente esta permissão.
 *
 * Uso:
 *   node server/scripts/addPermissaoCupons.js            # executa
 *   node server/scripts/addPermissaoCupons.js --dry-run  # só mostra
 *
 * Idempotente.
 */

require('dotenv').config();
const uuid = require('uuid');
const {
  sequelize, Perfil, Permissao, PerfilPermissao
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSAO = { nome: 'COUPONS_MANAGE', descricao: 'Criar/editar/remover cupons de evento' };
const PERFIL_DESCRICAO = process.env.SEED_ADMIN_PERFIL || 'Administrador';

async function main() {
  console.log(`\n=== addPermissaoCupons ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);
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
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
