const PublicVoluntariadoService = require('../services/publicVoluntariadoService');

class PublicVoluntariadoController {
  async listarAreas(req, res) {
    try {
      const areas = await PublicVoluntariadoService.listarAreas();
      return res.status(200).json(areas);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async listarCampus(req, res) {
    try {
      const data = await PublicVoluntariadoService.listarCampus();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async listarMinisteriosPorCampus(req, res) {
    try {
      const data = await PublicVoluntariadoService.listarMinisteriosPorCampus(req.params.campusId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async buscarMembro(req, res) {
    try {
      const resultado = await PublicVoluntariadoService.buscarMembro({
        email: req.query.email,
        cpf: req.query.cpf
      });
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async salvarPessoa(req, res) {
    try {
      const resultado = await PublicVoluntariadoService.salvarPessoa(req.body);
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async adicionarVinculo(req, res) {
    try {
      const resultado = await PublicVoluntariadoService.adicionarVinculo(req.body);
      return res.status(201).json(resultado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async cadastrarVoluntario(req, res) {
    try {
      const resultado = await PublicVoluntariadoService.cadastrarVoluntario(req.body);
      return res.status(201).json(resultado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new PublicVoluntariadoController();
