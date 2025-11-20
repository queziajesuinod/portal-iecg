'use strict';
require('dotenv').config();
const { Celula, Campus, sequelize } = require('../models');
const { Op } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    const celulas = await Celula.findAll();
    let atualizados = 0;
    for (const celula of celulas) {
      if (celula.campusId && celula.campusId !== null) {
        continue;
      }
      if (!celula.campus) {
        continue;
      }
      const campus = await Campus.findOne({
        where: {
          nome: {
            [Op.iLike]: `%${celula.campus}%`
          }
        }
      });
      if (campus) {
        celula.campusId = campus.id;
        await celula.save();
        atualizados += 1;
      }
    }
    console.log(`Seed finalizado. Células atualizadas: ${atualizados}`);
  } catch (err) {
    console.error('Erro ao executar seed de células/campus:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
