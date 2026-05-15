/* eslint-disable no-console */
/**
 * Adiciona permissões necessárias ao perfil LIDER_CELULA.
 *
 * Permissões adicionadas:
 *   - LIDER_CELULA_PRESENCA — exibição do item "Minha Célula" no menu
 *
 * Uso:
 *   node scripts/addPermissoesLiderCelula.js            # executa
 *   node scripts/addPermissoesLiderCelula.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const {
  sequelize, Perfil, Permissao, PerfilPermissao
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSOES_NECESSARIAS = [
  { nome: 'LIDER_CELULA_PRESENCA', descricao: 'Acessar a página Minha Célula (presença)' },
];

async function main() {
  console.log(`\n=== addPermissoesLiderCelula ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  const perfil = await Perfil.findOne({ where: { descricao: 'LIDER_CELULA' } });
  if (!perfil) {
    console.error('Perfil LIDER_CELULA não encontrado. Execute setPerfilLiderCelula.js primeiro.');
    process.exit(1);
  }
  console.log(`✔ Perfil LIDER_CELULA encontrado (id: ${perfil.id})\n`);

  for (const def of PERMISSOES_NECESSARIAS) {
    const [permissao] = await Permissao.findOrCreate({
      where: { nome: def.nome },
      defaults: { nome: def.nome, descricao: def.descricao }
    });

    const jaAssociado = await PerfilPermissao.findOne({
      where: { perfilId: perfil.id, permissaoId: permissao.id }
    });

    if (jaAssociado) {
      console.log(`  ─ ${def.nome} — já associado ao perfil.`);
    } else {
      console.log(`  + ${def.nome} — adicionando ao perfil LIDER_CELULA.`);
      if (!isDryRun) {
        await PerfilPermissao.create({ perfilId: perfil.id, permissaoId: permissao.id });
      }
    }
  }

  console.log('\n─────────────────────────────────────');
  if (isDryRun) console.log('[DRY-RUN] Nenhuma alteração foi gravada.');
  else console.log('Permissões atualizadas com sucesso.');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
