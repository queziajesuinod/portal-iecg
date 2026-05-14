const moment = require('moment-timezone');
const { Op } = require('sequelize');
const {
  Celula,
  CelulaMembroVinculo,
  CelulaReuniao,
  CelulaPresenca,
  CelulaPresencaPonto,
  PreCadastroPresenca,
  Member,
  MemberActivity,
  MemberActivityType
} = require('../models');
const {
  APP_TIMEZONE, now, todayDateOnly, startOfToday, endOfToday
} = require('../utils/dateTime');

// Mapa de nome do dia para número (0 = domingo)
const DIA_SEMANA_MAP = {
  domingo: 0,
  sunday: 0,
  segunda: 1,
  'segunda-feira': 1,
  monday: 1,
  terca: 2,
  terça: 2,
  'terça-feira': 2,
  tuesday: 2,
  quarta: 3,
  'quarta-feira': 3,
  wednesday: 3,
  quinta: 4,
  'quinta-feira': 4,
  thursday: 4,
  sexta: 5,
  'sexta-feira': 5,
  friday: 5,
  sabado: 6,
  sábado: 6,
  saturday: 6
};

function parseDiaSemana(dia) {
  if (!dia) return null;
  const normalized = String(dia).toLowerCase().trim().normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (DIA_SEMANA_MAP[normalized] !== undefined) return DIA_SEMANA_MAP[normalized];
  const num = parseInt(normalized, 10);
  return Number.isInteger(num) && num >= 0 && num <= 6 ? num : null;
}

function parseHorario(horario) {
  if (!horario) return { hours: 19, minutes: 0 };
  const [h, m] = String(horario).split(':').map(Number);
  return { hours: h || 19, minutes: m || 0 };
}

// Gera as próximas N datas de reunião para a célula (horário Campo Grande)
function gerarDatas(celula, semanas = 8) {
  const diaSemana = parseDiaSemana(celula.dia);
  if (diaSemana === null) return [];

  const { hours, minutes } = parseHorario(celula.horario);
  const datas = [];
  const hoje = moment.tz(APP_TIMEZONE).startOf('day');
  const diff = (diaSemana - hoje.day() + 7) % 7;
  const primeira = hoje.clone().add(diff, 'days');

  for (let i = 0; i < semanas; i += 1) {
    const data = primeira.clone().add(i * 7, 'days').set({
      hour: hours, minute: minutes, second: 0, millisecond: 0
    });
    datas.push(data.toDate());
  }

  return datas;
}

// Sugere datas de reunião sem criar (para o líder confirmar)
async function sugerirReunioes(celulaId, semanas = 8) {
  const celula = await Celula.findByPk(celulaId);
  if (!celula || !celula.dia || !celula.horario) return [];

  const datas = gerarDatas(celula, semanas);
  if (!datas.length) return [];

  const inicio = datas[0];
  const fim = datas[datas.length - 1];

  const existentes = await CelulaReuniao.findAll({
    where: { celulaId, data: { [Op.between]: [inicio, fim] } },
    attributes: ['data', 'status']
  });

  const existentesMap = {};
  for (const r of existentes) {
    existentesMap[moment.tz(r.data, APP_TIMEZONE).format('YYYY-MM-DD')] = r.status;
  }

  return datas.map(d => {
    const key = moment.tz(d, APP_TIMEZONE).format('YYYY-MM-DD');
    return {
      data: d,
      existente: key in existentesMap,
      statusExistente: existentesMap[key] || null
    };
  });
}

// Cria reuniões a partir de lista explícita de datas ISO confirmadas pelo líder
async function criarReunioesDatas(celulaId, datasISO) {
  if (!datasISO || !datasISO.length) return 0;

  const datas = datasISO.map(d => new Date(d));
  const inicio = new Date(Math.min(...datas.map(d => d.getTime())));
  const fim = new Date(Math.max(...datas.map(d => d.getTime())));

  const existentes = await CelulaReuniao.findAll({
    where: { celulaId, data: { [Op.between]: [inicio, fim] } },
    attributes: ['data']
  });
  const existentesSet = new Set(
    existentes.map(r => moment.tz(r.data, APP_TIMEZONE).format('YYYY-MM-DD'))
  );

  const novas = datas.filter(d => !existentesSet.has(moment.tz(d, APP_TIMEZONE).format('YYYY-MM-DD')));
  if (!novas.length) return 0;

  const agora = now();
  await CelulaReuniao.bulkCreate(
    novas.map(data => ({
      celulaId,
      data,
      status: data <= agora ? 'aberta' : 'agendada',
      origem: 'manual'
    }))
  );

  return novas.length;
}

// Exclui reuniões com status "agendada" (não foram abertas nem tiveram presença)
async function excluirReunioesAgendadas(celulaId) {
  return CelulaReuniao.destroy({ where: { celulaId, status: 'agendada' } });
}

// Exclui uma reunião individual se não tiver presença marcada (presente != null)
async function excluirReuniao(reuniaoId) {
  const reuniao = await CelulaReuniao.findByPk(reuniaoId);
  if (!reuniao) throw new Error('Reunião não encontrada');
  if (reuniao.status === 'encerrada') throw new Error('Reunião já encerrada, não pode ser excluída');

  const presencaMarcada = await CelulaPresenca.count({
    where: { reuniaoId, presente: { [Op.ne]: null } }
  });
  if (presencaMarcada > 0) throw new Error('Reunião possui presenças marcadas e não pode ser excluída');

  await CelulaPresenca.destroy({ where: { reuniaoId } });
  await reuniao.destroy();
}

// Gera reuniões automáticas para uma célula (sem duplicar) — mantido para uso legado
async function gerarReunioesParaCelula(celula, semanas = 8) {
  if (!celula.dia || !celula.horario || !celula.ativo) return 0;
  const datas = gerarDatas(celula, semanas);
  if (!datas.length) return 0;

  const datasISO = datas.map(d => d.toISOString());
  return criarReunioesDatas(celula.id, datasISO);
}

// Compatibilidade com scheduler (não mais chamado pelo cron de geração)
async function gerarReunioesTodasCelulas() {
  const celulas = await Celula.findAll({
    where: { ativo: true, dia: { [Op.ne]: null }, horario: { [Op.ne]: null } }
  });
  let total = 0;
  for (const celula of celulas) {
    total += await gerarReunioesParaCelula(celula, 8);
  }
  return total;
}

// Cron: abre reuniões do dia (agendada → aberta)
async function abrirReunioesDodia() {
  const inicioDia = startOfToday();
  const fimDia = endOfToday();

  const reunioes = await CelulaReuniao.findAll({
    where: { status: 'agendada', data: { [Op.between]: [inicioDia, fimDia] } }
  });

  for (const reuniao of reunioes) {
    await reuniao.update({ status: 'aberta' });
    await _preCriarPresencas(reuniao);
  }

  return reunioes.length;
}

// Pré-cria registros de presença (presente=null) para todos os membros ativos da célula
async function _preCriarPresencas(reuniao) {
  const vinculos = await CelulaMembroVinculo.findAll({
    where: { celulaId: reuniao.celulaId, ativo: true }
  });

  if (!vinculos.length) return;

  const existentes = await CelulaPresenca.findAll({
    where: { reuniaoId: reuniao.id, membroId: { [Op.in]: vinculos.map(v => v.membroId) } },
    attributes: ['membroId']
  });
  const existentesSet = new Set(existentes.map(p => p.membroId));

  const novos = vinculos
    .filter(v => !existentesSet.has(v.membroId))
    .map(v => ({ reuniaoId: reuniao.id, membroId: v.membroId, presente: null }));

  if (novos.length) await CelulaPresenca.bulkCreate(novos);
}

// Vincula líder como membro da célula ao criar/atualizar célula
async function vincularLiderComoCelulaMembro(celula) {
  if (!celula.liderMemberId) return;

  const existente = await CelulaMembroVinculo.findOne({
    where: { celulaId: celula.id, membroId: celula.liderMemberId, ativo: true }
  });

  if (!existente) {
    await CelulaMembroVinculo.create({
      celulaId: celula.id,
      membroId: celula.liderMemberId,
      papel: 'lider',
      dataEntrada: todayDateOnly(),
      origem: 'lideranca'
    });
  } else if (existente.papel !== 'lider') {
    await existente.update({ papel: 'lider' });
  }
}

// Vincula membro à célula ao consolidar apelo de encaminhamento_celula
async function vincularMembroPorApelo({ membroId, celulaId, apeloId }) {
  if (!membroId || !celulaId) return;

  const existente = await CelulaMembroVinculo.findOne({
    where: { celulaId, membroId, ativo: true }
  });

  if (!existente) {
    await CelulaMembroVinculo.create({
      celulaId,
      membroId,
      papel: 'membro',
      dataEntrada: todayDateOnly(),
      origem: 'apelo',
      apeloId: apeloId || null
    });
  }

  // Atualiza celulaId do membro também
  await Member.update({ celulaId }, { where: { id: membroId } });

  // Promove pré-cadastros com o mesmo apeloId, se houver
  if (apeloId) {
    await PreCadastroPresenca.update(
      { promovidoEmMembroId: membroId, promovidoEm: new Date() },
      { where: { apeloId, promovidoEmMembroId: null } }
    );
  }
}

// Registra presença de uma reunião (checklist completo)
async function registrarPresenca(reuniaoId, presencas, encerradaPorId) {
  const reuniao = await CelulaReuniao.findByPk(reuniaoId);
  if (!reuniao) throw new Error('Reunião não encontrada');
  if (reuniao.status === 'cancelada') throw new Error('Reunião cancelada');
  if (reuniao.status === 'encerrada') throw new Error('Reunião já encerrada');

  const agora = now();

  for (const item of presencas) {
    if (item.membroId) {
      const existente = await CelulaPresenca.findOne({ where: { reuniaoId, membroId: item.membroId } });
      if (existente) {
        await existente.update({ presente: item.presente, registradoEm: agora });
      } else {
        await CelulaPresenca.create({
          reuniaoId, membroId: item.membroId, preCadastroId: null, presente: item.presente, registradoEm: agora
        });
      }

      if (item.presente) {
        await _calcularEGravarPontos(item.membroId, reuniaoId);
      }
    } else if (item.preCadastroId) {
      const existente = await CelulaPresenca.findOne({ where: { reuniaoId, preCadastroId: item.preCadastroId } });
      if (existente) {
        await existente.update({ presente: item.presente, registradoEm: agora });
      } else {
        await CelulaPresenca.create({
          reuniaoId, preCadastroId: item.preCadastroId, membroId: null, presente: item.presente, registradoEm: agora
        });
      }
    }
  }

  await reuniao.update({ status: 'encerrada', encerradaPorId });
}

// Calcula pontos com bônus por sequência e grava
async function _calcularEGravarPontos(membroId, reuniaoId) {
  const sequencia = await _calcularSequencia(membroId, reuniaoId);

  let pontosBonus = 0;
  let motivoBonus = null;

  if (sequencia >= 12) { pontosBonus = 15; motivoBonus = 'Trimestre completo (12 semanas)'; } else if (sequencia >= 4) { pontosBonus = 5; motivoBonus = '4 semanas seguidas'; }

  const total = 10 + pontosBonus;

  const pontoExistente = await CelulaPresencaPonto.findOne({ where: { membroId, reuniaoId } });
  if (pontoExistente) {
    await pontoExistente.update({
      pontosBase: 10, pontosBonus, total, motivoBonus
    });
  } else {
    await CelulaPresencaPonto.create({
      membroId, reuniaoId, pontosBase: 10, pontosBonus, total, motivoBonus
    });
  }
}

// Conta quantas presenças consecutivas o membro tem até esta reunião
async function _calcularSequencia(membroId, reuniaoId) {
  const reuniaoAtual = await CelulaReuniao.findByPk(reuniaoId, { attributes: ['data', 'celulaId'] });
  if (!reuniaoAtual) return 1;

  const anteriores = await CelulaReuniao.findAll({
    where: {
      celulaId: reuniaoAtual.celulaId,
      status: 'encerrada',
      data: { [Op.lt]: reuniaoAtual.data }
    },
    order: [['data', 'DESC']],
    limit: 15,
    include: [{
      model: CelulaPresenca,
      as: 'presencas',
      where: { membroId, presente: true },
      required: false,
      attributes: ['presente']
    }]
  });

  let sequencia = 1;
  for (const r of anteriores) {
    if (r.presencas && r.presencas.length > 0) sequencia += 1;
    else break;
  }
  return sequencia;
}

// Adiciona presença avulsa (pessoa não cadastrada)
async function adicionarPresencaAvulsa(reuniaoId, {
  nome, telefone, whatsapp, tipo
}) {
  const reuniao = await CelulaReuniao.findByPk(reuniaoId);
  if (!reuniao) throw new Error('Reunião não encontrada');

  const preCadastro = await PreCadastroPresenca.create({
    celulaId: reuniao.celulaId,
    nome,
    telefone: telefone || null,
    whatsapp: whatsapp || null,
    tipo: tipo || 'visitante'
  });

  await CelulaPresenca.create({
    reuniaoId,
    preCadastroId: preCadastro.id,
    presente: true,
    registradoEm: now()
  });

  return preCadastro;
}

// Retorna estatísticas de presença do membro na célula
async function estatisticasMembro(membroId, celulaId) {
  const vinculo = await CelulaMembroVinculo.findOne({
    where: { membroId, celulaId, ativo: true },
    attributes: ['dataEntrada']
  });

  if (!vinculo) return null;

  const reunioes = await CelulaReuniao.findAll({
    where: {
      celulaId,
      status: 'encerrada',
      data: { [Op.gte]: vinculo.dataEntrada }
    },
    include: [{
      model: CelulaPresenca,
      as: 'presencas',
      where: { membroId },
      required: false,
      attributes: ['presente', 'registradoEm']
    }],
    order: [['data', 'DESC']]
  });

  const total = reunioes.length;
  const presentes = reunioes.filter(r => r.presencas?.[0]?.presente === true).length;
  const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

  let sequenciaAtual = 0;
  for (const r of reunioes) {
    if (r.presencas?.[0]?.presente === true) sequenciaAtual += 1;
    else break;
  }

  const pontos = await CelulaPresencaPonto.findAll({
    where: { membroId },
    include: [{
      model: CelulaReuniao, as: 'reuniao', where: { celulaId }, attributes: []
    }],
    attributes: ['total']
  });
  const totalPontos = pontos.reduce((acc, p) => acc + (p.total || 0), 0);

  const ultimas = reunioes.slice(0, 8).map(r => ({
    data: r.data,
    presente: r.presencas?.[0]?.presente ?? null
  }));

  return {
    dataEntrada: vinculo.dataEntrada,
    totalReunioes: total,
    totalPresentes: presentes,
    percentualPresenca: percentual,
    sequenciaAtual,
    totalPontos,
    ultimas
  };
}

// Transfere membro de uma célula para outra e registra atividade com histórico
async function transferirMembro(membroId, origemCelulaId, destinoCelulaId, motivo) {
  if (!membroId || !origemCelulaId || !destinoCelulaId) {
    throw new Error('membroId, origemCelulaId e destinoCelulaId são obrigatórios');
  }
  if (origemCelulaId === destinoCelulaId) {
    throw new Error('A célula de origem e destino não podem ser a mesma');
  }

  const [celulaOrigem, celulaDestino] = await Promise.all([
    Celula.findByPk(origemCelulaId, {
      attributes: ['id', 'celula', 'lider'],
      include: [{ model: Member, as: 'liderMemberRef', attributes: ['id', 'fullName'] }]
    }),
    Celula.findByPk(destinoCelulaId, {
      attributes: ['id', 'celula', 'lider'],
      include: [{ model: Member, as: 'liderMemberRef', attributes: ['id', 'fullName'] }]
    })
  ]);

  if (!celulaDestino) throw new Error('Célula de destino não encontrada');

  const vinculoOrigem = await CelulaMembroVinculo.findOne({
    where: { membroId, celulaId: origemCelulaId, ativo: true }
  });
  if (!vinculoOrigem) throw new Error('Membro não está vinculado à célula de origem');

  const hoje = todayDateOnly();
  const nomeDestino = celulaDestino.celula;
  const descricaoTransf = motivo
    ? `Transferido para "${nomeDestino}" em ${hoje}. Motivo: ${motivo}`
    : `Transferido para "${nomeDestino}" em ${hoje}`;

  await vinculoOrigem.update({
    ativo: false,
    dataSaida: hoje,
    observacao: vinculoOrigem.observacao
      ? `${vinculoOrigem.observacao}\n${descricaoTransf}`
      : descricaoTransf
  });

  const papelDestino = vinculoOrigem.papel === 'lider' ? 'membro' : vinculoOrigem.papel;

  const vinculoDestinoExistente = await CelulaMembroVinculo.findOne({
    where: { membroId, celulaId: destinoCelulaId, ativo: true }
  });

  if (!vinculoDestinoExistente) {
    await CelulaMembroVinculo.create({
      celulaId: destinoCelulaId,
      membroId,
      papel: papelDestino,
      dataEntrada: hoje,
      origem: 'transferencia',
      observacao: motivo || null
    });
  }

  await Member.update({ celulaId: destinoCelulaId }, { where: { id: membroId } });

  // Registra atividade com o histórico completo da transferência
  const liderOrigemNome = celulaOrigem?.liderMemberRef?.fullName || celulaOrigem?.lider || null;
  const liderDestinoNome = celulaDestino?.liderMemberRef?.fullName || celulaDestino?.lider || null;

  const activityTypeRef = await MemberActivityType.findOne({
    where: { code: 'TRANSFERENCIA_CELULA' },
    attributes: ['defaultPoints']
  });

  await MemberActivity.create({
    memberId: membroId,
    activityType: 'TRANSFERENCIA_CELULA',
    activityDate: now(),
    points: activityTypeRef?.defaultPoints || 0,
    celulaId: destinoCelulaId,
    metadata: {
      celulaOrigem: {
        id: origemCelulaId,
        nome: celulaOrigem?.celula || null,
        lider: liderOrigemNome
      },
      celulaDestino: {
        id: destinoCelulaId,
        nome: celulaDestino?.celula || null,
        lider: liderDestinoNome
      },
      motivo: motivo || null,
      data: hoje
    }
  });
}

module.exports = {
  sugerirReunioes,
  criarReunioesDatas,
  excluirReunioesAgendadas,
  excluirReuniao,
  gerarReunioesParaCelula,
  gerarReunioesTodasCelulas,
  abrirReunioesDodia,
  vincularLiderComoCelulaMembro,
  vincularMembroPorApelo,
  registrarPresenca,
  adicionarPresencaAvulsa,
  estatisticasMembro,
  transferirMembro
};
