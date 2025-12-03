const ApeloDirecionadoCelulaService = require('../services/ApeloDirecionadoCelulaService');
const WebhookService = require('../services/WebhookService');

class ApeloDirecionadoCelulaController {
  async criar(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.criar(req.body);
      // Dispara webhook de criação (não bloqueia a resposta)
      WebhookService.sendEvent('apelo.created', item).catch(() => {});
      return res.status(201).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodos(req, res) {
    try {
      const { month, status, page, limit, nome, decisao } = req.query;
      const lista = await ApeloDirecionadoCelulaService.listarTodos({ month, status, page, limit, nome, decisao });
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

  async listarPorCelula(req, res) {
    try {
      const { celulaId } = req.params;
      const registros = await ApeloDirecionadoCelulaService.listarPorCelula(celulaId);
      return res.status(200).json(registros);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async resumoPorCelula(req, res) {
    try {
      const resumo = await ApeloDirecionadoCelulaService.resumoPorCelula();
      return res.status(200).json(resumo);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async mover(req, res) {
    try {
      const { id } = req.params;
      const { celulaDestinoId, motivo } = req.body;
      if (!celulaDestinoId) {
        return res.status(400).json({ erro: 'celulaDestinoId é obrigatório' });
      }
      const item = await ApeloDirecionadoCelulaService.moverApelo(id, celulaDestinoId, motivo);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async historico(req, res) {
    try {
      const { id } = req.params;
      const historico = await ApeloDirecionadoCelulaService.historico(id);
      return res.status(200).json(historico);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new ApeloDirecionadoCelulaController();
