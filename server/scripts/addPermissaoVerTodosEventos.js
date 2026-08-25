/* eslint-disable no-console */
/**
 * Cria a permissão EVENTS_VIEW_ALL (ver TODOS os eventos) e a concede a todos os
 * perfis que HOJE já têm acesso a eventos (EVENTS_ACESS / EVENTS_ACCESS /
 * EVENTOS_LISTAR), para não restringir gestores existentes.
 *
 * A partir daí, um perfil que tenha acesso a eventos mas NÃO tenha EVENTS_VIEW_ALL
 * (ex.: perfil "Coordenador") passa a ver apenas os eventos em que é coordenador.
 *
 * Uso:
 *   node server/scripts/addPermissaoVerTodosEventos.js            # executa
 *   node server/scripts/addPermissaoVerTodosEventos.js --dry-run  # só mostra
 *
 * Idempotente.
 */

require('dotenv').config();
const uuid = require('uuid');
const { Op } = require('sequelize');
const {
  sequelize, Perfil, Permissao, PerfilPermissao
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PERMISSAO = { nome: 'EVENTS_VIEW_ALL', descricao: 'Ver todos os eventos (sem restrição de coordenador)' };
const EVENT_ACCESS_PERMS = ['EVENTS_ACESS', 'EVENTS_ACCESS', 'EVENTOS_LISTAR'];

async function main() {
  console.log(`\n=== addPermissaoVerTodosEventos ${isDryRun ? '[DRY-RUN]' : ''} ===\n`);
  await sequelize.authenticate();

  const [permissao, criada] = await Permissao.findOrCreate({
    where: { nome: PERMISSAO.nome },
    defaults: { id: uuid.v4(), ...PERMISSAO },
  });
  console.log(`${criada ? '+ CRIADA' : '─ JÁ EXISTE'}: permissão ${PERMISSAO.nome}`);

  // Perfis que já têm alguma permissão de acesso a eventos.
  const accessPerms = await Permissao.findAll({ where: { nome: { [Op.in]: EVENT_ACCESS_PERMS } }, attributes: ['id', 'nome'] });
  if (!accessPerms.length) {
    console.warn('Nenhuma permissão de acesso a eventos encontrada. Nada a conceder.');
  } else {
    const vinculos = await PerfilPermissao.findAll({
      where: { permissaoId: { [Op.in]: accessPerms.map((p) => p.id) } },
      attributes: ['perfilId'],
    });
    const perfilIds = Array.from(new Set(vinculos.map((v) => v.perfilId)));
    console.log(`Perfis com acesso a eventos: ${perfilIds.length}`);

    for (const perfilId of perfilIds) {
      // eslint-disable-next-line no-await-in-loop
      const perfil = await Perfil.findByPk(perfilId, { attributes: ['id', 'descricao'] });
      // eslint-disable-next-line no-await-in-loop
      const ja = await PerfilPermissao.findOne({ where: { perfilId, permissaoId: permissao.id } });
      if (ja) {
        console.log(`  ─ JÁ TEM: ${perfil?.descricao || perfilId}`);
      } else {
        console.log(`  + CONCEDENDO a: ${perfil?.descricao || perfilId}`);
        if (!isDryRun) {
          // eslint-disable-next-line no-await-in-loop
          await PerfilPermissao.create({ perfilId, permissaoId: permissao.id });
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
