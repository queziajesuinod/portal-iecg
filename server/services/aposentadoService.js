const { Aposentado } = require('../models');

class AposentadoService {
  async criarAposentado(dados) {
    return await Aposentado.create(dados);
  }

  async buscarTodosAposentados() {
    return await Aposentado.findAll();
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
