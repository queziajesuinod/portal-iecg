const MiaAttendanceService = require('../services/miaAttendanceService');

class MiaAttendanceController {
  async criar(req, res) {
    try {
      const lista = await MiaAttendanceService.criarLista(req.body);
      return res.status(201).json(lista);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listar(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const resultado = await MiaAttendanceService.listarListas(
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao listar listas de presen��a', detalhe: error.message });
    }
  }

  async detalhar(req, res) {
    try {
      const dados = await MiaAttendanceService.obterListaDetalhes(req.params.id);
      return res.status(200).json(dados);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async salvarPresencas(req, res) {
    try {
      const dados = await MiaAttendanceService.salvarPresencas(req.params.id, req.body.presencas);
      return res.status(200).json(dados);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await MiaAttendanceService.deletarLista(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new MiaAttendanceController();
