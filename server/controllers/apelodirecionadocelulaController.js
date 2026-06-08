const STATUS_LABELS = {
  APELO_CADASTRADO: 'Novo',
  NAO_HAVERAR_DIRECIONAMENTO: 'Não direcionar para uma célula',
  DIRECIONADO_COM_SUCESSO: 'Direcionado',
  PRIMEIRO_CONTATO: 'Primeiro Contato',
  ENVIO_LIDER_PENDENTE_WHATS_ERRADO: 'Pendência de Envio para Líder',
  CONSOLIDADO_CELULA: 'Consolidado na célula',
  DIRECIONAMENTO_INCORRETO_REENVIO_PENDENTE: 'Direcionamento incorreto',
  ENVIO_LIDER_PENDENTE: 'Líder ainda não fez contato',
  CONTATO_LIDER_SEM_RETORNO: 'Líder enviou mensagem, sem retorno',
  CONSOLIDACAO_INTERROMPIDA: 'Não Consolidado',
  MOVIMENTACAO_CELULA: 'Em movimentação de célula',
  EM_CONSOLIDACAO: 'Em Consolidação'
};

const ApeloDirecionadoCelulaService = require('../services/ApeloDirecionadoCelulaService');
const WebhookService = require('../services/WebhookService');
const ApeloFilaService = require('../services/ApeloFilaService');
const evolutionApiService = require('../services/evolutionApiService');
const NotificationTemplateService = require('../services/notificationTemplateService');
const { ApeloDirecionadoCelula, Celula, NotificationTemplate } = require('../models');

class ApeloDirecionadoCelulaController {
  async criar(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.criar(req.body);
      // Dispara webhook de criação (não bloqueia a resposta)
      WebhookService.sendEvent('apelo.created', item).catch(() => {});
      return res.status(201).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodos(req, res) {
    try {
      const {
        month, status, page, limit, nome, decisao, year
      } = req.query;
      const lista = await ApeloDirecionadoCelulaService.listarTodos({
        month, status, page, limit, nome, decisao, year
      });
      return res.status(200).json(lista);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar registros' });
    }
  }

  async buscarPorId(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.buscarPorId(req.params.id);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const item = await ApeloDirecionadoCelulaService.atualizar(req.params.id, req.body);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      const resposta = await ApeloDirecionadoCelulaService.deletar(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarPorCelula(req, res) {
    try {
      const { celulaId } = req.params;
      const registros = await ApeloDirecionadoCelulaService.listarPorCelula(celulaId);
      return res.status(200).json(registros);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async resumoPorCelula(req, res) {
    try {
      const resumo = await ApeloDirecionadoCelulaService.resumoPorCelula();
      return res.status(200).json(resumo);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async mover(req, res) {
    try {
      const { id } = req.params;
      const { celulaDestinoId, motivo } = req.body;
      if (!celulaDestinoId) {
        return res.status(400).json({ erro: 'celulaDestinoId é obrigatório' });
      }
      const item = await ApeloDirecionadoCelulaService.moverApelo(id, celulaDestinoId, motivo);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async historico(req, res) {
    try {
      const { id } = req.params;
      const historico = await ApeloDirecionadoCelulaService.historico(id);
      return res.status(200).json(historico);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async processarFila(req, res) {
    try {
      const resultado = await ApeloFilaService.processarFila();
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  // ==================== NOVOS ENDPOINTS DE MONITORAMENTO ====================

  /**
   * GET /apelos-direcionados/fila/health
   * Retorna o status de saúde do sistema de geocoding
   */
  async healthCheck(req, res) {
    try {
      const status = ApeloFilaService.getHealthStatus();

      // Determinar HTTP status code baseado no estado
      let httpStatus = 200;

      // Se circuit breaker está aberto, retornar 503 (Service Unavailable)
      if (status.circuitBreaker.state === 'OPEN') {
        httpStatus = 503;
      }

      // Se quota diária foi excedida, retornar 429 (Too Many Requests)
      if (status.rateLimiter.quotaExceeded > 0 && status.rateLimiter.remainingToday === 0) {
        httpStatus = 429;
      }

      return res.status(httpStatus).json({
        status: httpStatus === 200 ? 'healthy' : 'degraded',
        ...status
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        erro: error.message
      });
    }
  }

  /**
   * POST /apelos-direcionados/fila/reset-monitoring
   * Reseta todos os contadores de monitoramento (apenas admin)
   */
  async resetMonitoring(req, res) {
    try {
      // TODO: Adicionar verificação de permissão de admin aqui
      // Exemplo:
      // if (!req.user || req.user.role !== 'admin') {
      //   return res.status(403).json({ erro: 'Acesso negado' });
      // }

      const resultado = ApeloFilaService.resetMonitoring();
      return res.status(200).json(resultado);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  /**
   * GET /apelos-direcionados/fila/stats
   * Retorna estatísticas detalhadas (alias para healthCheck com nome mais intuitivo)
   */
  async getStats(req, res) {
    return this.healthCheck(req, res);
  }

  async listarPendentesDirecionamento(req, res) {
    try {
      const { id, nome, whatsapp } = req.query;
      const lista = await ApeloDirecionadoCelulaService.listarPendentesDirecionamento({ id, nome, whatsapp });
      return res.status(200).json(lista);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar registros' });
    }
  }

  async atualizarStatusPublico(req, res) {
    try {
      const { id } = req.params;
      const { status, motivo } = req.body;
      if (!status) {
        return res.status(400).json({ erro: 'status é obrigatório' });
      }
      const item = await ApeloDirecionadoCelulaService.atualizarStatusPublico(id, { status, motivo });
      return res.status(200).json(item);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTemplatesWhatsapp(req, res) {
    try {
      const { Op } = require('sequelize');
      const templates = await NotificationTemplate.findAll({
        where: {
          channel: 'whatsapp',
          context: { [Op.in]: ['direcionamentos', null] }
        },
        attributes: ['id', 'name', 'body', 'variables', 'context'],
        order: [['name', 'ASC']]
      });
      return res.status(200).json(templates);
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  async notificarLider(req, res) {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      const { ApeloDirecionadoHistorico } = require('../models');
      const apelo = await ApeloDirecionadoCelula.findByPk(id, {
        include: [{ model: Celula, as: 'celulaAtual', attributes: ['id', 'celula', 'lider', 'cel_lider'] }]
      });
      if (!apelo) return res.status(404).json({ erro: 'Apelo não encontrado' });

      const telefoneLider = apelo.celulaAtual?.cel_lider;
      if (!telefoneLider) return res.status(400).json({ erro: 'Telefone do líder não cadastrado na célula' });

      const ultimoHistorico = await ApeloDirecionadoHistorico.findOne({
        where: { apelo_id: id },
        order: [['data_movimento', 'DESC']],
        attributes: ['motivo']
      });

      const whatsappApelo = String(apelo.whatsapp || '').replace(/\D/g, '');
      const nomeLider = apelo.celulaAtual?.lider || 'Líder';
      const nomeApelo = apelo.nome || 'Desconhecido';
      const statusApelo = STATUS_LABELS[apelo.status] || apelo.status || 'pendente';
      const motivoApelo = ultimoHistorico?.motivo || '';
      const linkStatus = whatsappApelo
        ? `https://start.iecg.com.br/direcionamentos/pendentes?whatsapp=${whatsappApelo}`
        : 'https://start.iecg.com.br/direcionamentos/pendentes';

      let mensagem;
      if (templateId) {
        const template = await NotificationTemplateService.buscarPorId(templateId);
        mensagem = NotificationTemplateService.resolveMessage(template.body, {
          nome_apelo: nomeApelo,
          nome_lider: nomeLider,
          link_status: linkStatus,
          status: statusApelo,
          motivo: motivoApelo
        });
      } else {
        mensagem = `Atualize o feedback do(a) ${nomeApelo} e o link é ${linkStatus}`;
      }

      const resultado = await evolutionApiService.enviarMensagemTexto(telefoneLider, mensagem, 'START_IECG');
      if (!resultado.sucesso) {
        return res.status(500).json({ erro: resultado.erro || 'Falha ao enviar mensagem' });
      }
      return res.status(200).json({ mensagem: 'Mensagem enviada com sucesso' });
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }
}

module.exports = new ApeloDirecionadoCelulaController();
