'use strict';
const AreaVoluntariadoService = require('../services/areaVoluntariadoService');

class AreaVoluntariadoController {
  async listar(req, res) {
    try {
      const apenasAtivos = req.query.ativo === 'true';
      const data = await AreaVoluntariadoService.listar(apenasAtivos);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const data = await AreaVoluntariadoService.buscarPorId(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async criar(req, res) {
    try {
      if (!req.body?.nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
      const data = await AreaVoluntariadoService.criar(req.body);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const data = await AreaVoluntariadoService.atualizar(req.params.id, req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async alternarAtivo(req, res) {
    try {
      const data = await AreaVoluntariadoService.alternarAtivo(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new AreaVoluntariadoController();
