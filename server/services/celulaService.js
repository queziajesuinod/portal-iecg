const { Celula, Campus } = require('../models');
const { Op } = require('sequelize'); 

class CelulaService {
  _sanitizarCelular(valor) {
    if (!valor) return valor;
    return String(valor).replace(/\D/g, '');
  }

  async criarCelula(dados) {
    console.log('Dados recebidos para criação:', dados);

    if (dados.campus && !dados.campusId) {
      const campus = await Campus.findOne({
        where: {
          nome: {
            [Op.iLike]: `%${dados.campus}%`
          }
        }
      });
      if (campus) {
        dados.campusId = campus.id;
      }
    }
    if (typeof dados.ativo === 'undefined') {
      dados.ativo = true;
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'cel_lider')) {
      dados.cel_lider = this._sanitizarCelular(dados.cel_lider);
    }

    const celula = await Celula.create(dados);
    console.log('Célula criada no banco de dados:', celula);

    return celula;
  }

  async buscarTodasCelulas() {
    return await Celula.findAll();
  }

  async buscaPaginada(page, limit) {
    return this.buscaComFiltros({}, page, limit);
  }

  async buscaComFiltros(filtros = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filtros.celula) {
      where.celula = { [Op.iLike]: `%${filtros.celula}%` };
    }
    if (filtros.campusId) {
      where.campusId = filtros.campusId;
    } else if (filtros.campus) {
      where.campus = { [Op.iLike]: `%${filtros.campus}%` };
    }
    if (filtros.rede) {
      const redeValues = Array.isArray(filtros.rede) ? filtros.rede : [filtros.rede];
      const redeConditions = redeValues
        .map((redeValue) => redeValue && redeValue.trim())
        .filter(Boolean)
        .map((redeValue) => ({ [Op.iLike]: `%${redeValue}%` }));
      if (redeConditions.length) {
        where.rede = { [Op.or]: redeConditions };
      }
    }
    if (filtros.horario) {
      where.horario = { [Op.iLike]: `%${filtros.horario}%` };
    }
    if (filtros.bairro) {
      where.bairro = { [Op.iLike]: `%${filtros.bairro}%` };
    }
    {
      const ativoValorRaw = filtros.ativo;
      const ativoValor = typeof ativoValorRaw !== 'undefined' && ativoValorRaw !== null
        ? String(ativoValorRaw).toLowerCase().trim()
        : '';
      if (!ativoValor) {
        where.ativo = true;
      } else if (ativoValor !== 'all') {
        where.ativo = !(ativoValor === 'false' || ativoValor === '0' || ativoValor === 'no' || ativoValor === 'off');
      }
    }

    const { count, rows } = await Celula.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Campus,
          as: 'campusRef',
          attributes: ['id', 'nome']
        }
      ]
    });

    const totalPaginas = Math.ceil(count / limit) || 1;

    return {
      registros: rows,
      totalPaginas,
      paginaAtual: page,
      totalRegistros: count
    };
  }
  
  async buscarCelulaPorId(id) {
    const celula = await Celula.findByPk(id);
    if (!celula) {
      throw new Error('Célula não encontrada');
    }
    return celula;
  }

  async atualizarCelula(id, dadosAtualizados) {
    const celula = await this.buscarCelulaPorId(id);
    if (dadosAtualizados.campus && !dadosAtualizados.campusId) {
      const campus = await Campus.findOne({
        where: {
          nome: {
            [Op.iLike]: `%${dadosAtualizados.campus}%`
          }
        }
      });
      if (campus) {
        dadosAtualizados.campusId = campus.id;
      }
    }
    if (Object.prototype.hasOwnProperty.call(dadosAtualizados, 'cel_lider')) {
      dadosAtualizados.cel_lider = this._sanitizarCelular(dadosAtualizados.cel_lider);
    }

    return await celula.update(dadosAtualizados);
  }

  async deletarCelula(id) {
    const celula = await this.buscarCelulaPorId(id);
    await celula.destroy();
    return { mensagem: 'Célula removida com sucesso' };
  }
}

module.exports = new CelulaService();
