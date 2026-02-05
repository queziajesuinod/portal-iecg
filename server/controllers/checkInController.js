const checkInService = require('../services/checkInService');

class CheckInController {
  // ========== AGENDAMENTOS ==========

  async criarAgendamento(req, res) {
    try {
      const agendamento = await checkInService.criarAgendamento(req.body);
      return res.status(201).json(agendamento);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarAgendamentos(req, res) {
    try {
      const { eventId } = req.params;
      const agendamentos = await checkInService.listarAgendamentos(eventId);
      return res.status(200).json(agendamentos);
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizarAgendamento(req, res) {
    try {
      const { id } = req.params;
      const agendamento = await checkInService.atualizarAgendamento(id, req.body);
      return res.status(200).json(agendamento);
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletarAgendamento(req, res) {
    try {
      const { id } = req.params;
      const resultado = await checkInService.deletarAgendamento(id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  // ========== ESTAÇÕES ==========

  async criarEstacao(req, res) {
    try {
      const estacao = await checkInService.criarEstacao(req.body);
      return res.status(201).json(estacao);
    } catch (error) {
      console.error('Erro ao criar estação:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarEstacoes(req, res) {
    try {
      const { eventId } = req.params;
      const estacoes = await checkInService.listarEstacoes(eventId);
      return res.status(200).json(estacoes);
    } catch (error) {
      console.error('Erro ao listar estações:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizarEstacao(req, res) {
    try {
      const { id } = req.params;
      const estacao = await checkInService.atualizarEstacao(id, req.body);
      return res.status(200).json(estacao);
    } catch (error) {
      console.error('Erro ao atualizar estação:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletarEstacao(req, res) {
    try {
      const { id } = req.params;
      const resultado = await checkInService.deletarEstacao(id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao deletar estação:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  // ========== CHECK-INS ==========

  async realizarCheckInManual(req, res) {
    try {
      const userId = req.user.id; // Obtido do middleware de autenticação
      const checkIn = await checkInService.realizarCheckInManual(req.body, userId);
      return res.status(201).json(checkIn);
    } catch (error) {
      console.error('Erro ao realizar check-in manual:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async realizarCheckInQRCode(req, res) {
    try {
      const checkIn = await checkInService.realizarCheckInQRCode(req.body);
      return res.status(201).json(checkIn);
    } catch (error) {
      console.error('Erro ao realizar check-in QR Code:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async realizarCheckInNFC(req, res) {
    try {
      const checkIn = await checkInService.realizarCheckInNFC(req.body);
      return res.status(201).json(checkIn);
    } catch (error) {
      console.error('Erro ao realizar check-in NFC:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarCheckIns(req, res) {
    try {
      const { eventId } = req.params;
      const filtros = {
        scheduleId: req.query.scheduleId,
        stationId: req.query.stationId,
        checkInMethod: req.query.checkInMethod,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim
      };

      const checkIns = await checkInService.listarCheckIns(eventId, filtros);
      return res.status(200).json(checkIns);
    } catch (error) {
      console.error('Erro ao listar check-ins:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async obterEstatisticas(req, res) {
    try {
      const { eventId } = req.params;
      const stats = await checkInService.obterEstatisticas(eventId);
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async validarCodigo(req, res) {
    try {
      const { orderCode } = req.params;
      const resultado = await checkInService.validarCodigo(orderCode);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao validar código:', error);
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CheckInController();
