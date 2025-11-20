'use strict';
require('dotenv').config();
const uuid = require('uuid');
const { Campus, sequelize } = require('../models');

const CAMPUS_SEED = [
  {
    nome: 'CAMPUS IECG CENTRO',
    endereco: 'Rua 14 de Julho, 2706',
    bairro: 'Centro',
    cidade: 'Campo Grande',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG AERO RANCHO',
    endereco: 'Av. Gunter Hans, 4471',
    bairro: 'Conj. Aero Rancho',
    cidade: 'Campo Grande',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG VILA MARGARIDA',
    endereco: 'Rua Naviraí, 929',
    bairro: 'Vila Margarida',
    cidade: 'Campo Grande',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG ARARAQUARA',
    endereco: 'Av. Maurício Galli, 3953 - Jardim Roberto Selmi Dei',
    bairro: '',
    cidade: 'Araraquara',
    estado: 'SP',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG PALHOÇA',
    endereco: 'R. Lisânto, 195 - Jardim Eldorado',
    bairro: 'Jardim Eldorado',
    cidade: 'Palhoça',
    estado: 'SC',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG RIBAS DO RIO PARDO',
    endereco: 'Av. Áureliano Moura Brandão, 752',
    bairro: 'Vila Santos Dumont',
    cidade: 'Ribas do Rio Pardo',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG BANDEIRANTES',
    endereco: 'Av. Francisco Antônio de Souza, 2735',
    bairro: 'Centro',
    cidade: 'Bandeirantes',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG VILA VELHA',
    endereco: 'Rua Itaoca, 44 - Praia de Itaparica - Auditório do Hotel Santorini',
    bairro: 'Praia de Itaparica',
    cidade: 'Vila Velha',
    estado: 'ES',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG DOURADOS',
    endereco: 'Av. Weimar Gonçalves Torres, 2862',
    bairro: 'Centro',
    cidade: 'Dourados',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG PONTA PORÃ',
    endereco: 'Rua Guia Lopes, 56, Centro - Hotel Barcelona',
    bairro: 'Centro',
    cidade: 'Ponta Porã',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
  {
    nome: 'CAMPUS IECG LOS ANGELES',
    endereco: 'Rua Augusta Rossini Guidi, 1262',
    bairro: 'Los Angeles',
    cidade: 'Campo Grande',
    estado: 'MS',
    pastoresResponsaveis: '',
    telefone: '55 67 3384-5308',
  },
];

async function run() {
  try {
    await sequelize.authenticate();
    for (const campusData of CAMPUS_SEED) {
      await Campus.findOrCreate({
        where: { nome: campusData.nome },
        defaults: { id: uuid.v4(), ...campusData },
      });
    }
    console.log('Seed de Campus concluído.');
  } catch (err) {
    console.error('Erro ao executar seed de campus:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
