/* eslint-disable no-console, no-await-in-loop */
/**
 * Atribui o perfil LIDER_CELULA a todos os usuários que são líderes de célula ativa.
 *
 * O script:
 *   1. Busca (ou cria) o Perfil com descricao = 'LIDER_CELULA'.
 *   2. Encontra todas as células ativas que possuem liderId preenchido.
 *   3. Para cada usuário líder:
 *      - Atualiza user.perfilId para o perfil LIDER_CELULA.
 *      - Garante o registro na tabela UserPerfis (many-to-many), sem duplicar.
 *
 * Uso:
 *   node scripts/setPerfilLiderCelula.js            # executa
 *   node scripts/setPerfilLiderCelula.js --dry-run  # só mostra, não grava
 */

require('dotenv').config();
const {
  sequelize, Perfil, User, Celula, UserPerfil
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n=== setPerfilLiderCelula ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);

  await sequelize.authenticate();

  // 1. Busca ou cria o perfil LIDER_CELULA
  const [perfil, created] = await Perfil.findOrCreate({
    where: { descricao: 'LIDER_CELULA' },
    defaults: { descricao: 'LIDER_CELULA' }
  });

  if (created) {
    console.log(`✔ Perfil LIDER_CELULA criado (id: ${perfil.id})`);
  } else {
    console.log(`✔ Perfil LIDER_CELULA encontrado (id: ${perfil.id})`);
  }

  // 2. Busca células ativas com liderId preenchido
  const celulas = await Celula.findAll({
    where: { ativo: true },
    attributes: ['id', 'celula', 'liderId'],
    include: [{
      model: User,
      as: 'liderRef',
      attributes: ['id', 'name', 'email', 'perfilId'],
      required: true
    }]
  });

  if (!celulas.length) {
    console.log('Nenhuma célula ativa com líder encontrada.');
    return;
  }

  console.log(`\nCélulas ativas com líder: ${celulas.length}\n`);

  // Deduplica por userId (um usuário pode liderar mais de uma célula)
  const usuariosMap = new Map();
  for (const celula of celulas) {
    const user = celula.liderRef;
    if (!usuariosMap.has(user.id)) {
      usuariosMap.set(user.id, { user, celulas: [] });
    }
    usuariosMap.get(user.id).celulas.push(celula.celula || celula.id);
  }

  let atualizados = 0;
  let jaCorretos = 0;
  let erros = 0;

  for (const { user, celulas: nomeCelulas } of usuariosMap.values()) {
    const celulaLabel = nomeCelulas.join(', ');
    try {
      const jaTemVinculo = !!(await UserPerfil.findOne({
        where: { userId: user.id, perfilId: perfil.id }
      }));

      if (jaTemVinculo) {
        console.log(`  ─ ${user.name} (${user.email}) — já possui o perfil. Célula(s): ${celulaLabel}`);
        jaCorretos += 1;
        continue;
      }

      // Usa perfilId primário somente se o usuário não tiver nenhum ainda (null).
      // Se já tiver outro perfil (ex: ADMIN), preserva e adiciona LIDER_CELULA via UserPerfis.
      const semPerfilPrimario = !user.perfilId;
      console.log(`  → ${user.name} (${user.email}) — adicionando LIDER_CELULA${semPerfilPrimario ? ' (primário)' : ' (extra, preserva perfil atual)'}. Célula(s): ${celulaLabel}`);

      if (!isDryRun) {
        if (semPerfilPrimario) {
          await user.update({ perfilId: perfil.id });
        }
        await UserPerfil.findOrCreate({
          where: { userId: user.id, perfilId: perfil.id }
        });
      }

      atualizados += 1;
    } catch (err) {
      console.error(`  ✖ Erro ao processar ${user.name} (${user.email}): ${err.message}`);
      erros += 1;
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`Usuários atualizados : ${atualizados}`);
  console.log(`Já corretos          : ${jaCorretos}`);
  console.log(`Erros                : ${erros}`);
  if (isDryRun) console.log('\n[DRY-RUN] Nenhuma alteração foi gravada.');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
