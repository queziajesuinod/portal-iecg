const { Celula } = require('../models');
const { Op } = require('sequelize');

class CelulaPublicService {
  async buscarPorContato(contato) {
    if (!contato) {
      throw new Error('Parametro de contato (email ou cel_lider) e obrigatorio');
    }

    const celula = await Celula.findOne({
      where: {
        [Op.or]: [
          { email_lider: contato },
          { cel_lider: contato }
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
    return await celula.update(payload);
  }
}

module.exports = new CelulaPublicService();
