const { Aposentado } = require('../models');
const { Op } = require('sequelize');  

class AposentadoService {
  async criarAposentado(dados) {
    return await Aposentado.create(dados);
  }

  async buscarTodosAposentados() {
    return await Aposentado.findAll();
  }

  async buscaPaginada(page, limit) {
    const offset = (page - 1) * limit;
  
    const { count, rows } = await Aposentado.findAndCountAll({
      limit,
      offset,
      order: [['nome', 'ASC']]
    });
  
    const totalPaginas = Math.ceil(count / limit);
  
    return {
      registros: rows,
      totalPaginas,
      paginaAtual: page,
      totalRegistros: count
    };
  }

  async buscaPorNomePaginada(nome, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
  
    const { count, rows } = await Aposentado.findAndCountAll({
      where: {
        nome: {
          [Op.iLike]: `%${nome}%`
        }
      },
      limit,
      offset,
      order: [['nome', 'ASC']]
    });
  
    const totalPaginas = Math.ceil(count / limit);
  
    return {
      registros: rows,
      totalPaginas,
      paginaAtual: page,
      totalRegistros: count
    };
  }
  

  async buscarAposentadoPorId(id) {
    const aposentado = await Aposentado.findByPk(id);
    if (!aposentado) {
      throw new Error('Aposentado não encontrado');
    }
    return aposentado;
  }

  async atualizarAposentado(id, dadosAtualizados) {
    const aposentado = await this.buscarAposentadoPorId(id);
    return await aposentado.update(dadosAtualizados);
  }

  async deletarAposentado(id) {
    const aposentado = await this.buscarAposentadoPorId(id);
    await aposentado.destroy();
    return { mensagem: 'Aposentado removido com sucesso' };
  }
}

module.exports = new AposentadoService();
