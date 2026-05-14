const moment = require('moment-timezone');
const ValidacaoMinisterioService = require('../services/validacaoMinisterioService');
const { APP_TIMEZONE } = require('../utils/dateTime');

class ValidacaoMinisterioController {
  async verificar(req, res) {
    try {
      const { campusId, ministerioId } = req.query;
      const agora = moment.tz(APP_TIMEZONE);
      const mes = parseInt(req.query.mes, 10) || agora.month() + 1;
      const ano = parseInt(req.query.ano, 10) || agora.year();

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
      const agoraNotificar = moment.tz(APP_TIMEZONE);
      const mes = parseInt(req.body.mes, 10) || agoraNotificar.month() + 1;
      const ano = parseInt(req.body.ano, 10) || agoraNotificar.year();

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
      const agoraTodos = moment.tz(APP_TIMEZONE);
      const mes = parseInt(req.body.mes, 10) || agoraTodos.month() + 1;
      const ano = parseInt(req.body.ano, 10) || agoraTodos.year();

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
