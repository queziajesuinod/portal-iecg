const MinistroService = require('../services/ministroService');

class MinistroController {
  async listar(req, res) {
    try {
      const apenasAtivos = req.query.ativo === 'true';
      const { campusId, ministerioId } = req.query;
      const data = await MinistroService.listar(apenasAtivos, campusId || null, ministerioId || null);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const data = await MinistroService.buscarPorId(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async criar(req, res) {
    try {
      if (!req.body?.nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
      const data = await MinistroService.criar(req.body);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const data = await MinistroService.atualizar(req.params.id, req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async alternarAtivo(req, res) {
    try {
      const data = await MinistroService.alternarAtivo(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarVinculos(req, res) {
    try {
      const data = await MinistroService.listarVinculos(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async salvarVinculos(req, res) {
    try {
      const data = await MinistroService.salvarVinculos(req.params.id, req.body.vinculos);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarDuplicatas(req, res) {
    try {
      const data = await MinistroService.listarDuplicatas();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async fundir(req, res) {
    try {
      const data = await MinistroService.fundir(req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new MinistroController();
