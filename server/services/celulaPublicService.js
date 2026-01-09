const { Celula } = require('../models');
const { Op } = require('sequelize');

class CelulaPublicService {
  _sanitizarCelular(valor) {
    if (!valor) return '';
    return String(valor).replace(/\D/g, '');
  }

  _prepararPayload(dados = {}) {
    const payload = { ...dados };
    if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
      payload.cel_lider = this._sanitizarCelular(payload.cel_lider);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'celula') && payload.celula) {
      payload.celula = String(payload.celula).trim();
    }
    return payload;
  }

  async buscarPorCampos(campos = {}) {
    const payload = this._prepararPayload(campos);
    const where = {};
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === undefined || value === null || value === '') {
        return;
      }
      where[key] = value;
    });

    if (!Object.keys(where).length) {
      throw new Error('Informe ao menos um campo para identificar a celula.');
    }

    return await Celula.findOne({ where });
  }

  async criar(dados = {}) {
    if (!dados.celula) {
      throw new Error('Nome da celula (celula) e obrigatorio');
    }
    const payload = this._prepararPayload(dados);
    return await Celula.create(payload);
  }

  async buscarPorContato(contato) {
    if (!contato) {
      throw new Error('Parametro de contato (email ou cel_lider) e obrigatorio');
    }

    const contatoSanitizado = this._sanitizarCelular(contato);
    const isTelefone = contatoSanitizado.length >= 8;

    const celulas = await Celula.findAll({
      where: {
        [Op.or]: [
          { email_lider: contato },
          ...(isTelefone
            ? [{ cel_lider: contatoSanitizado }]
            : [{ cel_lider: contato }])
        ]
      }
    });

    if (!celulas.length) {
      throw new Error('Celula nao encontrada');
    }

    return celulas;
  }

  async atualizar(id, dados = {}) {
    if (!id) {
      throw new Error('ID da celula e obrigatorio');
    }
    if (!dados || Object.keys(dados).length === 0) {
      throw new Error('Dados para atualizacao sao obrigatorios');
    }

    const celula = await Celula.findByPk(id);
    if (!celula) {
      throw new Error('Celula nao encontrada');
    }

    // Evita sobrescrever o ID
    const { id: _, createdAt, updatedAt, ...payload } = dados;

    if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
      payload.cel_lider = this._sanitizarCelular(payload.cel_lider);
    }

    return await celula.update(payload);
  }
}

module.exports = new CelulaPublicService();
