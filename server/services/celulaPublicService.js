const { Celula } = require('../models');
const { Op } = require('sequelize');

class CelulaPublicService {
  _sanitizarCelular(valor) {
    if (!valor) return '';
    return String(valor).replace(/\D/g, '');
  }

  async buscarPorContato(contato) {
    if (!contato) {
      throw new Error('Parametro de contato (email ou cel_lider) e obrigatorio');
    }

    const contatoSanitizado = this._sanitizarCelular(contato);
    const isTelefone = contatoSanitizado.length >= 8;

    const celula = await Celula.findOne({
      where: {
        [Op.or]: [
          { email_lider: contato },
          ...(isTelefone
            ? [{ cel_lider: contatoSanitizado }]
            : [{ cel_lider: contato }])
        ]
      }
    });

    if (!celula) {
      throw new Error('Celula nao encontrada');
    }

    return celula;
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
