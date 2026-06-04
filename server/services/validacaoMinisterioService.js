const { Op } = require('sequelize');
const {
  CampusMinisterio, RegistroCulto, Ministerio, Campus, Member, CultoAusenciaJustificada,
} = require('../models');
const evolutionApiService = require('./evolutionApiService');

function calcularDatasEsperadas(diasPadrao, mes, ano) {
  if (!diasPadrao || diasPadrao.length === 0) return [];
  const datas = [];
  const diasSet = new Set(diasPadrao.map(Number));
  const inicio = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  // Só considera datas que já passaram (ontem inclusive)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = fimMes < hoje ? fimMes : new Date(hoje.getTime() - 86400000);

  if (fim < inicio) return [];

  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (diasSet.has(d.getDay())) {
      datas.push(d.toISOString().slice(0, 10));
    }
  }
  return datas;
}

/** Converte "HH:MM" ou "HH:MM:SS" em minutos totais para comparação */
function toMinutos(horario) {
  if (!horario) return -1;
  const partes = String(horario).split(':');
  return Number(partes[0]) * 60 + Number(partes[1] || 0);
}

/** Verifica se dois horários são próximos (tolerância em minutos) */
function horariosProximos(h1, h2, toleranciaMin = 20) {
  return Math.abs(toMinutos(h1) - toMinutos(h2)) <= toleranciaMin;
}

/**
 * Resolve qual config de horários estava vigente em uma data específica.
 * Suporta dois formatos de horariosPadrao:
 *   - Legado (objeto simples): { "0": ["08:30","10:30"] }
 *   - Versionado (array): [{ vigenteDe, vigenteAte, config: { "0": [...] } }]
 * Retorna o config (objeto) correspondente à data, ou {} se não houver vigência.
 */
function resolverConfigParaData(horariosPadrao, data) {
  if (!horariosPadrao) return {};

  // Formato legado: objeto simples com chaves de dia da semana
  if (!Array.isArray(horariosPadrao)) return horariosPadrao;

  // Formato versionado: encontra a versão vigente na data
  const versao = horariosPadrao
    .filter((v) => v.vigenteDe && v.vigenteDe <= data && (v.vigenteAte == null || v.vigenteAte >= data))
    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe))[0]; // mais recente que cobre a data

  return versao?.config || {};
}

/**
 * Para cada data esperada, retorna quais horários estão faltando,
 * usando a versão de horários vigente naquela data específica.
 */
function calcularFaltasPorData(datasEsperadas, horariosRegistradosPorData, horariosPadrao, datasJustificadas) {
  return datasEsperadas.map((data) => {
    if (datasJustificadas.has(data)) {
      return {
        data, status: 'justificado', motivo: datasJustificadas.get(data), horariosAusentes: [], horariosRegistrados: []
      };
    }

    const configNaData = resolverConfigParaData(horariosPadrao, data);
    const diaSemana = String(new Date(`${data}T12:00:00`).getDay());
    const horariosEsperados = (configNaData || {})[diaSemana] || [];
    const registradosNoDia = horariosRegistradosPorData[data] || [];

    if (horariosEsperados.length === 0) {
      if (registradosNoDia.length > 0) {
        return {
          data, status: 'ok', horariosAusentes: [], horariosRegistrados: registradosNoDia
        };
      }
      return {
        data, status: 'ausente', horariosAusentes: [], horariosRegistrados: []
      };
    }

    const ausentes = horariosEsperados.filter(
      (esperado) => !registradosNoDia.some((registrado) => horariosProximos(esperado, registrado))
    );

    const status = ausentes.length === 0 ? 'ok' : (ausentes.length === horariosEsperados.length ? 'ausente' : 'parcial');

    return {
      data, status, horariosAusentes: ausentes, horariosRegistrados: registradosNoDia, horariosEsperados,
    };
  });
}

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

const ValidacaoMinisterioService = {
  async verificarPorCampusMinisterio(campusId, ministerioId, mes, ano) {
    const vinculo = await CampusMinisterio.findOne({
      where: { campusId, ministerioId },
      include: [
        { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
        { model: Ministerio, as: 'ministerio', attributes: ['id', 'nome'] },
        {
          model: Member,
          as: 'responsavel',
          attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
          required: false,
        },
      ],
    });

    if (!vinculo) throw new Error('Vínculo campus × ministério não encontrado');

    const datasEsperadas = calcularDatasEsperadas(vinculo.diasPadrao, mes, ano);
    if (datasEsperadas.length === 0) {
      return {
        campus: vinculo.campus,
        ministerio: vinculo.ministerio,
        responsavel: vinculo.responsavel,
        validacaoAtiva: vinculo.validacaoAtiva,
        diasPadrao: vinculo.diasPadrao,
        horariosPadrao: vinculo.horariosPadrao || {},
        mes,
        ano,
        datasEsperadas: [],
        detalhesPorData: [],
        datasAusentes: [],
        datasParciais: [],
      };
    }

    const [registros, justificativas] = await Promise.all([
      RegistroCulto.findAll({
        where: { campusId, ministerioId, data: { [Op.in]: datasEsperadas } },
        attributes: ['data', 'horario'],
      }),
      CultoAusenciaJustificada.findAll({
        where: { campusId, ministerioId, data: { [Op.in]: datasEsperadas } },
        attributes: ['data', 'motivo'],
      }),
    ]);

    // Agrupa horários registrados por data
    const horariosRegistradosPorData = {};
    registros.forEach((r) => {
      const hora = String(r.horario || '').slice(0, 5); // HH:MM
      if (!horariosRegistradosPorData[r.data]) horariosRegistradosPorData[r.data] = [];
      horariosRegistradosPorData[r.data].push(hora);
    });

    const datasJustificadas = new Map(justificativas.map((j) => [j.data, j.motivo || '']));

    const detalhesPorData = calcularFaltasPorData(
      datasEsperadas,
      horariosRegistradosPorData,
      vinculo.horariosPadrao || {},
      datasJustificadas
    );

    const datasAusentes = detalhesPorData
      .filter((d) => d.status === 'ausente')
      .map((d) => d.data)
      .sort();

    const datasPartciais = detalhesPorData
      .filter((d) => d.status === 'parcial')
      .map((d) => d.data)
      .sort();

    return {
      campus: vinculo.campus,
      ministerio: vinculo.ministerio,
      responsavel: vinculo.responsavel,
      validacaoAtiva: vinculo.validacaoAtiva,
      diasPadrao: vinculo.diasPadrao,
      horariosPadrao: vinculo.horariosPadrao || {},
      mes,
      ano,
      datasEsperadas,
      detalhesPorData,
      datasAusentes,
      datasPartciais,
      // Retrocompat: datas com qualquer problema (ausente ou parcial)
      datasComProblema: [...new Set([...datasAusentes, ...datasPartciais])].sort(),
    };
  },

  async verificarTodosPorCampus(campusId, mes, ano) {
    const vinculos = await CampusMinisterio.findAll({
      where: { campusId },
      include: [
        {
          model: Ministerio, as: 'ministerio', where: { ativo: true }, attributes: ['id', 'nome']
        },
        { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
        {
          model: Member,
          as: 'responsavel',
          attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
          required: false,
        },
      ],
    });

    return Promise.all(
      vinculos.map((v) => this.verificarPorCampusMinisterio(campusId, v.ministerioId, mes, ano))
    );
  },

  async verificarTodosComValidacaoAtiva(mes, ano) {
    const vinculos = await CampusMinisterio.findAll({
      where: { validacaoAtiva: true },
      include: [
        {
          model: Ministerio, as: 'ministerio', where: { ativo: true }, attributes: ['id', 'nome']
        },
        { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
        {
          model: Member,
          as: 'responsavel',
          attributes: ['id', 'fullName', 'preferredName', 'whatsapp', 'phone'],
          required: false,
        },
      ],
    });

    const resultados = await Promise.all(
      vinculos.map((v) => this.verificarPorCampusMinisterio(v.campusId, v.ministerioId, mes, ano))
    );

    return resultados.filter((r) => (r.datasComProblema || r.datasAusentes || []).length > 0);
  },

  async justificarAusencia(campusId, ministerioId, data, motivo, userId) {
    const [registro] = await CultoAusenciaJustificada.findOrCreate({
      where: { campusId, ministerioId, data },
      defaults: { motivo: motivo || null, criadoPorUserId: userId || null },
    });
    if (motivo !== undefined) await registro.update({ motivo: motivo || null });
    return registro;
  },

  async removerJustificativa(campusId, ministerioId, data) {
    const removidos = await CultoAusenciaJustificada.destroy({
      where: { campusId, ministerioId, data },
    });
    if (removidos === 0) throw new Error('Justificativa não encontrada');
  },

  async enviarNotificacao(campusId, ministerioId, mes, ano) {
    const resultado = await this.verificarPorCampusMinisterio(campusId, ministerioId, mes, ano);

    if (!resultado.responsavel) {
      throw new Error('Nenhum responsável definido para este ministério');
    }

    const whatsapp = resultado.responsavel.whatsapp || resultado.responsavel.phone;
    if (!whatsapp) {
      throw new Error('O responsável não possui número de WhatsApp cadastrado');
    }

    const problemasTotal = (resultado.datasComProblema || resultado.datasAusentes || []).length;
    if (problemasTotal === 0) {
      return { enviado: false, motivo: 'Nenhuma data com problema para notificar' };
    }

    const nomeResponsavel = resultado.responsavel.preferredName || resultado.responsavel.fullName;
    const nomeMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });

    // Monta lista detalhada: data + horários faltando
    const detalhesPendentes = (resultado.detalhesPorData || [])
      .filter((d) => d.status === 'ausente' || d.status === 'parcial')
      .sort((a, b) => a.data.localeCompare(b.data));

    let listaDatas;
    if (detalhesPendentes.length > 0 && detalhesPendentes.some((d) => d.horariosAusentes && d.horariosAusentes.length > 0)) {
      listaDatas = detalhesPendentes.map((d) => {
        const dataFmt = formatarData(d.data);
        if (d.horariosAusentes && d.horariosAusentes.length > 0) {
          return `📅 ${dataFmt} — faltam: ${d.horariosAusentes.join(', ')}`;
        }
        return `📅 ${dataFmt} — sem registro`;
      }).join('\n');
    } else {
      listaDatas = detalhesPendentes.map((d) => `📅 ${formatarData(d.data)}`).join(', ');
    }

    const temParciais = (resultado.datasPartciais || []).length > 0;

    const mensagem = `Olá, ${nomeResponsavel}! 👋\n\n`
      + 'Este é um aviso do sistema da Igreja IECG.\n\n'
      + '📋 *Registros de culto pendentes*\n'
      + `Ministério: *${resultado.ministerio.nome}*\n`
      + `Campus: *${resultado.campus.nome}*\n`
      + `Mês: *${nomeMes}/${ano}*\n\n`
      + (temParciais
        ? 'As seguintes datas possuem cultos não registrados:\n'
        : 'As seguintes datas não possuem registro de culto:\n')
      + `${listaDatas}\n\n`
      + 'Por favor, acesse o sistema e registre os cultos realizados ou informe caso não tenham ocorrido.\n\n'
      + '_Mensagem automática — Portal IECG_';

    const resultadoEnvio = await evolutionApiService.enviarMensagemTexto(whatsapp, mensagem);

    return {
      enviado: resultadoEnvio.sucesso,
      erro: resultadoEnvio.erro,
      responsavel: nomeResponsavel,
      whatsapp,
      datasAusentes: resultado.datasAusentes,
      datasPartciais: resultado.datasPartciais,
    };
  },

  async enviarNotificacoesAutomaticas(mes, ano) {
    const pendentes = await this.verificarTodosComValidacaoAtiva(mes, ano);

    const resultados = [];
    for (const item of pendentes) {
      if (!item.responsavel) continue;
      try {
        const envio = await this.enviarNotificacao(item.campus.id, item.ministerio.id, mes, ano);
        resultados.push({ ...envio, ministerio: item.ministerio.nome, campus: item.campus.nome });
      } catch (err) {
        resultados.push({
          enviado: false,
          erro: err.message,
          ministerio: item.ministerio.nome,
          campus: item.campus.nome,
        });
      }
    }

    return resultados;
  },
};

module.exports = ValidacaoMinisterioService;
