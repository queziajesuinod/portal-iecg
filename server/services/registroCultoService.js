const { Op } = require('sequelize');
const {
  RegistroCulto, Campus, Ministerio, TipoEvento, Ministro, User, CampusMinisterio
} = require('../models');

const includeBase = [
  { model: Campus, as: 'campus', attributes: ['id', 'nome', 'transmiteOnline'] },
  { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome', 'exibeCriancas', 'exibeBebes', 'apeloDefault'] },
  { model: TipoEvento, as: 'tipoEvento', attributes: ['id', 'nome'] },
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
];

const buildInclude = (ministroId) => {
  const ministroInclude = ministroId
    ? {
      model: Ministro, as: 'ministros', where: { id: ministroId }, required: true, through: { attributes: [] }, attributes: ['id', 'nome']
    }
    : {
      model: Ministro, as: 'ministros', attributes: ['id', 'nome'], through: { attributes: [] }
    };
  return [...includeBase, ministroInclude];
};

const normalizarTextoSerie = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const pad2 = (valor) => String(valor).padStart(2, '0');

const ultimoDiaMes = (ano, mes) => new Date(ano, mes, 0).getDate();

const periodoMes = (ano, mes) => ({
  dataInicio: `${ano}-${pad2(mes)}-01`,
  dataFim: `${ano}-${pad2(mes)}-${pad2(ultimoDiaMes(ano, mes))}`,
});

const mesAnterior = (ano, mes) => {
  if (mes === 1) return { ano: ano - 1, mes: 12 };
  return { ano, mes: mes - 1 };
};

const presencaRegistro = (registro) => (
  (registro.qtdHomens || 0)
  + (registro.qtdMulheres || 0)
  + (registro.qtdCriancas || 0)
  + (registro.qtdBebes || 0)
);

const arredondar = (valor, casas = 2) => Number(Number(valor || 0).toFixed(casas));

const calcularVariacao = (mediaAtual, mediaAnterior) => {
  if (!mediaAnterior) return mediaAtual > 0 ? 100 : 0;
  return ((mediaAtual - mediaAnterior) / mediaAnterior) * 100;
};

const tendenciaPorVariacao = (variacao) => {
  if (variacao > 0) return { label: 'AUMENTO', icone: '🔺' };
  if (variacao < 0) return { label: 'QUEDA', icone: '🔻' };
  return { label: 'ESTAVEL', icone: '➡️' };
};

const formatarDecimalTexto = (valor) => Number(valor || 0).toFixed(2);

const formatarVariacaoTexto = (valor) => `${Number(valor || 0).toFixed(2)}%`;

const montarRegistroDestaque = (registro, mediaGeralAtual) => {
  if (!registro) return null;
  const dados = registro.toJSON ? registro.toJSON() : registro;
  const presenca = presencaRegistro(dados);
  return {
    id: dados.id,
    data: dados.data,
    horario: dados.horario,
    campus: dados.campus ? { id: dados.campus.id, nome: dados.campus.nome } : null,
    tituloMensagem: dados.tituloMensagem || 'Sem titulo',
    eSerie: !!dados.eSerie,
    nomeSerie: dados.eSerie && dados.nomeSerie ? String(dados.nomeSerie).trim() : '',
    presenca,
    diferencaMedia: arredondar(presenca - mediaGeralAtual),
  };
};

const montarTextoRelatorio = (relatorio) => {
  const linhas = [
    `RELATORIO DE FLUXO - *${relatorio.referencia.nomeMes.toUpperCase()}*`,
    `🔼🔽 ${String(relatorio.ministerio.nome || '').toUpperCase()} 🔼🔽`,
    '',
    '#########################',
    '',
  ];

  relatorio.campus.forEach((item) => {
    linhas.push(
      `🏫 *${item.campus.nome}*`,
      `🔘 *Total de Cultos:* ${item.totalCultos}`,
      `🔘 *Fluxo Geral:* ${item.fluxoGeral}`,
      `🔘 *Media por Culto:* ${formatarDecimalTexto(item.mediaPorCulto)}`,
      `🔘 *Media do Mes Anterior:* ${formatarDecimalTexto(item.mediaMesAnterior)}`,
      `🔘 *Variacao:* ${formatarVariacaoTexto(item.variacao)}`,
      `🔘 *Tendencia:* ${item.tendencia.label} ${item.tendencia.icone}`,
      ''
    );
  });

  linhas.push(
    '#########################',
    '',
    '📊 *RESUMO GERAL*',
    `🔘 *Total de Cultos:* ${relatorio.resumo.totalCultos}`,
    `🔘 *Fluxo Geral:* ${relatorio.resumo.fluxoGeral}`,
    `🔘 *Media Geral Atual:* ${formatarDecimalTexto(relatorio.resumo.mediaGeralAtual)}`,
    `🔘 *Media Geral Anterior:* ${formatarDecimalTexto(relatorio.resumo.mediaGeralAnterior)}`,
    `🔘 *Variacao:* ${formatarVariacaoTexto(relatorio.resumo.variacao)}`,
    `🔘 *Tendencia:* ${relatorio.resumo.tendencia.label} ${relatorio.resumo.tendencia.icone}`
  );

  return linhas.join('\n');
};

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

  async relatorioMensal(filtros = {}) {
    const ano = parseInt(filtros.ano, 10);
    const mes = parseInt(filtros.mes, 10);

    if (!ano || !mes || mes < 1 || mes > 12) {
      throw new Error('Informe ano e mes validos para gerar o relatorio');
    }
    if (!filtros.ministerioId) {
      throw new Error('ministerioId e obrigatorio para gerar o relatorio');
    }

    const [ministerio, campusSelecionado] = await Promise.all([
      Ministerio.findByPk(filtros.ministerioId, { attributes: ['id', 'nome'] }),
      filtros.campusId ? Campus.findByPk(filtros.campusId, { attributes: ['id', 'nome'] }) : null,
    ]);

    if (!ministerio) throw new Error('Ministerio nao encontrado');
    if (filtros.campusId && !campusSelecionado) throw new Error('Campus nao encontrado');

    const periodoAtual = periodoMes(ano, mes);
    const refAnterior = mesAnterior(ano, mes);
    const periodoAnterior = periodoMes(refAnterior.ano, refAnterior.mes);

    const whereBase = {
      ministerioId: filtros.ministerioId,
    };
    if (filtros.campusId) whereBase.campusId = filtros.campusId;

    const [vinculos, registrosAtual, registrosAnterior] = await Promise.all([
      CampusMinisterio.findAll({
        where: { ministerioId: filtros.ministerioId },
        include: [{ model: Campus, as: 'campus', attributes: ['id', 'nome'] }],
        order: [[{ model: Campus, as: 'campus' }, 'nome', 'ASC']],
      }),
      RegistroCulto.findAll({
        where: {
          ...whereBase,
          data: { [Op.between]: [periodoAtual.dataInicio, periodoAtual.dataFim] },
        },
        include: [{ model: Campus, as: 'campus', attributes: ['id', 'nome'] }],
        order: [[{ model: Campus, as: 'campus' }, 'nome', 'ASC'], ['data', 'ASC'], ['horario', 'ASC']],
      }),
      RegistroCulto.findAll({
        where: {
          ...whereBase,
          data: { [Op.between]: [periodoAnterior.dataInicio, periodoAnterior.dataFim] },
        },
        include: [{ model: Campus, as: 'campus', attributes: ['id', 'nome'] }],
        order: [[{ model: Campus, as: 'campus' }, 'nome', 'ASC'], ['data', 'ASC'], ['horario', 'ASC']],
      }),
    ]);

    const campusMap = new Map();
    const adicionarCampus = (campus) => {
      if (!campus?.id) return;
      if (filtros.campusId && campus.id !== filtros.campusId) return;
      if (!campusMap.has(campus.id)) {
        campusMap.set(campus.id, { id: campus.id, nome: campus.nome || 'Campus sem nome' });
      }
    };

    if (campusSelecionado) adicionarCampus(campusSelecionado);
    vinculos.forEach((vinculo) => adicionarCampus(vinculo.campus));
    registrosAtual.forEach((registro) => adicionarCampus(registro.campus));
    registrosAnterior.forEach((registro) => adicionarCampus(registro.campus));

    const baseMetricas = () => ({ totalCultos: 0, fluxoGeral: 0 });
    const atuaisPorCampus = new Map();
    const anterioresPorCampus = new Map();

    const agregar = (mapa, registro) => {
      const { campusId } = registro;
      if (!mapa.has(campusId)) mapa.set(campusId, baseMetricas());
      const item = mapa.get(campusId);
      item.totalCultos += 1;
      item.fluxoGeral += presencaRegistro(registro);
    };

    registrosAtual.forEach((registro) => agregar(atuaisPorCampus, registro));
    registrosAnterior.forEach((registro) => agregar(anterioresPorCampus, registro));

    const linhasCampus = Array.from(campusMap.values())
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
      .map((campus) => {
        const atual = atuaisPorCampus.get(campus.id) || baseMetricas();
        const anterior = anterioresPorCampus.get(campus.id) || baseMetricas();
        const mediaPorCulto = atual.totalCultos ? atual.fluxoGeral / atual.totalCultos : 0;
        const mediaMesAnterior = anterior.totalCultos ? anterior.fluxoGeral / anterior.totalCultos : 0;
        const variacao = calcularVariacao(mediaPorCulto, mediaMesAnterior);

        return {
          campus,
          totalCultos: atual.totalCultos,
          fluxoGeral: atual.fluxoGeral,
          mediaPorCulto: arredondar(mediaPorCulto),
          mediaMesAnterior: arredondar(mediaMesAnterior),
          variacao: arredondar(variacao),
          tendencia: tendenciaPorVariacao(variacao),
        };
      });

    const totalAtual = registrosAtual.reduce((acc, registro) => {
      acc.totalCultos += 1;
      acc.fluxoGeral += presencaRegistro(registro);
      return acc;
    }, baseMetricas());

    const totalAnterior = registrosAnterior.reduce((acc, registro) => {
      acc.totalCultos += 1;
      acc.fluxoGeral += presencaRegistro(registro);
      return acc;
    }, baseMetricas());

    const mediaGeralAtual = totalAtual.totalCultos ? totalAtual.fluxoGeral / totalAtual.totalCultos : 0;
    const mediaGeralAnterior = totalAnterior.totalCultos ? totalAnterior.fluxoGeral / totalAnterior.totalCultos : 0;
    const variacaoResumo = calcularVariacao(mediaGeralAtual, mediaGeralAnterior);
    const registrosOrdenadosPorPresenca = [...registrosAtual]
      .sort((a, b) => presencaRegistro(b) - presencaRegistro(a));
    const cultoAcimaMedia = registrosOrdenadosPorPresenca
      .find((registro) => presencaRegistro(registro) > mediaGeralAtual);
    const cultoAbaixoMedia = [...registrosAtual]
      .sort((a, b) => presencaRegistro(a) - presencaRegistro(b))
      .find((registro) => presencaRegistro(registro) < mediaGeralAtual);

    const relatorio = {
      referencia: {
        ano,
        mes,
        nomeMes: MESES_PT[mes - 1],
        dataInicio: periodoAtual.dataInicio,
        dataFim: periodoAtual.dataFim,
      },
      comparativo: {
        ano: refAnterior.ano,
        mes: refAnterior.mes,
        nomeMes: MESES_PT[refAnterior.mes - 1],
        dataInicio: periodoAnterior.dataInicio,
        dataFim: periodoAnterior.dataFim,
      },
      filtros: {
        ministerioId: filtros.ministerioId,
        campusId: filtros.campusId || null,
      },
      ministerio: ministerio.toJSON ? ministerio.toJSON() : ministerio,
      campus: linhasCampus,
      resumo: {
        totalCultos: totalAtual.totalCultos,
        fluxoGeral: totalAtual.fluxoGeral,
        mediaGeralAtual: arredondar(mediaGeralAtual),
        mediaGeralAnterior: arredondar(mediaGeralAnterior),
        variacao: arredondar(variacaoResumo),
        tendencia: tendenciaPorVariacao(variacaoResumo),
      },
      destaquesCultos: {
        acimaMedia: montarRegistroDestaque(cultoAcimaMedia, mediaGeralAtual),
        abaixoMedia: montarRegistroDestaque(cultoAbaixoMedia, mediaGeralAtual),
      },
    };

    return {
      ...relatorio,
      textoMensagem: montarTextoRelatorio(relatorio),
    };
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
