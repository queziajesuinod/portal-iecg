'use strict';
const VoluntariadoService = require('../services/voluntariadoService');

class VoluntariadoController {
  async listar(req, res) {
    try {
      const filtros = {};
      if (req.query.memberId) filtros.memberId = req.query.memberId;
      if (req.query.areaVoluntariadoId) filtros.areaVoluntariadoId = req.query.areaVoluntariadoId;
      if (req.query.campusId) filtros.campusId = req.query.campusId;
      if (req.query.ministerioId) filtros.ministerioId = req.query.ministerioId;
      if (req.query.status) filtros.status = req.query.status;
      const data = await VoluntariadoService.listar(filtros);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const data = await VoluntariadoService.buscarPorId(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async criar(req, res) {
    try {
      const { memberId, areaVoluntariadoId, dataInicio } = req.body;
      if (!memberId || !areaVoluntariadoId || !dataInicio) {
        return res.status(400).json({ erro: 'memberId, areaVoluntariadoId e dataInicio são obrigatórios' });
      }
      const data = await VoluntariadoService.criar({
        ...req.body,
        createdBy: req.user?.id || null
      });
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const data = await VoluntariadoService.atualizar(req.params.id, req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async aprovar(req, res) {
    try {
      const data = await VoluntariadoService.aprovar(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async encerrar(req, res) {
    try {
      const { dataFim } = req.body;
      const data = await VoluntariadoService.encerrar(req.params.id, dataFim);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async remover(req, res) {
    try {
      await VoluntariadoService.remover(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new VoluntariadoController();
