'use strict';
const RegistroCultoService = require('../services/registroCultoService');

class RegistroCultoController {
  async listar(req, res) {
    try {
      const { campusId, ministerioId, tipoEventoId, ministroId, dataInicio, dataFim, page = 1, limit = 15 } = req.query;
      const result = await RegistroCultoService.listar(
        { campusId, ministerioId, tipoEventoId, ministroId, dataInicio, dataFim },
        parseInt(page),
        parseInt(limit)
      );
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      const data = await RegistroCultoService.buscarPorId(req.params.id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async criar(req, res) {
    try {
      const dados = req.body;
      const userId = req.user?.userId || req.user?.id || null;
      const camposObrigatorios = ['data', 'horario', 'campusId', 'ministerioId', 'tituloMensagem'];
      const faltando = camposObrigatorios.filter((c) => dados[c] == null || dados[c] === '');
      // Exige ao menos um ministro ou quemMinistrou preenchido
      const semMinistro = (!dados.ministroIds || dados.ministroIds.length === 0) && !dados.quemMinistrou;
      if (semMinistro) faltando.push('ministroIds (ou quemMinistrou)');
      if (faltando.length > 0) {
        return res.status(400).json({ erro: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
      }
      const data = await RegistroCultoService.criar(dados, userId);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const data = await RegistroCultoService.atualizar(req.params.id, req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await RegistroCultoService.deletar(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async dashboard(req, res) {
    try {
      const { campusId, ministerioId, dataInicio, dataFim } = req.query;
      const data = await RegistroCultoService.dashboard({ campusId, ministerioId, dataInicio, dataFim });
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }
}

module.exports = new RegistroCultoController();

