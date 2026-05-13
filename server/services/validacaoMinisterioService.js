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

    const [registros, justificativas] = await Promise.all([
      RegistroCulto.findAll({
        where: { campusId, ministerioId, data: { [Op.in]: datasEsperadas } },
        attributes: ['data'],
      }),
      CultoAusenciaJustificada.findAll({
        where: { campusId, ministerioId, data: { [Op.in]: datasEsperadas } },
        attributes: ['data', 'motivo'],
      }),
    ]);

    const datasRegistradas = new Set(registros.map((r) => r.data));
    const datasJustificadas = new Map(justificativas.map((j) => [j.data, j.motivo || '']));

    const datasAusentes = datasEsperadas.filter(
      (d) => !datasRegistradas.has(d) && !datasJustificadas.has(d)
    );

    return {
      campus: vinculo.campus,
      ministerio: vinculo.ministerio,
      responsavel: vinculo.responsavel,
      validacaoAtiva: vinculo.validacaoAtiva,
      diasPadrao: vinculo.diasPadrao,
      mes,
      ano,
      datasEsperadas,
      datasRegistradas: [...datasRegistradas].filter((d) => datasEsperadas.includes(d)).sort(),
      datasJustificadas: Object.fromEntries(datasJustificadas),
      datasAusentes: datasAusentes.sort(),
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

    return resultados.filter((r) => r.datasAusentes.length > 0);
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

    if (resultado.datasAusentes.length === 0) {
      return { enviado: false, motivo: 'Nenhuma data ausente para notificar' };
    }

    const nomeResponsavel = resultado.responsavel.preferredName || resultado.responsavel.fullName;
    const nomeMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });
    const listaDatas = resultado.datasAusentes.map(formatarData).join(', ');

    const mensagem = `Olá, ${nomeResponsavel}! 👋\n\n`
      + 'Este é um aviso do sistema da Igreja IECG.\n\n'
      + '📋 *Registros de culto pendentes*\n'
      + `Ministério: *${resultado.ministerio.nome}*\n`
      + `Campus: *${resultado.campus.nome}*\n`
      + `Mês: *${nomeMes}/${ano}*\n\n`
      + 'As seguintes datas não possuem registro de culto:\n'
      + `📅 ${listaDatas}\n\n`
      + 'Por favor, acesse o sistema e registre os cultos realizados ou informe caso não tenham ocorrido.\n\n'
      + '_Mensagem automática — Portal IECG_';

    const resultadoEnvio = await evolutionApiService.enviarMensagemTexto(whatsapp, mensagem);

    return {
      enviado: resultadoEnvio.sucesso,
      erro: resultadoEnvio.erro,
      responsavel: nomeResponsavel,
      whatsapp,
      datasAusentes: resultado.datasAusentes,
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
