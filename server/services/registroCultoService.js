'use strict';
const { Op } = require('sequelize');
const { RegistroCulto, Campus, Ministerio, TipoEvento, Ministro, User } = require('../models');

const includeBase = [
  { model: Campus, as: 'campus', attributes: ['id', 'nome', 'transmiteOnline'] },
  { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome', 'exibeCriancas', 'exibeBebes', 'apeloDefault'] },
  { model: TipoEvento, as: 'tipoEvento', attributes: ['id', 'nome'] },
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
];

const buildInclude = (ministroId) => {
  const ministroInclude = ministroId
    ? { model: Ministro, as: 'ministros', where: { id: ministroId }, required: true, through: { attributes: [] }, attributes: ['id', 'nome'] }
    : { model: Ministro, as: 'ministros', attributes: ['id', 'nome'], through: { attributes: [] } };
  return [...includeBase, ministroInclude];
};

const normalizarTextoSerie = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const RegistroCultoService = {
  async listar(filtros = {}, page = 1, limit = 15) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filtros.campusId) where.campusId = filtros.campusId;
    if (filtros.ministerioId) where.ministerioId = filtros.ministerioId;
    if (filtros.tipoEventoId) where.tipoEventoId = filtros.tipoEventoId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.data = {};
      if (filtros.dataInicio) where.data[Op.gte] = filtros.dataInicio;
      if (filtros.dataFim) where.data[Op.lte] = filtros.dataFim;
    }

    const include = buildInclude(filtros.ministroId || null);

    const { rows, count } = await RegistroCulto.findAndCountAll({
      where,
      include,
      offset,
      limit,
      order: [['data', 'DESC'], ['horario', 'DESC']],
      distinct: true,
    });

    return { data: rows, total: count, pages: Math.ceil(count / limit) };
  },

  async buscarPorId(id) {
    const registro = await RegistroCulto.findByPk(id, { include: buildInclude(null) });
    if (!registro) throw new Error('Registro não encontrado');
    return registro;
  },

  async criar(dados, userId = null) {
    const { ministroIds, userId: ignoredUserId, ...camposRegistro } = dados;

    if (ignoredUserId) {
      // Ignora userId enviado pelo cliente e usa somente o token autenticado.
      delete camposRegistro.userId;
    }
    camposRegistro.userId = userId || null;

    // Deriva quemMinistrou dos ministros selecionados
    if (ministroIds && ministroIds.length > 0) {
      const ministros = await Ministro.findAll({ where: { id: ministroIds } });
      camposRegistro.quemMinistrou = ministros.map((m) => m.nome).join(', ');
    }

    const registro = await RegistroCulto.create(camposRegistro);

    if (ministroIds && ministroIds.length > 0) {
      await registro.setMinistros(ministroIds);
    }

    return registro.reload({ include: buildInclude(null) });
  },

  async atualizar(id, dados) {
    const { ministroIds, userId: ignoredUserId, ...camposRegistro } = dados;

    if (ignoredUserId) {
      delete camposRegistro.userId;
    }

    const registro = await RegistroCulto.findByPk(id);
    if (!registro) throw new Error('Registro não encontrado');

    if (ministroIds !== undefined) {
      if (ministroIds.length > 0) {
        const ministros = await Ministro.findAll({ where: { id: ministroIds } });
        camposRegistro.quemMinistrou = ministros.map((m) => m.nome).join(', ');
      } else {
        camposRegistro.quemMinistrou = null;
      }
      await registro.setMinistros(ministroIds);
    }

    Object.assign(registro, camposRegistro);
    await registro.save();
    return registro.reload({ include: buildInclude(null) });
  },

  async deletar(id) {
    const registro = await RegistroCulto.findByPk(id);
    if (!registro) throw new Error('Registro não encontrado');
    await registro.destroy();
  },

  async dashboard(filtros = {}) {
    const where = {};

    if (Array.isArray(filtros.campusIds) && filtros.campusIds.length > 0) {
      where.campusId = { [Op.in]: filtros.campusIds };
    } else if (filtros.campusId) {
      where.campusId = filtros.campusId;
    }
    if (Array.isArray(filtros.ministerioIds) && filtros.ministerioIds.length > 0) {
      where.ministerioId = { [Op.in]: filtros.ministerioIds };
    } else if (filtros.ministerioId) {
      where.ministerioId = filtros.ministerioId;
    }
    if (filtros.tipoEventoId) where.tipoEventoId = filtros.tipoEventoId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.data = {};
      if (filtros.dataInicio) where.data[Op.gte] = filtros.dataInicio;
      if (filtros.dataFim) where.data[Op.lte] = filtros.dataFim;
    }

    const registros = await RegistroCulto.findAll({
      where,
      include: includeBase,
      order: [['data', 'ASC'], ['horario', 'ASC']],
    });

    const weekDayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const calcularMedia = (nums) => (nums.length ? nums.reduce((acc, item) => acc + item, 0) / nums.length : 0);
    const calcularDesvioPadrao = (nums, media) => {
      if (!nums.length) return 0;
      const variancia = nums.reduce((acc, item) => acc + ((item - media) ** 2), 0) / nums.length;
      return Math.sqrt(variancia);
    };

    let totalHomens = 0;
    let totalMulheres = 0;
    let totalCriancas = 0;
    let totalBebes = 0;
    let totalOnline = 0;
    let totalVoluntarios = 0;
    let totalApelos = 0;
    let totalPessoasApelo = 0;
    let totalPresencaCultosComApelo = 0;

    const porData = {};
    const porDataMinisterio = {};
    const nomesMinisterioSet = new Set();
    const porMinisterio = {};
    const porDiaSemana = {};
    const presencasPorCulto = [];
    const seriesMap = new Map();
    let totalMensagensSerie = 0;
    const registrosPorPresenca = [];

    for (const r of registros) {
      const d = r.toJSON();
      totalHomens += d.qtdHomens || 0;
      totalMulheres += d.qtdMulheres || 0;
      totalCriancas += d.qtdCriancas || 0;
      totalBebes += d.qtdBebes || 0;
      totalOnline += d.qtdOnline || 0;
      totalVoluntarios += d.qtdVoluntarios || 0;

      const presenca = (d.qtdHomens || 0) + (d.qtdMulheres || 0) + (d.qtdCriancas || 0) + (d.qtdBebes || 0);
      if (d.teveApelo) {
        totalApelos += 1;
        totalPessoasApelo += d.qtdApelo || 0;
        totalPresencaCultosComApelo += presenca;
      }
      presencasPorCulto.push(presenca);
      registrosPorPresenca.push({
        id: d.id,
        data: d.data,
        tituloMensagem: d.tituloMensagem || 'Sem título',
        ministerio: d.ministerio?.nome || 'Desconhecido',
        presenca,
      });

      if (d.eSerie && d.nomeSerie && String(d.nomeSerie).trim()) {
        totalMensagensSerie += 1;
        const nomeSerie = String(d.nomeSerie).replace(/\s+/g, ' ').trim();
        const nomeSerieKey = normalizarTextoSerie(nomeSerie);
        if (!seriesMap.has(nomeSerieKey)) seriesMap.set(nomeSerieKey, nomeSerie);
      }

      if (!porData[d.data]) {
        porData[d.data] = {
          presenca: 0,
          voluntarios: 0,
          online: 0,
          pessoasApelo: 0,
          apelos: 0,
          cultos: 0,
          titulos: [],
          ministerios: [],
        };
      }
      const nomeMin = d.ministerio?.nome || 'Desconhecido';
      const tituloMensagem = d.tituloMensagem ? String(d.tituloMensagem).trim() : '';
      if (!porDataMinisterio[d.data]) porDataMinisterio[d.data] = {};
      if (!porDataMinisterio[d.data][nomeMin]) porDataMinisterio[d.data][nomeMin] = 0;
      porDataMinisterio[d.data][nomeMin] += presenca;
      nomesMinisterioSet.add(nomeMin);

      porData[d.data].presenca += presenca;
      porData[d.data].voluntarios += d.qtdVoluntarios || 0;
      porData[d.data].online += d.qtdOnline || 0;
      porData[d.data].pessoasApelo += d.qtdApelo || 0;
      porData[d.data].apelos += d.teveApelo ? 1 : 0;
      porData[d.data].cultos += 1;
      if (tituloMensagem && !porData[d.data].titulos.includes(tituloMensagem)) {
        porData[d.data].titulos.push(tituloMensagem);
      }
      if (nomeMin && !porData[d.data].ministerios.includes(nomeMin)) {
        porData[d.data].ministerios.push(nomeMin);
      }

      if (!porMinisterio[nomeMin]) porMinisterio[nomeMin] = 0;
      porMinisterio[nomeMin] += presenca;

      const [ano, mes, dia] = String(d.data).split('-').map(Number);
      const weekDay = weekDayMap[new Date(Date.UTC(ano, (mes || 1) - 1, dia || 1)).getUTCDay()];
      if (!porDiaSemana[weekDay]) {
        porDiaSemana[weekDay] = {
          diaSemana: weekDay,
          cultos: 0,
          totalPresenca: 0,
          totalVoluntarios: 0,
          totalApelos: 0,
        };
      }
      porDiaSemana[weekDay].cultos += 1;
      porDiaSemana[weekDay].totalPresenca += presenca;
      porDiaSemana[weekDay].totalVoluntarios += d.qtdVoluntarios || 0;
      porDiaSemana[weekDay].totalApelos += d.teveApelo ? 1 : 0;
    }

    const totalCultos = registros.length;
    const totalPresenca = totalHomens + totalMulheres + totalCriancas + totalBebes;
    const mediaPresencaCulto = totalCultos ? Number((totalPresenca / totalCultos).toFixed(1)) : 0;
    const mediaVoluntariosCulto = totalCultos ? Number((totalVoluntarios / totalCultos).toFixed(1)) : 0;
    const taxaVoluntariado = totalPresenca ? Number(((totalVoluntarios / totalPresenca) * 100).toFixed(1)) : 0;
    const taxaOnline = totalPresenca ? Number(((totalOnline / totalPresenca) * 100).toFixed(1)) : 0;
    const taxaApeloCultos = totalCultos ? Number(((totalApelos / totalCultos) * 100).toFixed(1)) : 0;
    const taxaRespostaApelo = totalPresenca ? Number(((totalPessoasApelo / totalPresenca) * 100).toFixed(2)) : 0;
    const mediaPessoasPorApelo = totalApelos ? Number((totalPessoasApelo / totalApelos).toFixed(1)) : 0;
    const taxaRespostaApeloNosCultosComApelo = totalPresencaCultosComApelo
      ? Number(((totalPessoasApelo / totalPresencaCultosComApelo) * 100).toFixed(2))
      : 0;
    const participacaoFamilias = totalPresenca
      ? Number((((totalCriancas + totalBebes) / totalPresenca) * 100).toFixed(1))
      : 0;

    const mediaPresenca = calcularMedia(presencasPorCulto);
    const desvioPresenca = calcularDesvioPadrao(presencasPorCulto, mediaPresenca);
    const coeficienteVariacao = mediaPresenca > 0 ? (desvioPresenca / mediaPresenca) : 0;
    const indiceConsistencia = mediaPresenca > 0
      ? Math.max(0, Math.min(100, Math.round((1 - coeficienteVariacao) * 100)))
      : 0;

    let tendenciaPercentual = 0;
    if (presencasPorCulto.length >= 2) {
      const janela = Math.max(1, Math.floor(presencasPorCulto.length / 3));
      const mediaInicio = calcularMedia(presencasPorCulto.slice(0, janela));
      const mediaFinal = calcularMedia(presencasPorCulto.slice(-janela));
      if (mediaInicio > 0) {
        tendenciaPercentual = Number((((mediaFinal - mediaInicio) / mediaInicio) * 100).toFixed(1));
      }
    }
    const tendenciaLabel = tendenciaPercentual > 3 ? 'alta' : (tendenciaPercentual < -3 ? 'queda' : 'estavel');

    const alertas = [];
    if (totalCultos > 0 && indiceConsistencia < 65) {
      alertas.push('Oscilação alta de presença entre cultos; padronize escala, comunicação e recepção.');
    }
    if (totalCultos > 0 && taxaVoluntariado < 8) {
      alertas.push('Equipe enxuta para o volume atual; revisar escala por culto.');
    }
    if (totalApelos > 0 && mediaPessoasPorApelo < 1) {
      alertas.push('Baixa resposta aos apelos no período; média inferior a 1 pessoa por apelo.');
    }

    const datasOrdenadas = Object.keys(porData).sort((a, b) => String(a).localeCompare(String(b)));
    const nomesMinisterioOrdenados = Array.from(nomesMinisterioSet)
      .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
    const ministeriosEvolucao = nomesMinisterioOrdenados
      .map((nome, index) => ({ id: `ministerio_${index + 1}`, nome }));

    const evolucaoPresenca = datasOrdenadas
      .map((data) => {
        const metricas = porData[data];
        return {
          data,
          presenca: metricas.presenca,
          titulos: metricas.titulos,
          ministerios: metricas.ministerios,
        };
      });

    const evolucaoPresencaPorMinisterio = datasOrdenadas
      .map((data) => {
        const linha = { data };
        ministeriosEvolucao.forEach((ministerio) => {
          linha[ministerio.id] = porDataMinisterio[data]?.[ministerio.nome] || 0;
        });
        return linha;
      });

    const engajamentoPorData = Object.entries(porData)
      .map(([data, metricas]) => ({
        data,
        presenca: metricas.presenca,
        voluntarios: metricas.voluntarios,
        online: metricas.online,
        pessoasApelo: metricas.pessoasApelo,
        apelos: metricas.apelos,
        cultos: metricas.cultos,
      }));

    const performanceDiaSemana = weekDayMap
      .map((diaSemana) => porDiaSemana[diaSemana])
      .filter(Boolean)
      .map((item) => ({
        diaSemana: item.diaSemana,
        cultos: item.cultos,
        mediaPresenca: Number((item.totalPresenca / item.cultos).toFixed(1)),
        mediaVoluntarios: Number((item.totalVoluntarios / item.cultos).toFixed(1)),
        taxaApelo: Number(((item.totalApelos / item.cultos) * 100).toFixed(1)),
      }));

    const totalSeriesMinistradas = seriesMap.size;
    const topRegistrosPresenca = registrosPorPresenca
      .sort((a, b) => b.presenca - a.presenca)
      .slice(0, 5)
      .map((item, index) => ({ ...item, posicao: index + 1 }));

    return {
      totalCultos,
      totalHomens,
      totalMulheres,
      totalCriancas,
      totalBebes,
      totalPresenca,
      totalOnline,
      totalVoluntarios,
      totalApelos,
      totalPessoasApelo,
      evolucaoPresenca,
      evolucaoPresencaPorMinisterio,
      ministeriosEvolucao,
      engajamentoPorData,
      performanceDiaSemana,
      presencaPorMinisterio: Object.entries(porMinisterio).map(([nome, presenca]) => ({ nome, presenca })),
      insights: {
        mediaPresencaCulto,
        mediaVoluntariosCulto,
        taxaVoluntariado,
        taxaOnline,
        taxaApeloCultos,
        taxaRespostaApelo,
        mediaPessoasPorApelo,
        taxaRespostaApeloNosCultosComApelo,
        participacaoFamilias,
        indiceConsistencia,
        tendenciaPercentual,
        tendenciaLabel,
        totalSeriesMinistradas,
        totalMensagensSerie,
      },
      topRegistrosPresenca,
      alertas,
    };
  },
};

module.exports = RegistroCultoService;
