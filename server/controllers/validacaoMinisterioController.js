const ValidacaoMinisterioService = require('../services/validacaoMinisterioService');

class ValidacaoMinisterioController {
  async verificar(req, res) {
    try {
      const { campusId, ministerioId } = req.query;
      const mes = parseInt(req.query.mes, 10) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano, 10) || new Date().getFullYear();

      if (!campusId) {
        return res.status(400).json({ erro: 'campusId é obrigatório' });
      }

      let resultado;
      if (ministerioId) {
        resultado = await ValidacaoMinisterioService.verificarPorCampusMinisterio(
          campusId, ministerioId, mes, ano
        );
        resultado = [resultado];
      } else {
        resultado = await ValidacaoMinisterioService.verificarTodosPorCampus(campusId, mes, ano);
      }

      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async notificar(req, res) {
    try {
      const { campusId, ministerioId } = req.body;
      const mes = parseInt(req.body.mes, 10) || new Date().getMonth() + 1;
      const ano = parseInt(req.body.ano, 10) || new Date().getFullYear();

      if (!campusId || !ministerioId) {
        return res.status(400).json({ erro: 'campusId e ministerioId são obrigatórios' });
      }

      const resultado = await ValidacaoMinisterioService.enviarNotificacao(
        campusId, ministerioId, mes, ano
      );
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async notificarTodos(req, res) {
    try {
      const mes = parseInt(req.body.mes, 10) || new Date().getMonth() + 1;
      const ano = parseInt(req.body.ano, 10) || new Date().getFullYear();

      const resultados = await ValidacaoMinisterioService.enviarNotificacoesAutomaticas(mes, ano);
      return res.status(200).json(resultados);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async justificar(req, res) {
    try {
      const {
        campusId, ministerioId, data, motivo
      } = req.body;
      if (!campusId || !ministerioId || !data) {
        return res.status(400).json({ erro: 'campusId, ministerioId e data são obrigatórios' });
      }
      const registro = await ValidacaoMinisterioService.justificarAusencia(
        campusId, ministerioId, data, motivo, req.user?.id
      );
      return res.status(200).json(registro);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async removerJustificativa(req, res) {
    try {
      const { campusId, ministerioId, data } = req.body;
      if (!campusId || !ministerioId || !data) {
        return res.status(400).json({ erro: 'campusId, ministerioId e data são obrigatórios' });
      }
      await ValidacaoMinisterioService.removerJustificativa(campusId, ministerioId, data);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new ValidacaoMinisterioController();
