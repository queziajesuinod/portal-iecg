/**
 * Seed: Módulo Saúde e Fluxo de Cultos
 *
 * Execução:
 *   node server/scripts/seedCultos.js
 *
 * O script é idempotente: usa findOrCreate para não duplicar registros.
 */

require('dotenv').config();
const { sequelize } = require('../models');
const { Ministerio, TipoEvento, Campus, CampusMinisterio } = require('../models');

const MINISTERIOS = [
  { nome: 'Geral',               exibeCriancas: true,  exibeBebes: true,  apeloDefault: false, exibeOnline: true  },
  { nome: 'Juventude Relevante', exibeCriancas: true,  exibeBebes: true,  apeloDefault: true,  exibeOnline: true  },
  { nome: 'Relevanteen',         exibeCriancas: false, exibeBebes: false, apeloDefault: true,  exibeOnline: false },
  { nome: 'Juniors',             exibeCriancas: false, exibeBebes: false, apeloDefault: true,  exibeOnline: false },
];

const TIPOS_EVENTO = ['Culto', 'Culto Especial', 'Oração', 'Treinamento', 'Conferência'];

const CAMPI_ONLINE = {
  'IECG Centro': true,
};

// campus_nome → array de nomes de ministérios vinculados
const VINCULOS = {
  'IECG Centro':              ['Geral', 'Juventude Relevante', 'Relevanteen', 'Juniors'],
  'IECG Vila Margarida':      ['Geral', 'Relevanteen'],
  'IECG Palhoça':             ['Geral', 'Relevanteen'],
  'IECG Los Angeles':         ['Geral', 'Relevanteen'],
  'IECG Aero Rancho':         ['Geral', 'Relevanteen'],
  'IECG Araraquara':          ['Geral', 'Relevanteen'],
  'IECG Vila Velha':          ['Geral'],
  'IECG Ribas do Rio Pardo':  ['Geral'],
  'IECG Guarujá':             ['Geral'],
  'IECG Dourados':            ['Geral'],
  'IECG Bandeirantes':        ['Geral'],
  'IECG Ponta Porã':          ['Geral'],
};

async function run() {
  await sequelize.authenticate();
  console.log('Conectado ao banco.\n');

  // 1. Ministérios
  console.log('Criando ministérios...');
  const ministerioMap = {};
  for (const m of MINISTERIOS) {
    const [inst, created] = await Ministerio.findOrCreate({
      where: { nome: m.nome },
      defaults: { ...m, ativo: true },
    });
    ministerioMap[m.nome] = inst.id;
    console.log(`  ${created ? 'CRIADO' : 'JÁ EXISTE'}: ${m.nome}`);
  }

  // 2. Tipos de Evento
  console.log('\nCriando tipos de evento...');
  for (const nome of TIPOS_EVENTO) {
    const [, created] = await TipoEvento.findOrCreate({
      where: { nome },
      defaults: { ativo: true },
    });
    console.log(`  ${created ? 'CRIADO' : 'JÁ EXISTE'}: ${nome}`);
  }

  // 3. transmiteOnline nos campi existentes
  console.log('\nAtualizando transmiteOnline nos campi...');
  const campiDb = await Campus.findAll();
  for (const campus of campiDb) {
    const transmite = CAMPI_ONLINE[campus.nome] === true;
    if (campus.transmiteOnline !== transmite) {
      campus.transmiteOnline = transmite;
      await campus.save();
      console.log(`  ATUALIZADO: ${campus.nome} → transmiteOnline=${transmite}`);
    } else {
      console.log(`  SEM MUDANÇA: ${campus.nome}`);
    }
  }

  // 4. Vínculos Campus × Ministério
  console.log('\nCriando vínculos campus × ministério...');
  for (const campus of campiDb) {
    const nomesMins = VINCULOS[campus.nome];
    if (!nomesMins) {
      console.log(`  IGNORADO (sem mapeamento): ${campus.nome}`);
      continue;
    }
    for (const nomeMin of nomesMins) {
      const ministerioId = ministerioMap[nomeMin];
      if (!ministerioId) {
        console.warn(`  AVISO: ministério "${nomeMin}" não encontrado para campus "${campus.nome}"`);
        continue;
      }
      const [, created] = await CampusMinisterio.findOrCreate({
        where: { campusId: campus.id, ministerioId },
        defaults: {},
      });
      if (created) console.log(`  VINCULADO: ${campus.nome} ↔ ${nomeMin}`);
    }
  }

  console.log('\nSeed concluído com sucesso!');
  await sequelize.close();
}

run().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
