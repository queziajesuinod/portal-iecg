const AposentadoService = require('../services/aposentadoService');

class AposentadoController {
  async criar(req, res) {
    try {
      const aposentado = await AposentadoService.criarAposentado(req.body);
      return res.status(201).json(aposentado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodos(req, res) {
    try {
      const aposentados = await AposentadoService.buscarTodosAposentados();
      return res.status(200).json(aposentados);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar aposentados' });
    }
  }

  async buscarPorId(req, res) {
    try {
      const aposentado = await AposentadoService.buscarAposentadoPorId(req.params.id);
      return res.status(200).json(aposentado);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const aposentado = await AposentadoService.atualizarAposentado(req.params.id, req.body);
      return res.status(200).json(aposentado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      const resposta = await AposentadoService.deletarAposentado(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new AposentadoController();
