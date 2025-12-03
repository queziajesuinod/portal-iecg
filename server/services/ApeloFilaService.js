const axios = require('axios');
const { Op } = require('sequelize');
const { ApeloDirecionadoCelula, Celula } = require('../models');
const ApeloDirecionadoCelulaService = require('./ApeloDirecionadoCelulaService');
const WebhookService = require('./WebhookService');

const diasRecencia = 30;
const maxPorCelulaRecente = 2;

const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const geocode = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'portal-iecg/1.0' }, timeout: 5000 });
    const first = Array.isArray(res.data) ? res.data[0] : null;
    if (!first || !first.lat || !first.lon) return null;
    return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
  } catch (err) {
    return null;
  }
};

class ApeloFilaService {
  async proximoApelo() {
    return ApeloDirecionadoCelula.findOne({
      where: {
        celula_id: null,
        bairro_apelo: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] },
        [Op.or]: [
          { status: null },
          { status: { [Op.ne]: 'DIRECIONADO_COM_SUCESSO' } }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
  }

  async celulasCandidatas(rede) {
    const where = { ativo: true };
    if (rede) where.rede = { [Op.iLike]: `%${rede}%` };
    return Celula.findAll({ where });
  }

  async celulasComCapacidade(celulas) {
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - diasRecencia);

    const result = [];
    for (const celula of celulas) {
      const recentes = await ApeloDirecionadoCelula.count({
        where: {
          celula_id: celula.id,
          data_direcionamento: { [Op.gte]: limiteData }
        }
      });
      if (recentes < maxPorCelulaRecente) {
        result.push(celula);
      }
    }
    return result;
  }

  async melhorCelula(apelo) {
    const baseCelulas = await this.celulasCandidatas(apelo.rede);
    const celulasDisponiveis = await this.celulasComCapacidade(baseCelulas);
    if (!celulasDisponiveis.length) return null;

    const tries = [];
    if (apelo.bairro_apelo) {
      tries.push(`${apelo.bairro_apelo}, ${apelo.cidade_apelo || ''}, ${apelo.estado_apelo || ''}`);
    }
    if (Array.isArray(apelo.bairro_proximo)) {
      apelo.bairro_proximo.forEach((b) => {
        if (b) tries.push(`${b}, ${apelo.cidade_apelo || ''}, ${apelo.estado_apelo || ''}`);
      });
    }
    if (!tries.length && apelo.cidade_apelo) {
      tries.push(`${apelo.cidade_apelo}, ${apelo.estado_apelo || ''}`);
    }

    let origemCoord = null;
    for (const t of tries) {
      origemCoord = await geocode(t);
      if (origemCoord) break;
    }
    if (!origemCoord) return null;

    let melhor = null;
    let menorDist = Infinity;
    for (const celula of celulasDisponiveis) {
      if (!celula.lat || !celula.lon) continue;
      const dist = haversine(origemCoord.lat, origemCoord.lon, celula.lat, celula.lon);
      if (dist < menorDist) {
        menorDist = dist;
        melhor = { celula, distKm: dist };
      }
    }
    return melhor;
  }

  async processarFila() {
    const apelo = await this.proximoApelo();
    if (!apelo) {
      return { mensagem: 'Nenhum apelo aguardando direcionamento.' };
    }

    const selecionada = await this.melhorCelula(apelo);
    if (!selecionada) {
      return { mensagem: 'Nenhuma célula disponível/compatível encontrada.', apeloId: apelo.id };
    }

    const { celula, distKm } = selecionada;
    const payloadAtualizar = {
      celula_id: celula.id,
      lider_direcionado: celula.lider || null,
      cel_lider: celula.cel_lider || null,
      bairro_direcionado: celula.bairro || null,
      direcionado_celula: true,
      data_direcionamento: new Date(),
      status: 'DIRECIONADO_COM_SUCESSO'
    };

    const atualizado = await ApeloDirecionadoCelulaService.atualizar(apelo.id, payloadAtualizar);

    WebhookService.sendEvent('apelo.moved', {
      apeloId: apelo.id,
      destinoCelulaId: celula.id,
      distanciaKm: distKm
    }).catch(() => {});
    WebhookService.sendEvent('apelo.status_changed', {
      apeloId: apelo.id,
      status: 'DIRECIONADO_COM_SUCESSO'
    }).catch(() => {});

    return {
      mensagem: 'Apelo direcionado com sucesso',
      apeloId: apelo.id,
      celula: {
        id: celula.id,
        nome: celula.celula,
        lider: celula.lider,
        bairro: celula.bairro,
        rede: celula.rede
      },
      distanciaKm: distKm
    };
  }
}

module.exports = new ApeloFilaService();
