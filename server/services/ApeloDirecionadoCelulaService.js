// Service: services/ApeloDirecionadoCelulaService.js
const { ApeloDirecionadoCelula, ApeloDirecionadoHistorico, Celula, Sequelize } = require('../models');
const { Op } = require('sequelize');

class ApeloDirecionadoCelulaService {
  _normalizarCampos(dados = {}) {
    const payload = { ...dados };

    if (Object.prototype.hasOwnProperty.call(payload, 'dias_semana')) {
      const dias = payload.dias_semana;
      if (Array.isArray(dias)) {
        payload.dias_semana = dias.filter(Boolean);
      } else if (typeof dias === 'string') {
        payload.dias_semana = dias
          .split(',')
          .map((dia) => dia.trim())
          .filter(Boolean);
      } else {
        payload.dias_semana = dias || null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'observacao')) {
      payload.observacao = payload.observacao || null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'direcionar_celula')) {
      payload.direcionado_celula = payload.direcionar_celula;
      delete payload.direcionar_celula;
    }

    return payload;
  }

  async criar(dados) {
    const dadosNormalizados = this._normalizarCampos(dados);
    const direcionarCelulaEmBranco = dadosNormalizados.direcionado_celula === null || dadosNormalizados.direcionado_celula === undefined;
    const decisao = dadosNormalizados.decisao;
    if (direcionarCelulaEmBranco && decisao !== 'encaminhamento_celula' && !dadosNormalizados.status) {
      dadosNormalizados.status = 'NAO_HAVERAR_DIRECIONAMENTO';
    }
    return await ApeloDirecionadoCelula.create(dadosNormalizados);
  }

  async listarTodos(filtro = {}) {
    const where = {};
    if (filtro.month) {
      const [year, month] = filtro.month.split('-').map((v) => parseInt(v, 10));
      if (year && month) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        where.data_direcionamento = { [Op.gte]: start, [Op.lt]: end };
      }
    }
    if (filtro.year) {
      const ano = parseInt(filtro.year, 10);
      if (!Number.isNaN(ano)) {
        const condition = Sequelize.where(
          Sequelize.fn('date_part', 'year', Sequelize.col('data_direcionamento')),
          ano
        );
        where[Op.and] = (where[Op.and] || []).concat(condition);
      }
    }
    if (filtro.status) {
      where.status = filtro.status;
    }
    if (filtro.nome) {
      where.nome = { [Op.iLike]: `%${filtro.nome}%` };
    }
    if (filtro.decisao) {
      where.decisao = filtro.decisao;
    }

    const page = parseInt(filtro.page, 10) || 1;
    const limit = parseInt(filtro.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { rows, count } = await ApeloDirecionadoCelula.findAndCountAll({
      where,
      order: [['data_direcionamento', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Celula,
          as: 'celulaAtual',
          attributes: [
            'id',
            'celula',
            'rede',
            'lider',
            'cel_lider',
            'dia',
            'horario',
            'bairro',
            'campus'
          ]
        }
      ]
    });

    const totalPaginas = Math.ceil(count / limit) || 1;

    return {
      registros: rows,
      totalRegistros: count,
      totalPaginas,
      paginaAtual: page
    };
  }

  async buscarPorId(id) {
    const item = await ApeloDirecionadoCelula.findByPk(id);
    if (!item) throw new Error('Registro não encontrado');
    return item;
  }

  async atualizar(id, dados = {}) {
    const item = await this.buscarPorId(id);
    const { motivo_status, ...dadosAtualizar } = this._normalizarCampos(dados);
    const statusEnviado = Object.prototype.hasOwnProperty.call(dadosAtualizar, 'status');
    const statusAnterior = item.status;
    const statusNovo = dadosAtualizar.status;

    const atualizado = await item.update(dadosAtualizar);

    if (statusEnviado && statusNovo !== statusAnterior) {
      await ApeloDirecionadoHistorico.create({
        apelo_id: item.id,
        status_anterior: statusAnterior || null,
        status_novo: statusNovo || null,
        data_movimento: new Date(),
        tipo_evento: 'STATUS',
        motivo: motivo_status || null
      });
    }

    return atualizado;
  }

  async deletar(id) {
    const item = await this.buscarPorId(id);
    await item.destroy();
    return { mensagem: 'Registro removido com sucesso' };
  }

  async listarPorCelula(celulaId) {
    if (!celulaId) {
      return [];
    }
    return await ApeloDirecionadoCelula.findAll({
      where: { celula_id: celulaId },
      order: [['createdAt', 'DESC']]
    });
  }

  async resumoPorCelula() {
    const registros = await ApeloDirecionadoCelula.findAll({
      attributes: [
        'celula_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      group: ['celula_id']
    });
    return registros.map((row) => ({
      celula_id: row.get('celula_id'),
      total: parseInt(row.get('total'), 10) || 0
    }));
  }

  async moverApelo(apeloId, celulaDestinoId, motivo = '') {
    const apelo = await this.buscarPorId(apeloId);
    const celulaDestino = await Celula.findByPk(celulaDestinoId);

    if (!celulaDestino) {
      throw new Error('Celula de destino nao encontrada.');
    }

    const origem = apelo.celula_id;
    if (origem && celulaDestinoId && String(origem) === String(celulaDestinoId)) {
      throw new Error('Não é possível direcionar para a mesma célula.');
    }
    const novoStatus = 'MOVIMENTACAO_CELULA';
    const statusAnterior = apelo.status;
    apelo.status = novoStatus;
    apelo.celula_id = celulaDestinoId || null;
    apelo.lider_direcionado = celulaDestino.lider || null;
    apelo.cel_lider = celulaDestino.cel_lider || null;
    apelo.bairro_direcionado = celulaDestino.bairro || null;
    apelo.campus_iecg = celulaDestino.campus || null;
    apelo.direcionado_celula = true;
    apelo.data_direcionamento = new Date();
    await apelo.save();

    if (statusAnterior !== novoStatus) {
      await ApeloDirecionadoHistorico.create({
        apelo_id: apelo.id,
        status_anterior: statusAnterior || null,
        status_novo: novoStatus,
        data_movimento: new Date(),
        tipo_evento: 'STATUS',
        motivo: motivo || null
      });
    }

    await ApeloDirecionadoHistorico.create({
      apelo_id: apelo.id,
      celula_id_origem: origem,
      celula_id_destino: celulaDestinoId || null,
      motivo: motivo || null,
      data_movimento: new Date(),
      tipo_evento: 'CELULA'
    });

    return apelo;
  }

  async historico(apeloId) {
    return await ApeloDirecionadoHistorico.findAll({
      where: { apelo_id: apeloId },
      order: [['data_movimento', 'DESC']],
      include: [
        { model: Celula, as: 'celulaOrigem', attributes: ['id', 'celula'] },
        { model: Celula, as: 'celulaDestino', attributes: ['id', 'celula'] }
      ]
    });
  }
}

module.exports = new ApeloDirecionadoCelulaService();

