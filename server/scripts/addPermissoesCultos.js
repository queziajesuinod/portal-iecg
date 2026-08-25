/* eslint-disable no-console */
/**
 * RBAC do modulo de Cultos ("Saúde dos Cultos").
 *
 * Cria as permissões:
 *   - CULTOS_REGISTRO  -> registrar culto (ver lista/detalhe, criar) + lookups do
 *                         formulário (tipos, ministérios, ministros/convidado).
 *   - CULTOS_GESTAO    -> editar/excluir registro, dashboard, relatório, validação
 *                         e gestão de ministros/ministérios/tipos/campus.
 *
 * Atribui:
 *   - Perfil BACKSTAGE            -> CULTOS_REGISTRO
 *   - Perfil Gerencia_Backstage   -> CULTOS_REGISTRO + CULTOS_GESTAO (perfil criado se faltar)
 *   - Perfil Administrador        -> ambas (admin ja tem bypass via ADMIN_FULL_ACCESS)
 *
 * Uso:
 *   node server/scripts/addPermissoesCultos.js            # executa
 *   node server/scripts/addPermissoesCultos.js --dry-run  # só mostra
 *
 * Idempotente.
 */

require('dotenv').config();
const uuid = require('uuid');
const {
  sequelize, Perfil, Permissao, PerfilPermissao
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSOES = {
  CULTOS_REGISTRO: 'Registrar culto: ver registros e criar (perfil Backstage)',
  CULTOS_GESTAO: 'Gestão de cultos: editar/excluir, dashboard, validação, ministros/ministérios'
};

// perfilDescricao -> permissões que ele recebe
const ATRIBUICOES = {
  BACKSTAGE: ['CULTOS_REGISTRO'],
  Gerencia_Backstage: ['CULTOS_REGISTRO', 'CULTOS_GESTAO'],
  Administrador: ['CULTOS_REGISTRO', 'CULTOS_GESTAO']
};

// Perfis que devem ser criados caso nao existam
const PERFIS_A_CRIAR = ['Gerencia_Backstage'];

async function main() {
  console.log(`\n=== addPermissoesCultos ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);
  await sequelize.authenticate();

  // 1) Permissões
  const permByName = {};
  for (const [nome, descricao] of Object.entries(PERMISSOES)) {
    // eslint-disable-next-line no-await-in-loop
    const [permissao, criada] = await Permissao.findOrCreate({
      where: { nome },
      defaults: { id: uuid.v4(), nome, descricao }
    });
    permByName[nome] = permissao;
    console.log(`${criada ? '+ CRIADA' : '─ JÁ EXISTE'}: permissão ${nome}`);
  }

  // 2) Perfis que precisam existir
  for (const descricao of PERFIS_A_CRIAR) {
    // eslint-disable-next-line no-await-in-loop
    const [, criado] = await Perfil.findOrCreate({
      where: { descricao },
      defaults: { id: uuid.v4(), descricao }
    });
    console.log(`${criado ? '+ CRIADO' : '─ JÁ EXISTE'}: perfil ${descricao}`);
  }

  // 3) Atribuições
  for (const [perfilDescricao, permissoes] of Object.entries(ATRIBUICOES)) {
    // eslint-disable-next-line no-await-in-loop
    const perfil = await Perfil.findOne({ where: { descricao: perfilDescricao } });
    if (!perfil) {
      console.warn(`  ! Perfil "${perfilDescricao}" não encontrado — pulando.`);
      continue;
    }
    for (const nomePerm of permissoes) {
      const permissao = permByName[nomePerm];
      // eslint-disable-next-line no-await-in-loop
      const ja = await PerfilPermissao.findOne({ where: { perfilId: perfil.id, permissaoId: permissao.id } });
      if (ja) {
        console.log(`  ─ ${perfilDescricao} já tem ${nomePerm}`);
      } else {
        console.log(`  + ${perfilDescricao} recebe ${nomePerm}`);
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
