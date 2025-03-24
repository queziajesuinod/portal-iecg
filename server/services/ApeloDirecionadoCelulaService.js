// Service: services/ApeloDirecionadoCelulaService.js
const { ApeloDirecionadoCelula } = require('../models');

class ApeloDirecionadoCelulaService {
  async criar(dados) {
    return await ApeloDirecionadoCelula.create(dados);
  }

  async listarTodos() {
    return await ApeloDirecionadoCelula.findAll();
  }

  async buscarPorId(id) {
    const item = await ApeloDirecionadoCelula.findByPk(id);
    if (!item) throw new Error('Registro não encontrado');
    return item;
  }

  async atualizar(id, dados) {
    const item = await this.buscarPorId(id);
    return await item.update(dados);
  }

  async deletar(id) {
    const item = await this.buscarPorId(id);
    await item.destroy();
    return { mensagem: 'Registro removido com sucesso' };
  }
}

module.exports = new ApeloDirecionadoCelulaService();


