const { Celula } = require('../models');
const { Op } = require('sequelize');
const webhookEmitter = require('./webhookEmitter');

const sanitizeCelular = (valor) => {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
};

const preparePayload = (dados = {}) => {
  const payload = { ...dados };
  if (Object.prototype.hasOwnProperty.call(payload, 'cel_lider')) {
    payload.cel_lider = sanitizeCelular(payload.cel_lider);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'celula') && payload.celula) {
    payload.celula = String(payload.celula).trim();
  }
  return payload;
};

const CelulaPublicService = {
  async buscarPorCampos(campos = {}) {
    const payload = preparePayload(campos);
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

    return Celula.findOne({ where });
  },

  async criar(dados = {}) {
    if (!dados.celula) {
      throw new Error('Nome da celula (celula) e obrigatorio');
    }
    const payload = preparePayload(dados);
    const created = await Celula.create(payload);
    webhookEmitter.emit('celula.created', {
      id: created.id,
      nome: created.celula,
      bairro: created.bairro,
      rede: created.rede,
      lider: created.lider
    });
    return created;
  },

  async buscarPorContato(contato) {
    if (!contato) {
      throw new Error('Parametro de contato (email ou cel_lider) e obrigatorio');
    }

    const contatoSanitizado = sanitizeCelular(contato);
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
  },

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

    const { id: _, createdAt, updatedAt, ...rest } = dados;
    const payload = preparePayload(rest);

    const updated = await celula.update(payload);
    webhookEmitter.emit('celula.updated', {
      id: updated.id,
      nome: updated.celula,
      bairro: updated.bairro,
      rede: updated.rede,
      lider: updated.lider
    });
    return updated;
  }
};

module.exports = CelulaPublicService;
