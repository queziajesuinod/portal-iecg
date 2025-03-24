const ApeloDirecionadoCelulaService = require('../services/ApeloDirecionadoCelulaService');

class ApeloDirecionadoCelulaController {
  async criar(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.criar(req.body);
      return res.status(201).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodos(req, res) {
    try {
      const lista = await ApeloDirecionadoCelulaService.listarTodos();
      return res.status(200).json(lista);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar registros' });
    }
  }

  async buscarPorId(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.buscarPorId(req.params.id);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.atualizar(req.params.id, req.body);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      const resposta = await ApeloDirecionadoCelulaService.deletar(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new ApeloDirecionadoCelulaController();