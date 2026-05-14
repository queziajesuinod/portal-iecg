/* eslint-disable no-console */
const { Op } = require('sequelize');
const { sequelize, Member, Celula } = require('../models');

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  const lideres = await Member.findAll({
    where: { status: 'VISITANTE' },
    include: [{
      model: Celula,
      as: 'liderancaCelulas',
      where: { ativo: true },
      required: true,
      attributes: ['id', 'celula']
    }],
    attributes: ['id', 'fullName', 'status']
  });

  console.log(`Líderes ativos com status VISITANTE encontrados: ${lideres.length}`);

  if (lideres.length === 0) {
    console.log('Nenhum ajuste necessário.');
    return;
  }

  for (const membro of lideres) {
    const celulaNomes = membro.liderancaCelulas.map((c) => c.celula).join(', ');
    console.log(`  - ${membro.fullName} (${membro.id}) → células: ${celulaNomes}`);
  }

  if (isDryRun) {
    console.log('\nDry-run ativo — nenhuma alteração aplicada.');
    return;
  }

  const ids = lideres.map((m) => m.id);
  const [count] = await Member.update(
    { status: 'MEMBRO' },
    { where: { id: { [Op.in]: ids } } }
  );

  console.log(`\n${count} membro(s) atualizados para status MEMBRO.`);
}

run()
  .catch((err) => {
    console.error('Erro:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
