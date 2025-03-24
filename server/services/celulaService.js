const { Celula } = require('../models');

class CelulaService {
  async criarCelula(dados) {
    return await Celula.create(dados);
  }

  async buscarTodasCelulas() {
    return await Celula.findAll();
  }

  async buscaPaginada(page, limit) {
    const offset = (page - 1) * limit;
  
    const { count, rows } = await Celula.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  
    const totalPaginas = Math.ceil(count / limit);
  
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
    return await celula.update(dadosAtualizados);
  }

  async deletarCelula(id) {
    const celula = await this.buscarCelulaPorId(id);
    await celula.destroy();
    return { mensagem: 'Célula removida com sucesso' };
  }
}

module.exports = new CelulaService();
