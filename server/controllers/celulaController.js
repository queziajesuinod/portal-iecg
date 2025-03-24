const CelulaService = require('../services/celulaService');

class CelulaController {
  async criar(req, res) {
    try {
      const celula = await CelulaService.criarCelula(req.body);
      return res.status(201).json(celula);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const celulas = await CelulaService.buscarTodasCelulas();
      return res.status(200).json(celulas);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar células' });
    }
  }


  async listarPaginado(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const resultado = await CelulaService.buscaPaginada(page, limit);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar células:', error);
      return res.status(500).json({ erro: 'Erro ao buscar células' });
    }
  }

  async buscarPorId(req, res) {
    try {
      const celula = await CelulaService.buscarCelulaPorId(req.params.id);
      return res.status(200).json(celula);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const celula = await CelulaService.atualizarCelula(req.params.id, req.body);
      return res.status(200).json(celula);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      const resposta = await CelulaService.deletarCelula(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaController();
