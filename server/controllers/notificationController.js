const notificationService = require('../services/notificationService');
const { EvolutionWebhookLog } = require('../models');
const evolutionApiService = require('../services/evolutionApiService');

class NotificationController {
  // ========== GRUPOS ==========

  async criarGrupo(req, res) {
    try {
      const grupo = await notificationService.criarGrupo(req.body);
      return res.status(201).json(grupo);
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarGrupos(req, res) {
    try {
      const { eventId } = req.params;
      const grupos = await notificationService.listarGrupos(eventId);
      return res.status(200).json(grupos);
    } catch (error) {
      console.error('Erro ao listar grupos:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async adicionarMembrosAoGrupo(req, res) {
    try {
      const { groupId } = req.params;
      const { registrationIds } = req.body;
      const userId = req.user.id;

      const resultado = await notificationService.adicionarMembrosAoGrupo(
        groupId,
        registrationIds,
        userId
      );
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao adicionar membros:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async removerMembroDoGrupo(req, res) {
    try {
      const { groupId, registrationId } = req.params;
      const resultado = await notificationService.removerMembroDoGrupo(groupId, registrationId);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async criarGrupoPorAgendamento(req, res) {
    try {
      const { scheduleId } = req.body;
      const userId = req.user.id;

      const grupo = await notificationService.criarGrupoPorAgendamento(scheduleId, userId);
      return res.status(201).json(grupo);
    } catch (error) {
      console.error('Erro ao criar grupo por agendamento:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  // ========== TEMPLATES ==========

  async criarTemplate(req, res) {
    try {
      const template = await notificationService.criarTemplate(req.body);
      return res.status(201).json(template);
    } catch (error) {
      console.error('Erro ao criar template:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTemplates(req, res) {
    try {
      const { eventId } = req.query;
      const templates = await notificationService.listarTemplates(eventId || null);
      return res.status(200).json(templates);
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async atualizarTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await notificationService.atualizarTemplate(id, req.body);
      return res.status(200).json(template);
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletarTemplate(req, res) {
    try {
      const { id } = req.params;
      const resultado = await notificationService.deletarTemplate(id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  // ========== NOTIFICAÇÕES ==========

  async enviarNotificacao(req, res) {
    try {
      const userId = req.user.id;
      const notification = await notificationService.enviarNotificacao(req.body, userId);
      return res.status(201).json(notification);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async enviarNotificacaoParaGrupo(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;
      const resultado = await notificationService.enviarNotificacaoParaGrupo(
        groupId,
        req.body,
        userId
      );
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao enviar notificação para grupo:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarNotificacoes(req, res) {
    try {
      const { eventId } = req.params;
      const filtros = {
        status: req.query.status,
        channel: req.query.channel,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim,
        limit: req.query.limit
      };

      const notificacoes = await notificationService.listarNotificacoes(eventId, filtros);
      return res.status(200).json(notificacoes);
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async obterEstatisticas(req, res) {
    try {
      const { eventId } = req.params;
      const stats = await notificationService.obterEstatisticas(eventId);
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async processarWebhook(req, res) {
    try {
      const { body } = req;
      const resultado = await notificationService.processarWebhook(body);

      const infos = evolutionApiService.processarWebhook(body);
      const logEntry = {
        event: body.event || null,
        instance: body.instance || null,
        messageId: infos[0]?.messageId || null,
        mappedStatus: infos[0]?.status || null,
        updatedRecords: resultado?.updated || [],
        rawPayload: body
      };
      EvolutionWebhookLog.create(logEntry).catch(() => {});

      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarWebhookLogs(req, res) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const { count, rows } = await EvolutionWebhookLog.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      return res.json({ total: count, logs: rows });
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }
}

module.exports = new NotificationController();
