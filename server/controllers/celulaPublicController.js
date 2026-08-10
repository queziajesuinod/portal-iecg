const CelulaPublicService = require('../services/celulaPublicService');

const formatarResposta = (celula) => {
  const payload = celula.toJSON ? celula.toJSON() : celula;
  if (payload.cel_lider) {
    payload.cel_lider = String(payload.cel_lider).replace(/\D/g, '');
  }
  return payload;
};

class CelulaPublicController {
  async buscarPorContato(req, res) {
    try {
      const { contato } = req.query;
      const celulas = await CelulaPublicService.buscarPorContato(contato);
      const resposta = celulas.map(formatarResposta);
      return res.status(200).json(resposta);
    } catch (error) {
      const status = error.message.includes('encontrada') || error.message.includes('nao encontrada') ? 404 : 400;
      return res.status(status).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const celula = await CelulaPublicService.atualizar(id, req.body);
      const payload = celula.toJSON ? celula.toJSON() : celula;
      if (payload.cel_lider) {
        payload.cel_lider = String(payload.cel_lider).replace(/\D/g, '');
      }
      return res.status(200).json(payload);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarHierarquiaOptions(req, res) {
    try {
      const options = await CelulaPublicService.listarHierarquiaOptions();
      return res.status(200).json(options);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async criar(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.celula && payload.json) {
        payload = payload.json;
      }
      // leaderId nao e coluna da celula: normaliza para liderId antes do dedup.
      if (payload.leaderId && !payload.liderId) {
        payload.liderId = payload.leaderId;
      }
      delete payload.leaderId;
      const existente = await CelulaPublicService.buscarPorCampos(payload);
      if (existente) {
        return res.status(200).json(formatarResposta(existente));
      }
      const novaCelula = await CelulaPublicService.criar(payload);
      return res.status(201).json(formatarResposta(novaCelula));
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaPublicController();
