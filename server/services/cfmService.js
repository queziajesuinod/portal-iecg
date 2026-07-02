const { Op } = require('sequelize');
const {
  CfmEscola, CfmModulo, CfmMateria, CfmTurma, CfmTurmaMateria,
  CfmInscricao, CfmNota, CfmPresenca, CfmAula, CfmAulaPresenca,
  MemberActivity, MemberMilestone, MemberActivityType, Member, Campus,
  CfmMensalidade,
  Celula, CelulaMembroVinculo, MemberCargo,
  Ministerio,
  sequelize,
} = require('../models');

// ─── ESCOLAS ───────────────────────────────────────────────────────────────

async function listEscolas() {
  return CfmEscola.findAll({
    order: [['nome', 'ASC']],
    include: [
      {
        model: CfmModulo,
        as: 'modulos',
        required: false,
        where: { ativo: true },
        order: [['ordem', 'ASC']],
        include: [{
          model: CfmMateria,
          as: 'materias',
          required: false,
          where: { ativo: true },
          order: [['ordem', 'ASC']],
        }],
      },
      {
        model: CfmMateria,
        as: 'materias',
        required: false,
        where: { ativo: true, moduloId: null },
        order: [['ordem', 'ASC']],
      },
    ],
  });
}

async function createEscola({ nome, descricao, temModulos }) {
  return CfmEscola.create({ nome, descricao, temModulos: !!temModulos });
}

async function updateEscola(id, {
  nome, descricao, temModulos, ativo
}) {
  const escola = await CfmEscola.findByPk(id);
  if (!escola) throw new Error('Escola não encontrada');
  if (nome !== undefined) escola.nome = nome;
  if (descricao !== undefined) escola.descricao = descricao;
  if (temModulos !== undefined) escola.temModulos = temModulos;
  if (ativo !== undefined) escola.ativo = ativo;
  await escola.save();
  return escola;
}

async function deleteEscola(id) {
  const escola = await CfmEscola.findByPk(id);
  if (!escola) throw new Error('Escola não encontrada');
  await escola.destroy();
}

// ─── MÓDULOS ───────────────────────────────────────────────────────────────

async function listModulos(escolaId) {
  return CfmModulo.findAll({
    where: { escolaId },
    order: [['ordem', 'ASC']],
    include: [{
      model: CfmMateria,
      as: 'materias',
      required: false,
      where: { ativo: true },
      order: [['ordem', 'ASC']],
    }],
  });
}

async function createModulo(escolaId, { nome, descricao, ordem }) {
  return CfmModulo.create({
    escolaId, nome, descricao, ordem: ordem || 0
  });
}

async function updateModulo(id, {
  nome, descricao, ordem, ativo
}) {
  const modulo = await CfmModulo.findByPk(id);
  if (!modulo) throw new Error('Módulo não encontrado');
  if (nome !== undefined) modulo.nome = nome;
  if (descricao !== undefined) modulo.descricao = descricao;
  if (ordem !== undefined) modulo.ordem = ordem;
  if (ativo !== undefined) modulo.ativo = ativo;
  await modulo.save();
  return modulo;
}

async function deleteModulo(id) {
  const modulo = await CfmModulo.findByPk(id);
  if (!modulo) throw new Error('Módulo não encontrado');
  await modulo.destroy();
}

// ─── MATÉRIAS ──────────────────────────────────────────────────────────────

async function listMaterias({ escolaId, moduloId }) {
  const where = { escolaId };
  if (moduloId !== undefined) where.moduloId = moduloId || null;
  return CfmMateria.findAll({ where, order: [['ordem', 'ASC']] });
}

async function createMateria({
  escolaId, moduloId, nome, descricao, ordem
}) {
  return CfmMateria.create({
    escolaId, moduloId: moduloId || null, nome, descricao, ordem: ordem || 0
  });
}

async function updateMateria(id, {
  nome, descricao, ordem, ativo
}) {
  const materia = await CfmMateria.findByPk(id);
  if (!materia) throw new Error('Matéria não encontrada');
  if (nome !== undefined) materia.nome = nome;
  if (descricao !== undefined) materia.descricao = descricao;
  if (ordem !== undefined) materia.ordem = ordem;
  if (ativo !== undefined) materia.ativo = ativo;
  await materia.save();
  return materia;
}

async function deleteMateria(id) {
  const materia = await CfmMateria.findByPk(id);
  if (!materia) throw new Error('Matéria não encontrada');
  await materia.destroy();
}

// ─── TURMAS ────────────────────────────────────────────────────────────────

async function listTurmas({
  escolaId, moduloId, status, campusId, diaSemana
} = {}) {
  const where = {};
  if (escolaId) where.escolaId = escolaId;
  if (moduloId) where.moduloId = moduloId;
  if (status) where.status = status;
  if (campusId) where.campusId = campusId;
  if (diaSemana !== undefined && diaSemana !== '' && diaSemana !== null) where.diaSemana = Number(diaSemana);

  return CfmTurma.findAll({
    where,
    order: [['periodoInicio', 'DESC']],
    include: [
      { model: CfmEscola, as: 'escola', attributes: ['id', 'nome', 'temModulos'] },
      {
        model: CfmModulo, as: 'modulo', attributes: ['id', 'nome'], required: false
      },
      {
        model: Campus, as: 'campus', attributes: ['id', 'nome'], required: false
      },
    ],
  });
}

async function getTurma(id) {
  const turma = await CfmTurma.findByPk(id, {
    include: [
      { model: CfmEscola, as: 'escola', attributes: ['id', 'nome', 'temModulos'] },
      {
        model: CfmModulo, as: 'modulo', attributes: ['id', 'nome'], required: false
      },
      {
        model: Campus, as: 'campus', attributes: ['id', 'nome'], required: false
      },
      {
        model: CfmTurmaMateria,
        as: 'turmaMaterias',
        include: [
          { model: CfmMateria, as: 'materia', attributes: ['id', 'nome', 'ordem'] },
          {
            model: Member, as: 'mestre', attributes: ['id', 'fullName', 'preferredName', 'photoUrl'], required: false
          },
        ],
        order: [['ordem', 'ASC']],
      },
    ],
  });
  if (!turma) throw new Error('Turma não encontrada');
  return turma;
}

async function createTurma(data) {
  const {
    escolaId, moduloId, numeracao, campusId, periodoInicio, periodoFim,
    vagasMax, diaSemana, activityTypeCode, marcoConclussaoCode, observacoes,
  } = data;
  return CfmTurma.create({
    escolaId,
    moduloId: moduloId || null,
    numeracao,
    campusId: campusId || null,
    periodoInicio,
    periodoFim,
    vagasMax: vagasMax || null,
    diaSemana: diaSemana !== undefined && diaSemana !== null && diaSemana !== '' ? Number(diaSemana) : null,
    activityTypeCode: activityTypeCode || null,
    marcoConclussaoCode: marcoConclussaoCode || null,
    observacoes: observacoes || null,
  });
}

async function updateTurma(id, data) {
  const turma = await CfmTurma.findByPk(id);
  if (!turma) throw new Error('Turma não encontrada');
  const nullableStrings = ['campusId', 'periodoInicio', 'periodoFim', 'vagasMax', 'status', 'activityTypeCode', 'marcoConclussaoCode', 'observacoes', 'moduloId', 'numeracao'];
  nullableStrings.forEach((f) => { if (data[f] !== undefined) turma[f] = data[f] || null; });
  if (data.numeracao !== undefined) turma.numeracao = data.numeracao;
  if (data.periodoInicio !== undefined) turma.periodoInicio = data.periodoInicio;
  if (data.periodoFim !== undefined) turma.periodoFim = data.periodoFim;
  // diaSemana: 0 (Domingo) é falsy — tratar explicitamente
  if (data.diaSemana !== undefined) {
    turma.diaSemana = (data.diaSemana !== null && data.diaSemana !== '') ? Number(data.diaSemana) : null;
  }
  await turma.save();
  return getTurma(id);
}

async function previewDeleteTurma(id) {
  const turma = await CfmTurma.findByPk(id);
  if (!turma) throw new Error('Turma não encontrada');

  const inscricoes = await CfmInscricao.findAll({ where: { turmaId: id }, attributes: ['id', 'marcoMilestoneId'] });
  const inscricaoIds = inscricoes.map(i => i.id);
  const marcosCount = inscricoes.filter(i => i.marcoMilestoneId).length;
  const aulasCount = await CfmAula.count({ where: { turmaId: id } });
  const mensalidadesCount = inscricaoIds.length
    ? await CfmMensalidade.count({ where: { inscricaoId: { [Op.in]: inscricaoIds } } })
    : 0;
  const notasCount = inscricaoIds.length
    ? await CfmNota.count({ where: { inscricaoId: { [Op.in]: inscricaoIds } } })
    : 0;

  return {
    inscricoes: inscricoes.length,
    aulas: aulasCount,
    mensalidades: mensalidadesCount,
    notas: notasCount,
    marcosRemovidos: marcosCount,
  };
}

async function deleteTurma(id) {
  const turma = await CfmTurma.findByPk(id);
  if (!turma) throw new Error('Turma não encontrada');

  const inscricoes = await CfmInscricao.findAll({ where: { turmaId: id }, attributes: ['id', 'marcoMilestoneId'] });
  const inscricaoIds = inscricoes.map(i => i.id);

  // Remove marcos de membro vinculados a inscrições desta turma
  const marcoIds = inscricoes.map(i => i.marcoMilestoneId).filter(Boolean);
  if (marcoIds.length) {
    await MemberMilestone.destroy({ where: { id: { [Op.in]: marcoIds } } });
  }

  if (inscricaoIds.length) {
    await CfmMensalidade.destroy({ where: { inscricaoId: { [Op.in]: inscricaoIds } } });
    await CfmNota.destroy({ where: { inscricaoId: { [Op.in]: inscricaoIds } } });
    await CfmPresenca.destroy({ where: { inscricaoId: { [Op.in]: inscricaoIds } } });
  }

  // Remove presenças de aulas + aulas
  const aulas = await CfmAula.findAll({ where: { turmaId: id }, attributes: ['id'] });
  const aulaIds = aulas.map(a => a.id);
  if (aulaIds.length) {
    await CfmAulaPresenca.destroy({ where: { aulaId: { [Op.in]: aulaIds } } });
    await CfmAula.destroy({ where: { turmaId: id } });
  }

  if (inscricaoIds.length) {
    await CfmInscricao.destroy({ where: { turmaId: id } });
  }

  await CfmTurmaMateria.destroy({ where: { turmaId: id } });
  await turma.destroy();
}

// ─── TURMA MATÉRIAS ────────────────────────────────────────────────────────

async function getTurmaMaterias(turmaId) {
  return CfmTurmaMateria.findAll({
    where: { turmaId },
    order: [['ordem', 'ASC']],
    include: [
      { model: CfmMateria, as: 'materia', attributes: ['id', 'nome', 'ordem'] },
      {
        model: Member, as: 'mestre', attributes: ['id', 'fullName', 'preferredName', 'photoUrl'], required: false
      },
    ],
  });
}

async function syncTurmaMaterias(turmaId, materias = []) {
  // materias: [{materiaId, mestreId?, periodoInicio?, periodoFim?, ordem?}]
  const turma = await CfmTurma.findByPk(turmaId);
  if (!turma) throw new Error('Turma não encontrada');

  const materiaIds = materias.map((m) => m.materiaId);

  // Remove as que não vieram mais na lista
  await CfmTurmaMateria.destroy({ where: { turmaId, materiaId: { [Op.notIn]: materiaIds } } });

  // Upsert cada matéria
  for (const item of materias) {
    const existing = await CfmTurmaMateria.findOne({ where: { turmaId, materiaId: item.materiaId } });
    if (existing) {
      await existing.update({
        mestreId: item.mestreId || null,
        periodoInicio: item.periodoInicio || null,
        periodoFim: item.periodoFim || null,
        ordem: item.ordem ?? existing.ordem,
      });
    } else {
      await CfmTurmaMateria.create({
        turmaId,
        materiaId: item.materiaId,
        mestreId: item.mestreId || null,
        periodoInicio: item.periodoInicio || null,
        periodoFim: item.periodoFim || null,
        ordem: item.ordem ?? 0,
      });
    }
  }

  return getTurmaMaterias(turmaId);
}

// ─── INSCRIÇÕES ────────────────────────────────────────────────────────────

async function _contarAtivos(turmaId) {
  return CfmInscricao.count({
    where: { turmaId, status: { [Op.in]: ['PENDENTE', 'ATIVO'] } },
  });
}

async function listInscricoes(turmaId) {
  const rows = await CfmInscricao.findAll({
    where: { turmaId },
    include: [
      {
        model: Member,
        as: 'membro',
        attributes: ['id', 'fullName', 'preferredName', 'photoUrl', 'email', 'phone', 'cpf', 'birthDate'],
        required: false,
      },
    ],
  });

  // Enriquecer dadosFormulario com nomes resolvidos (para inscrições antigas sem os campos de nome)
  const rowsComDados = rows.filter(r => r.dadosFormulario);
  if (rowsComDados.length) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // UUID geracao = old records using Ministerio id; string geracao = new records using rede string
    const geracaoIds = [...new Set(rowsComDados
      .filter(r => r.dadosFormulario.geracao && !r.dadosFormulario.geracaoNome && UUID_RE.test(r.dadosFormulario.geracao))
      .map(r => r.dadosFormulario.geracao)
    )];
    const liderIds = [...new Set(rowsComDados.filter(r => r.dadosFormulario.liderCelulaId && !r.dadosFormulario.liderNome).map(r => r.dadosFormulario.liderCelulaId))];
    const pastorIds = [...new Set(rowsComDados.filter(r => r.dadosFormulario.pastorId && !r.dadosFormulario.pastorNome).map(r => r.dadosFormulario.pastorId))];
    const celulaIds = [...new Set(rowsComDados.filter(r => r.dadosFormulario.liderCelulaId && !r.dadosFormulario.liderCelulaNome && r.dadosFormulario.liderCelulaId).map(r => r.dadosFormulario.liderCelulaId))];

    const [ministeriosMap, membrosMap] = await Promise.all([
      geracaoIds.length
        ? Ministerio.findAll({ where: { id: { [Op.in]: geracaoIds } }, attributes: ['id', 'nome'] })
          .then(list => Object.fromEntries(list.map(m => [m.id, m.nome])))
        : {},
      (liderIds.length || pastorIds.length)
        ? Member.findAll({ where: { id: { [Op.in]: [...new Set([...liderIds, ...pastorIds])] } }, attributes: ['id', 'fullName', 'preferredName'] })
          .then(list => Object.fromEntries(list.map(m => [m.id, m.preferredName || m.fullName])))
        : {},
    ]);

    // Para liderCelulaNome precisamos do celulaId, mas neste contexto só temos o membroId do líder
    // Buscar célula via vinculo
    const celulaNomeMap = {};
    if (celulaIds.length) {
      const vinculos = await CelulaMembroVinculo.findAll({
        where: { membroId: { [Op.in]: celulaIds }, papel: 'lider', ativo: true },
        attributes: ['membroId', 'celulaId'],
      });
      if (vinculos.length) {
        const cIds = [...new Set(vinculos.map(v => v.celulaId))];
        const cels = await Celula.findAll({ where: { id: { [Op.in]: cIds } }, attributes: ['id', 'celula'] });
        const celMap = Object.fromEntries(cels.map(c => [c.id, c.celula]));
        vinculos.forEach(v => { celulaNomeMap[v.membroId] = celMap[v.celulaId] || null; });
      }
    }

    rows.forEach(r => {
      if (!r.dadosFormulario) return;
      const df = r.dadosFormulario;
      const patch = {};
      if (df.geracao && !df.geracaoNome) {
        if (UUID_RE.test(df.geracao)) { if (ministeriosMap[df.geracao]) patch.geracaoNome = ministeriosMap[df.geracao]; } else patch.geracaoNome = df.geracao; // rede string IS the display name
      }
      if (df.liderCelulaId && !df.liderNome && membrosMap[df.liderCelulaId]) patch.liderNome = membrosMap[df.liderCelulaId];
      if (df.liderCelulaId && !df.liderCelulaNome && celulaNomeMap[df.liderCelulaId]) patch.liderCelulaNome = celulaNomeMap[df.liderCelulaId];
      if (df.pastorId && !df.pastorNome && membrosMap[df.pastorId]) patch.pastorNome = membrosMap[df.pastorId];
      if (Object.keys(patch).length) r.dadosFormulario = { ...df, ...patch };
    });
  }

  // Ordenar alfabeticamente pelo nome (membro ou nomeNaoMembro)
  rows.sort((a, b) => {
    const na = (a.membro ? (a.membro.preferredName || a.membro.fullName) : a.nomeNaoMembro) || '';
    const nb = (b.membro ? (b.membro.preferredName || b.membro.fullName) : b.nomeNaoMembro) || '';
    return na.localeCompare(nb, 'pt-BR');
  });
  return rows;
}

async function createInscricao({
  turmaId, memberId, nomeNaoMembro, valorMatricula, observacoes
}) {
  const turma = await CfmTurma.findByPk(turmaId);
  if (!turma) throw new Error('Turma não encontrada');
  if (turma.status === 'ENCERRADA' || turma.status === 'CANCELADA') {
    throw new Error('Turma não está disponível para inscrições');
  }

  // Evitar duplicata de membro na mesma turma
  if (memberId) {
    const dup = await CfmInscricao.findOne({
      where: { turmaId, memberId, status: { [Op.notIn]: ['CANCELADO', 'DESISTENTE'] } },
    });
    if (dup) throw new Error('Membro já está inscrito nesta turma');
  }

  // Verificar vagas
  let status = 'PENDENTE';
  if (turma.vagasMax) {
    const ativos = await _contarAtivos(turmaId);
    if (ativos >= turma.vagasMax) status = 'LISTA_ESPERA';
  }

  return CfmInscricao.create({
    turmaId,
    memberId: memberId || null,
    nomeNaoMembro: !memberId ? nomeNaoMembro : null,
    valorMatricula: valorMatricula || null,
    observacoes: observacoes || null,
    status,
  });
}

async function confirmarPagamento(inscricaoId, { valorMatricula, dataPagamento } = {}) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId, {
    include: [{ model: CfmTurma, as: 'turma' }],
  });
  if (!inscricao) throw new Error('Inscrição não encontrada');
  if (inscricao.pagamentoMatricula) throw new Error('Pagamento já confirmado');

  inscricao.pagamentoMatricula = true;
  inscricao.dataPagamento = dataPagamento || hojeLocal();
  if (valorMatricula !== undefined) inscricao.valorMatricula = valorMatricula;
  inscricao.status = 'ATIVO';

  // Criar MemberActivity se há membro e tipo configurado
  if (inscricao.memberId && inscricao.turma && inscricao.turma.activityTypeCode) {
    const activity = await MemberActivity.create({
      memberId: inscricao.memberId,
      activityType: inscricao.turma.activityTypeCode,
      activityDate: inscricao.dataPagamento,
      metadata: {
        turmaId: inscricao.turmaId,
        numeracao: inscricao.turma.numeracao,
        origem: 'CFM',
      },
    });
    inscricao.memberActivityId = activity.id;
  }

  await inscricao.save();

  // Gerar tokenQr se ainda não tem e disparar envio do cartão (sem bloquear resposta)
  if (!inscricao.tokenQr) {
    inscricao.tokenQr = require('crypto').randomUUID();
    await inscricao.save();
  }
  setImmediate(() => {
    require('./cfmCartaoService').enviarCartaoAluno(inscricao.id)
      .then(r => console.log(`[CFM] Cartão enviado para ${r.nome}: email=${r.email.ok} wapp=${r.whatsapp.ok}`))
      .catch(e => console.error('[CFM] Erro envio cartão:', e.message));
  });

  return inscricao;
}

async function marcarDesistencia(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId);
  if (!inscricao) throw new Error('Inscrição não encontrada');
  if (['CONCLUIDO', 'REPROVADO'].includes(inscricao.status)) {
    throw new Error('Inscrição já encerrada');
  }
  inscricao.status = 'DESISTENTE';
  await inscricao.save();

  // Se havia uma vaga em lista de espera, promover o primeiro
  await _promoverListaEspera(inscricao.turmaId);

  return inscricao;
}

async function cancelarInscricao(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId);
  if (!inscricao) throw new Error('Inscrição não encontrada');
  inscricao.status = 'CANCELADO';
  await inscricao.save();
  await _promoverListaEspera(inscricao.turmaId);
  return inscricao;
}

async function _promoverListaEspera(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId);
  if (!turma || !turma.vagasMax) return;
  // Só promove lista de espera enquanto a turma estiver aberta para inscrições
  if (turma.status !== 'ABERTA') return;
  const ativos = await _contarAtivos(turmaId);
  if (ativos >= turma.vagasMax) return;
  const proximo = await CfmInscricao.findOne({
    where: { turmaId, status: 'LISTA_ESPERA' },
    order: [['createdAt', 'ASC']],
  });
  if (proximo) {
    proximo.status = 'PENDENTE';
    await proximo.save();
  }
}

async function previewConclusao(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId, {
    include: [{
      model: CfmTurma,
      as: 'turma',
      include: [{
        model: CfmTurmaMateria,
        as: 'turmaMaterias',
        include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
      }],
    }],
  });
  if (!inscricao) throw new Error('Inscrição não encontrada');

  const turmaMaterias = inscricao.turma?.turmaMaterias || [];
  const notas = await CfmNota.findAll({ where: { inscricaoId } });
  const notaMap = {};
  notas.forEach(n => { notaMap[n.turmaMateriaId] = n; });

  const materias = turmaMaterias.map(tm => {
    const nota = notaMap[tm.id];
    const avaliada = nota != null && nota.aprovado !== null && nota.aprovado !== undefined;
    return {
      nome: tm.materia?.nome || '?',
      nota: nota?.nota ?? null,
      aprovado: avaliada ? nota.aprovado : null,
      avaliada,
    };
  });

  const podeConcluir = materias.length > 0 && materias.every(m => m.avaliada);
  const resultadoGeral = podeConcluir
    ? (materias.every(m => m.aprovado === true) ? 'CONCLUIDO' : 'REPROVADO')
    : null;

  return { podeConcluir, resultadoGeral, materias };
}

async function concluirInscricao(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId, {
    include: [{
      model: CfmTurma,
      as: 'turma',
      include: [{
        model: CfmTurmaMateria,
        as: 'turmaMaterias',
        include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
      }],
    }],
  });
  if (!inscricao) throw new Error('Inscrição não encontrada');
  if (!['ATIVO', 'PENDENTE'].includes(inscricao.status)) {
    throw new Error('Inscrição não pode ser concluída neste status');
  }

  const turmaMaterias = inscricao.turma?.turmaMaterias || [];
  if (!turmaMaterias.length) {
    throw new Error('Configure as matérias da turma antes de concluir uma inscrição');
  }

  // Verifica notas de todas as matérias
  const notas = await CfmNota.findAll({ where: { inscricaoId } });
  const notaMap = {};
  notas.forEach(n => { notaMap[n.turmaMateriaId] = n; });

  const naoAvaliadas = turmaMaterias.filter(tm => !notaMap[tm.id] || notaMap[tm.id].aprovado === null || notaMap[tm.id].aprovado === undefined);
  if (naoAvaliadas.length > 0) {
    const nomes = naoAvaliadas.map(tm => tm.materia?.nome || 'Matéria desconhecida').join(', ');
    throw new Error(`Registre o resultado (aprovado/reprovado) de todas as matérias antes de concluir. Pendente: ${nomes}`);
  }

  // Deriva resultado: aprovado só se TODAS as matérias aprovadas
  const aprovado = turmaMaterias.every(tm => notaMap[tm.id]?.aprovado === true);
  inscricao.aprovado = aprovado;
  inscricao.status = aprovado ? 'CONCLUIDO' : 'REPROVADO';

  if (!aprovado) {
    const reprovadas = turmaMaterias
      .filter(tm => notaMap[tm.id]?.aprovado !== true)
      .map(tm => tm.materia?.nome || '?')
      .join(', ');
    inscricao.motivoReprovacao = `Reprovado em: ${reprovadas}`;
  } else {
    inscricao.motivoReprovacao = null;
  }

  // Marco de conclusão apenas se aprovado, membro vinculado e tipo configurado
  if (aprovado && inscricao.memberId && inscricao.turma?.marcoConclussaoCode) {
    const tipoMarco = await MemberActivityType.findOne({
      where: { code: inscricao.turma.marcoConclussaoCode },
    });
    if (!tipoMarco || String(tipoMarco.category || '').trim().toUpperCase() !== 'MARCOS') {
      throw new Error(
        `O tipo "${inscricao.turma.marcoConclussaoCode}" não pertence à categoria MARCOS. Configure um tipo de marco válido na turma.`
      );
    }
    const marco = await MemberMilestone.create({
      memberId: inscricao.memberId,
      milestoneType: inscricao.turma.marcoConclussaoCode,
      achievedDate: hojeLocal(),
      description: `Conclusão CFM — Turma ${inscricao.turma.numeracao || ''}`.trim(),
    });
    inscricao.marcoMilestoneId = marco.id;
  }

  await inscricao.save();
  return inscricao;
}

async function previewConclusaoTurma(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId, {
    include: [{
      model: CfmTurmaMateria,
      as: 'turmaMaterias',
      include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
    }],
  });
  if (!turma) throw new Error('Turma não encontrada');

  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: 'ATIVO' },
    include: [{ model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName'] }],
  });

  const turmaMaterias = turma.turmaMaterias || [];

  const alunos = await Promise.all(inscricoes.map(async (insc) => {
    const nome = insc.membro ? (insc.membro.preferredName || insc.membro.fullName) : insc.nomeNaoMembro;
    const notas = await CfmNota.findAll({ where: { inscricaoId: insc.id } });
    const notaMap = {};
    notas.forEach(n => { notaMap[n.turmaMateriaId] = n; });

    const naoAvaliadas = turmaMaterias.filter(
      tm => !notaMap[tm.id] || notaMap[tm.id].aprovado === null || notaMap[tm.id].aprovado === undefined
    );
    const podeConcluir = turmaMaterias.length > 0 && naoAvaliadas.length === 0;
    const resultadoGeral = podeConcluir
      ? (turmaMaterias.every(tm => notaMap[tm.id]?.aprovado === true) ? 'CONCLUIDO' : 'REPROVADO')
      : null;

    return {
      inscricaoId: insc.id,
      nome,
      podeConcluir,
      resultadoGeral,
      naoAvaliadas: naoAvaliadas.map(tm => tm.materia?.nome || '?'),
    };
  }));

  return {
    totalAtivos: inscricoes.length,
    podeConcluirCount: alunos.filter(a => a.podeConcluir).length,
    aprovadosCount: alunos.filter(a => a.resultadoGeral === 'CONCLUIDO').length,
    reprovadosCount: alunos.filter(a => a.resultadoGeral === 'REPROVADO').length,
    semNotasCount: alunos.filter(a => !a.podeConcluir).length,
    alunos,
  };
}

async function concluirTurma(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId, {
    include: [{
      model: CfmTurmaMateria,
      as: 'turmaMaterias',
      include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
    }],
  });
  if (!turma) throw new Error('Turma não encontrada');

  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: 'ATIVO' },
  });

  const turmaMaterias = turma.turmaMaterias || [];
  let concluidos = 0;
  let pulados = 0;

  for (const insc of inscricoes) {
    const notas = await CfmNota.findAll({ where: { inscricaoId: insc.id } });
    const notaMap = {};
    notas.forEach(n => { notaMap[n.turmaMateriaId] = n; });

    const naoAvaliadas = turmaMaterias.filter(
      tm => !notaMap[tm.id] || notaMap[tm.id].aprovado === null || notaMap[tm.id].aprovado === undefined
    );
    if (naoAvaliadas.length > 0) { pulados += 1; continue; }

    const aprovado = turmaMaterias.every(tm => notaMap[tm.id]?.aprovado === true);
    insc.aprovado = aprovado;
    insc.status = aprovado ? 'CONCLUIDO' : 'REPROVADO';
    insc.motivoReprovacao = aprovado ? null : `Reprovado em: ${turmaMaterias.filter(tm => notaMap[tm.id]?.aprovado !== true).map(tm => tm.materia?.nome || '?').join(', ')}`;

    if (aprovado && insc.memberId && turma.marcoConclussaoCode) {
      const tipoMarco = await MemberActivityType.findOne({ where: { code: turma.marcoConclussaoCode } });
      if (tipoMarco && String(tipoMarco.category || '').trim().toUpperCase() === 'MARCOS') {
        const marco = await MemberMilestone.create({
          memberId: insc.memberId,
          milestoneType: turma.marcoConclussaoCode,
          achievedDate: hojeLocal(),
          description: `Conclusão CFM — Turma ${turma.numeracao || ''}`.trim(),
        });
        insc.marcoMilestoneId = marco.id;
      }
    }

    await insc.save();
    concluidos += 1;
  }

  turma.status = 'ENCERRADA';
  await turma.save();

  return { concluidos, pulados };
}

async function reabrirInscricao(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId);
  if (!inscricao) throw new Error('Inscrição não encontrada');
  if (!['CONCLUIDO', 'REPROVADO'].includes(inscricao.status)) {
    throw new Error('Só é possível reabrir inscrições com status Concluído ou Reprovado');
  }

  // Remove o marco de conclusão se existir
  if (inscricao.marcoMilestoneId) {
    await MemberMilestone.destroy({ where: { id: inscricao.marcoMilestoneId } }).catch(() => {});
    inscricao.marcoMilestoneId = null;
  }

  inscricao.status = 'ATIVO';
  inscricao.aprovado = null;
  inscricao.motivoReprovacao = null;
  await inscricao.save();
  return inscricao;
}

// ─── PRESENÇA ──────────────────────────────────────────────────────────────

async function getPresencas({ turmaId, turmaMateriaId, data }) {
  const where = {};
  if (turmaMateriaId) where.turmaMateriaId = turmaMateriaId;

  // Filtrar só inscrições ativas da turma
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: { [Op.in]: ['ATIVO', 'PENDENTE'] } },
    attributes: ['id', 'memberId', 'nomeNaoMembro'],
    include: [{
      model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName'], required: false
    }],
    order: [[{ model: Member, as: 'membro' }, 'fullName', 'ASC']],
  });

  if (!inscricoes.length) return { inscricoes: [], presencas: [] };

  where.inscricaoId = { [Op.in]: inscricoes.map((i) => i.id) };
  if (data) where.data = data;

  const presencas = await CfmPresenca.findAll({ where });

  return { inscricoes, presencas };
}

async function salvarPresencas(registros = []) {
  // registros: [{inscricaoId, turmaMateriaId, data, presente, observacao?}]
  const results = [];
  for (const r of registros) {
    const [presenca] = await CfmPresenca.upsert({
      inscricaoId: r.inscricaoId,
      turmaMateriaId: r.turmaMateriaId,
      data: r.data,
      presente: !!r.presente,
      observacao: r.observacao || null,
    }, { returning: true });
    results.push(presenca);
  }
  return results;
}

// ─── NOTAS ─────────────────────────────────────────────────────────────────

async function getNotas(turmaId) {
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId },
    attributes: ['id', 'memberId', 'nomeNaoMembro', 'status', 'aprovado'],
    include: [{
      model: Member, as: 'membro', attributes: ['id', 'fullName'], required: false
    }],
  });

  inscricoes.sort((a, b) => {
    const na = (a.membro ? a.membro.fullName : a.nomeNaoMembro) || '';
    const nb = (b.membro ? b.membro.fullName : b.nomeNaoMembro) || '';
    return na.localeCompare(nb, 'pt-BR');
  });

  const inscricaoIds = inscricoes.map((i) => i.id);
  const notas = await CfmNota.findAll({
    where: { inscricaoId: { [Op.in]: inscricaoIds } },
    include: [{ model: CfmTurmaMateria, as: 'turmaMateria', include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }] }],
  });

  return { inscricoes, notas };
}

async function salvarNota({
  inscricaoId, turmaMateriaId, nota, aprovado, observacao
}) {
  const existing = await CfmNota.findOne({ where: { inscricaoId, turmaMateriaId } });
  const values = {
    nota: nota !== undefined && nota !== '' ? Number(nota) : null,
    aprovado: aprovado !== undefined ? aprovado : null,
    observacao: observacao || null,
  };
  if (existing) {
    await existing.update(values);
    return existing;
  }
  return CfmNota.create({ inscricaoId, turmaMateriaId, ...values });
}

async function salvarNotasBulk(notas = []) {
  // notas: [{inscricaoId, turmaMateriaId, nota, aprovado, observacao}]
  const results = [];
  for (const n of notas) {
    results.push(await salvarNota(n));
  }
  return results;
}

// ─── PAINEL ────────────────────────────────────────────────────────────────

async function getPainel(turmaId) {
  const turma = await getTurma(turmaId);
  const inscricoes = await listInscricoes(turmaId);
  const inscricaoIds = inscricoes.map((i) => i.id);

  // Presença calculada por matéria via CfmAulas + CfmAulaPresencas
  const aulasDaTurma = await CfmAula.findAll({
    where: { turmaId, turmaMateriaId: { [Op.ne]: null }, cancelada: false },
    attributes: ['id', 'turmaMateriaId'],
  });
  const aulaIds = aulasDaTurma.map(a => a.id);
  const aulaMatMap = {};
  aulasDaTurma.forEach(a => { aulaMatMap[a.id] = a.turmaMateriaId; });

  const aulaPresencas = (aulaIds.length && inscricaoIds.length)
    ? await CfmAulaPresenca.findAll({
      where: { aulaId: { [Op.in]: aulaIds }, inscricaoId: { [Op.in]: inscricaoIds } },
      attributes: ['aulaId', 'inscricaoId', 'presente'],
    })
    : [];

  const notas = inscricaoIds.length
    ? await CfmNota.findAll({ where: { inscricaoId: { [Op.in]: inscricaoIds } } })
    : [];

  // presencaMap por inscricaoId:turmaMateriaId
  const presencaMap = {};
  for (const p of aulaPresencas) {
    const tmId = aulaMatMap[p.aulaId];
    if (!tmId) continue;
    const key = `${p.inscricaoId}:${tmId}`;
    if (!presencaMap[key]) presencaMap[key] = { total: 0, presentes: 0 };
    presencaMap[key].total += 1;
    if (p.presente) presencaMap[key].presentes += 1;
  }

  const notaMap = {};
  for (const n of notas) {
    notaMap[`${n.inscricaoId}:${n.turmaMateriaId}`] = n;
  }

  inscricoes.sort((a, b) => {
    const na = (a.membro ? (a.membro.preferredName || a.membro.fullName) : a.nomeNaoMembro) || '';
    const nb = (b.membro ? (b.membro.preferredName || b.membro.fullName) : b.nomeNaoMembro) || '';
    return na.localeCompare(nb, 'pt-BR');
  });

  const alunos = inscricoes.map((insc) => {
    const materias = turma.turmaMaterias.map((tm) => {
      const pk = `${insc.id}:${tm.id}`;
      const pres = presencaMap[pk] || { total: 0, presentes: 0 };
      const nota = notaMap[pk] || null;
      return {
        turmaMateriaId: tm.id,
        materiaNome: tm.materia ? tm.materia.nome : null,
        totalAulas: pres.total,
        presentes: pres.presentes,
        percentualPresenca: pres.total > 0 ? Math.round((pres.presentes / pres.total) * 100) : null,
        nota: nota ? nota.nota : null,
        aprovadoMateria: nota ? nota.aprovado : null,
      };
    });

    return {
      inscricaoId: insc.id,
      memberId: insc.memberId,
      nome: insc.membro ? (insc.membro.preferredName || insc.membro.fullName) : insc.nomeNaoMembro,
      status: insc.status,
      pagamentoMatricula: insc.pagamentoMatricula,
      aprovado: insc.aprovado,
      materias,
    };
  });

  return { turma, alunos };
}

// ─── AULAS (listas de presença por data) ───────────────────────────────────

function _gerarDatasParaDiaSemana(periodoInicio, periodoFim, diaSemana) {
  const datas = [];
  const inicio = new Date(`${periodoInicio}T12:00:00`);
  const fim = new Date(`${periodoFim}T12:00:00`);
  const cur = new Date(inicio);
  // Avança até o primeiro dia da semana desejado
  while (cur.getDay() !== diaSemana) cur.setDate(cur.getDate() + 1);
  while (cur <= fim) {
    datas.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 7);
  }
  return datas;
}

async function listarAulas(turmaId) {
  const aulas = await CfmAula.findAll({
    where: { turmaId },
    include: [
      {
        model: CfmTurmaMateria,
        as: 'turmaMateria',
        required: false,
        include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
      },
      {
        model: CfmAulaPresenca,
        as: 'presencas',
        attributes: ['id', 'presente'],
      },
    ],
  });
  // Ordena por nome da matéria (alpha) depois por data
  aulas.sort((a, b) => {
    const mA = a.turmaMateria?.materia?.nome || '￿';
    const mB = b.turmaMateria?.materia?.nome || '￿';
    if (mA !== mB) return mA.localeCompare(mB, 'pt-BR');
    return (a.dataAula || '').localeCompare(b.dataAula || '');
  });
  return aulas;
}

async function gerarAulasAutomaticas(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId, {
    include: [{
      model: CfmTurmaMateria,
      as: 'turmaMaterias',
      include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
      order: [['ordem', 'ASC']],
    }],
  });
  if (!turma) throw new Error('Turma não encontrada');
  if (turma.diaSemana === null || turma.diaSemana === undefined) {
    throw new Error('Configure o dia da semana da turma antes de gerar aulas');
  }
  const turmaMaterias = turma.turmaMaterias || [];
  if (!turmaMaterias.length) {
    throw new Error('Adicione matérias à turma antes de gerar aulas');
  }

  let criadas = 0;
  for (const tm of turmaMaterias) {
    const inicio = tm.periodoInicio || turma.periodoInicio;
    const fim = tm.periodoFim || turma.periodoFim;
    if (!inicio || !fim) continue;
    const datas = _gerarDatasParaDiaSemana(inicio, fim, turma.diaSemana);
    for (const data of datas) {
      const [, wasCreated] = await CfmAula.findOrCreate({
        where: { turmaId, turmaMateriaId: tm.id, dataAula: data },
        defaults: {
          titulo: `${tm.materia?.nome || 'Aula'} — ${data}`,
          geradaAutomaticamente: true,
        },
      });
      if (wasCreated) criadas += 1;
    }
  }
  return { criadas };
}

async function criarAula(turmaId, {
  dataAula, titulo, observacoes, turmaMateriaId
}) {
  if (!dataAula) throw new Error('Data da aula é obrigatória');
  if (turmaMateriaId) {
    const exists = await CfmAula.findOne({ where: { turmaId, turmaMateriaId, dataAula } });
    if (exists) throw new Error('Já existe uma aula nesta data para esta matéria');
  }
  return CfmAula.create({
    turmaId,
    turmaMateriaId: turmaMateriaId || null,
    dataAula,
    titulo: titulo || null,
    observacoes: observacoes || null,
    geradaAutomaticamente: false,
  });
}

async function deletarAula(aulaId) {
  const aula = await CfmAula.findByPk(aulaId);
  if (!aula) throw new Error('Aula não encontrada');
  const count = await CfmAulaPresenca.count({ where: { aulaId, presente: true } });
  if (count > 0) throw new Error('Não é possível excluir uma aula com presenças marcadas');
  await aula.destroy();
}

async function cancelarAula(aulaId, { cancelada, motivoCancelamento }) {
  const aula = await CfmAula.findByPk(aulaId);
  if (!aula) throw new Error('Aula não encontrada');
  aula.cancelada = !!cancelada;
  aula.motivoCancelamento = cancelada ? (motivoCancelamento || null) : null;
  await aula.save();
  return aula;
}

async function getAulaDetalhes(aulaId) {
  const aula = await CfmAula.findByPk(aulaId, {
    include: [
      { model: CfmTurma, as: 'turma', attributes: ['id', 'numeracao', 'escolaId'] },
      {
        model: CfmTurmaMateria,
        as: 'turmaMateria',
        required: false,
        include: [{ model: CfmMateria, as: 'materia', attributes: ['id', 'nome'] }],
      },
    ],
  });
  if (!aula) throw new Error('Aula não encontrada');

  // Alunos ativos na turma
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId: aula.turmaId, status: { [Op.in]: ['ATIVO', 'PENDENTE'] } },
    include: [{
      model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName', 'photoUrl'], required: false
    }],
    order: [[{ model: Member, as: 'membro' }, 'fullName', 'ASC']],
  });

  // Presenças já salvas para esta aula
  const presencas = await CfmAulaPresenca.findAll({ where: { aulaId } });
  const presencaMap = {};
  presencas.forEach((p) => { presencaMap[p.inscricaoId] = p; });

  const alunos = inscricoes.map((insc) => ({
    inscricaoId: insc.id,
    memberId: insc.memberId,
    nome: insc.membro ? (insc.membro.preferredName || insc.membro.fullName) : insc.nomeNaoMembro,
    photoUrl: insc.membro?.photoUrl || null,
    presente: presencaMap[insc.id]?.presente ?? false,
    observacao: presencaMap[insc.id]?.observacao || '',
  }));

  return { aula, alunos };
}

async function salvarPresencasAula(aulaId, presencas = []) {
  // presencas: [{inscricaoId, presente, observacao?}]
  const aula = await CfmAula.findByPk(aulaId);
  if (!aula) throw new Error('Aula não encontrada');
  for (const p of presencas) {
    const existing = await CfmAulaPresenca.findOne({ where: { aulaId, inscricaoId: p.inscricaoId } });
    if (existing) {
      await existing.update({ presente: !!p.presente, observacao: p.observacao || null });
    } else {
      await CfmAulaPresenca.create({
        aulaId, inscricaoId: p.inscricaoId, presente: !!p.presente, observacao: p.observacao || null
      });
    }
  }
  return getAulaDetalhes(aulaId);
}

// ─── MENSALIDADES ────────────────────────────────────────────────────────────

function _calcularMeses(dataInicio, dataFim) {
  const meses = [];
  const start = new Date(`${dataInicio}T12:00:00`);
  const end = new Date(`${dataFim}T12:00:00`);
  let year = start.getFullYear();
  let month = start.getMonth();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mm = String(month + 1).padStart(2, '0');
    meses.push({
      competencia: `${year}-${mm}-01`,
      vencimento: `${year}-${mm}-10`,
    });
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return meses;
}

async function gerarMensalidades(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId);
  if (!turma) throw new Error('Turma não encontrada');
  if (!turma.periodoInicio || !turma.periodoFim) {
    throw new Error('Configure as datas de início e fim da turma para gerar mensalidades');
  }
  const meses = _calcularMeses(turma.periodoInicio, turma.periodoFim);
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: { [Op.in]: ['PENDENTE', 'LISTA_ESPERA', 'ATIVO'] } },
  });

  let criadas = 0;
  for (const insc of inscricoes) {
    for (const mes of meses) {
      const [, created] = await CfmMensalidade.findOrCreate({
        where: { inscricaoId: insc.id, competencia: mes.competencia },
        defaults: { vencimento: mes.vencimento, pago: false },
      });
      if (created) criadas += 1;
    }
  }
  return { criadas, totalMeses: meses.length, totalAlunos: inscricoes.length };
}

async function listarMensalidades(turmaId) {
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: { [Op.notIn]: ['CANCELADO', 'DESISTENTE'] } },
    include: [{
      model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName'], required: false
    }],
    order: [[{ model: Member, as: 'membro' }, 'fullName', 'ASC']],
  });

  const ids = inscricoes.map((i) => i.id);
  const allMensalidades = ids.length
    ? await CfmMensalidade.findAll({ where: { inscricaoId: { [Op.in]: ids } }, order: [['competencia', 'ASC']] })
    : [];

  const mesesSet = new Set(allMensalidades.map((m) => m.competencia));
  const meses = [...mesesSet].sort();

  const result = inscricoes.map((insc) => {
    const nome = insc.membro ? (insc.membro.preferredName || insc.membro.fullName) : insc.nomeNaoMembro;
    const mensalidadesMap = {};
    allMensalidades
      .filter((m) => m.inscricaoId === insc.id)
      .forEach((m) => {
        mensalidadesMap[m.competencia] = {
          id: m.id, pago: m.pago, dataPagamento: m.dataPagamento, valor: m.valor
        };
      });
    return {
      inscricaoId: insc.id, nome, status: insc.status, mensalidades: mensalidadesMap
    };
  });

  return { meses, inscricoes: result };
}

async function registrarPagamentoMensalidade(mensalidadeId, { pago, dataPagamento, observacao }) {
  const m = await CfmMensalidade.findByPk(mensalidadeId);
  if (!m) throw new Error('Mensalidade não encontrada');
  await m.update({
    pago: !!pago,
    dataPagamento: pago ? (dataPagamento || null) : null,
    observacao: observacao || null,
  });
  return m;
}

// ─── LISTA DE PRESENÇA PARA IMPRESSÃO ────────────────────────────────────────

async function getListaPresencaImpressao(turmaId) {
  const turma = await CfmTurma.findByPk(turmaId, {
    include: [
      { model: CfmEscola, as: 'escola' },
      { model: CfmModulo, as: 'modulo', required: false },
      { model: Campus, as: 'campus', required: false },
      {
        model: CfmTurmaMateria,
        as: 'turmaMaterias',
        include: [
          { model: CfmMateria, as: 'materia' },
          {
            model: Member, as: 'mestre', attributes: ['id', 'fullName', 'preferredName'], required: false
          },
        ],
      },
      {
        model: CfmInscricao,
        as: 'inscricoes',
        where: { status: { [Op.in]: ['ATIVO', 'CONCLUIDO', 'PENDENTE'] } },
        required: false,
        include: [
          {
            model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName'], required: false
          },
        ],
      },
    ],
  });
  if (!turma) throw Object.assign(new Error('Turma não encontrada'), { status: 404 });

  const aulas = await CfmAula.findAll({
    where: { turmaId, cancelada: false },
    order: [['dataAula', 'ASC']],
    raw: true,
  });

  const aulaIds = aulas.map(a => a.id);
  const presencas = aulaIds.length
    ? await CfmAulaPresenca.findAll({ where: { aulaId: { [Op.in]: aulaIds } }, raw: true })
    : [];

  const pMap = {};
  for (const p of presencas) {
    if (!pMap[p.aulaId]) pMap[p.aulaId] = {};
    pMap[p.aulaId][p.inscricaoId] = p.presente;
  }

  const inscricoes = (turma.inscricoes || []).sort((a, b) => {
    const nA = a.membro ? (a.membro.fullName || '') : (a.nomeNaoMembro || '');
    const nB = b.membro ? (b.membro.fullName || '') : (b.nomeNaoMembro || '');
    return nA.localeCompare(nB, 'pt-BR');
  });

  const materias = (turma.turmaMaterias || [])
    .sort((a, b) => a.ordem - b.ordem)
    .map(tm => {
      const aulasMateria = aulas
        .filter(a => a.turmaMateriaId === tm.id)
        .sort((a, b) => a.dataAula.localeCompare(b.dataAula));

      const alunos = inscricoes.map((insc, idx) => {
        const nome = insc.membro
          ? (insc.membro.preferredName || insc.membro.fullName)
          : (insc.nomeNaoMembro || 'Aluno');
        const marcas = aulasMateria.map(aula => {
          const aulaMap = pMap[aula.id] || {};
          if (insc.id in aulaMap) return aulaMap[insc.id] === true ? 'P' : 'F';
          return null;
        });
        const totalFaltas = marcas.filter(m => m === 'F').length;
        return {
          numero: idx + 1, nome, marcas, totalFaltas
        };
      });

      const mestre = tm.mestre ? (tm.mestre.preferredName || tm.mestre.fullName) : '';

      return {
        turmaMateriaId: tm.id,
        materiaNome: tm.materia?.nome || '',
        mestre,
        periodoInicio: tm.periodoInicio,
        periodoFim: tm.periodoFim,
        aulas: aulasMateria.map((a, idx) => ({ id: a.id, dataAula: a.dataAula, numero: idx + 1 })),
        alunos,
      };
    });

  return {
    turma: {
      numeracao: turma.numeracao,
      periodoInicio: turma.periodoInicio,
      periodoFim: turma.periodoFim,
      escola: turma.escola?.nome || '',
      modulo: turma.modulo?.nome || '',
      campus: turma.campus?.nome || '',
    },
    materias,
  };
}

// ─── INSCRIÇÃO PÚBLICA ───────────────────────────────────────────────────────

async function inscricaoPublica(turmaId, {
  nome, email, telefone, cpf, observacoes
}) {
  const turma = await CfmTurma.findByPk(turmaId, {
    include: [
      {
        model: require('../models').CfmEscola, as: 'escola', attributes: ['nome'], required: false
      },
    ],
  });
  if (!turma) throw new Error('Turma não encontrada');
  if (turma.status !== 'ABERTA') {
    throw new Error('Esta turma não está aceitando inscrições no momento');
  }

  // Tentar vincular a membro existente
  let memberId = null;
  const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
  if (cpfLimpo) {
    const m = await Member.findOne({ where: { cpf: cpfLimpo } });
    if (m) memberId = m.id;
  }
  if (!memberId && email) {
    const m = await Member.findOne({ where: { email } });
    if (m) memberId = m.id;
  }

  // Checar se já inscrito
  if (memberId) {
    const existing = await CfmInscricao.findOne({ where: { turmaId, memberId } });
    if (existing) throw new Error('Já existe uma inscrição para este membro nesta turma');
  }

  // Checar vagas
  if (turma.vagasMax) {
    const ativos = await _contarAtivos(turmaId);
    const status = ativos >= turma.vagasMax ? 'LISTA_ESPERA' : 'PENDENTE';
    const obs = [observacoes, `Contato: ${email || ''}${telefone ? ` / ${telefone}` : ''}`].filter(Boolean).join(' | ');
    return CfmInscricao.create({
      turmaId,
      memberId,
      nomeNaoMembro: !memberId ? nome : null,
      status,
      observacoes: obs || null,
    });
  }

  const obs = [observacoes, `Contato: ${email || ''}${telefone ? ` / ${telefone}` : ''}`].filter(Boolean).join(' | ');
  return CfmInscricao.create({
    turmaId,
    memberId,
    nomeNaoMembro: !memberId ? nome : null,
    status: 'PENDENTE',
    observacoes: obs || null,
  });
}

// ─── ENDPOINTS PÚBLICOS (sem autenticação) ───────────────────────────────────

async function listarEscolasPublicas() {
  return CfmEscola.findAll({
    where: { ativo: true },
    attributes: ['id', 'nome', 'temModulos'],
    include: [{
      model: CfmModulo,
      as: 'modulos',
      required: false,
      where: { ativo: true },
      attributes: ['id', 'nome', 'ordem'],
      order: [['ordem', 'ASC']],
    }],
    order: [['nome', 'ASC']],
  });
}

async function listarCampiPublicos() {
  return Campus.findAll({
    attributes: ['id', 'nome'],
    order: [['nome', 'ASC']],
  });
}

async function getTurmasAbertas() {
  const schema = process.env.DB_SCHEMA || 'dev_iecg';
  const turmas = await CfmTurma.findAll({
    where: { status: { [Op.in]: ['ABERTA', 'EM_ANDAMENTO'] } },
    attributes: {
      include: [[
        sequelize.literal(
          `(SELECT COUNT(*) FROM "${schema}"."CfmInscricoes" WHERE "turmaId" = "CfmTurma"."id" AND status IN ('PENDENTE', 'ATIVO'))`
        ),
        'vagasOcupadas',
      ]],
    },
    include: [
      { model: CfmEscola, as: 'escola', attributes: ['id', 'nome'] },
      {
        model: CfmModulo, as: 'modulo', attributes: ['id', 'nome'], required: false
      },
      {
        model: Campus, as: 'campus', attributes: ['id', 'nome'], required: false
      },
    ],
    order: [['periodoInicio', 'ASC']],
  });
  return turmas.map(t => {
    const plain = t.toJSON();
    plain.vagasOcupadas = Number(plain.vagasOcupadas) || 0;
    plain.vagasRestantes = plain.vagasMax ? Math.max(0, plain.vagasMax - plain.vagasOcupadas) : null;
    plain.esgotada = plain.vagasMax ? plain.vagasOcupadas >= plain.vagasMax : false;
    return plain;
  });
}

// Pares acento→base para normalização (JS e SQL usam a mesma lista, garantindo alinhamento)
const ACCENT_PAIRS = [
  ['á', 'a'], ['à', 'a'], ['â', 'a'], ['ã', 'a'], ['ä', 'a'],
  ['é', 'e'], ['è', 'e'], ['ê', 'e'], ['ë', 'e'],
  ['í', 'i'], ['ì', 'i'], ['î', 'i'], ['ï', 'i'],
  ['ó', 'o'], ['ò', 'o'], ['ô', 'o'], ['õ', 'o'], ['ö', 'o'],
  ['ú', 'u'], ['ù', 'u'], ['û', 'u'], ['ü', 'u'],
  ['ç', 'c'], ['ñ', 'n'], ['ý', 'y'],
];
const ACCENT_MAP_OBJ = Object.fromEntries(ACCENT_PAIRS);
const TR_FROM = ACCENT_PAIRS.map(p => p[0]).join(''); // garantido mesmo tamanho que TR_TO
const TR_TO = ACCENT_PAIRS.map(p => p[1]).join('');

function normStr(s) {
  return (s || '').toLowerCase().split('').map(c => ACCENT_MAP_OBJ[c] || c).join('');
}

async function buscarLideresCelula(busca) {
  if (!busca || busca.trim().length < 2) return [];
  const buscaNorm = normStr(busca.trim());
  const schema = process.env.DB_SCHEMA || 'dev_iecg';

  // TRANSLATE é built-in do PostgreSQL (sem extensão)
  // TR_FROM/TR_TO são passados como parâmetros para evitar injeção e garantir alinhamento
  const membros = await sequelize.query(
    `SELECT id, "fullName", "preferredName", "pastorGeracaoMemberId", "pastorCampusMemberId"
     FROM "${schema}"."Members"
     WHERE "deletedAt" IS NULL
       AND (
         TRANSLATE(lower("fullName"),  :trFrom, :trTo) LIKE :pattern
         OR TRANSLATE(lower("preferredName"), :trFrom, :trTo) LIKE :pattern
       )
     LIMIT 50`,
    {
      replacements: { pattern: `%${buscaNorm}%`, trFrom: TR_FROM, trTo: TR_TO },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (!membros.length) return [];

  const membroIds = membros.map(m => m.id);

  // Verificar liderança por dois caminhos em paralelo:
  // 1) CelulaMembroVinculo com papel='lider'
  // 2) Celula.liderMemberId (campo direto na célula)
  const [vinculos, celulasDiretas] = await Promise.all([
    CelulaMembroVinculo.findAll({
      where: { membroId: { [Op.in]: membroIds }, papel: 'lider', ativo: true },
      attributes: ['membroId', 'celulaId'],
    }),
    Celula.findAll({
      where: { liderMemberId: { [Op.in]: membroIds }, ativo: true },
      attributes: ['id', 'celula', 'liderMemberId', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
    }),
  ]);

  // Montar mapa membroId → info da célula
  const liderMap = {};

  // Fonte 1: Celula.liderMemberId
  celulasDiretas.forEach(cel => {
    liderMap[cel.liderMemberId] = {
      celulaId: cel.id,
      celulaNome: cel.celula,
      pastorGeracaoMemberId: cel.pastorGeracaoMemberId,
      pastorCampusMemberId: cel.pastorCampusMemberId,
    };
  });

  // Fonte 2: CelulaMembroVinculo (sobrescreve se encontrado)
  if (vinculos.length) {
    const celulaIds = [...new Set(vinculos.map(v => v.celulaId))];
    const celulas = await Celula.findAll({
      where: { id: { [Op.in]: celulaIds } },
      attributes: ['id', 'celula', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
    });
    const celulaMap = Object.fromEntries(celulas.map(c => [c.id, c]));
    vinculos.forEach(v => {
      const cel = celulaMap[v.celulaId];
      liderMap[v.membroId] = {
        celulaId: v.celulaId,
        celulaNome: cel?.celula || null,
        pastorGeracaoMemberId: cel?.pastorGeracaoMemberId || null,
        pastorCampusMemberId: cel?.pastorCampusMemberId || null,
      };
    });
  }

  return membros
    .filter(m => liderMap[m.id])
    .map(m => {
      const info = liderMap[m.id];
      return {
        id: m.id,
        nome: m.preferredName || m.fullName,
        celulaId: info.celulaId,
        celulaNome: info.celulaNome,
        pastorGeracaoMemberId: info.pastorGeracaoMemberId || m.pastorGeracaoMemberId,
        pastorCampusMemberId: info.pastorCampusMemberId || m.pastorCampusMemberId,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function listarPastoresPublicos() {
  const cargos = await MemberCargo.findAll({
    where: { cargo: { [Op.in]: ['pastor_geracao', 'pastor_campus'] }, ativo: true },
    attributes: ['membroId', 'cargo'],
  });
  if (!cargos.length) return [];

  const membroIds = [...new Set(cargos.map(c => c.membroId))];
  const membros = await Member.findAll({
    where: { id: { [Op.in]: membroIds } },
    attributes: ['id', 'fullName', 'preferredName'],
  });
  const membroMap = {};
  membros.forEach(m => { membroMap[m.id] = m.preferredName || m.fullName; });

  return cargos
    .filter(c => membroMap[c.membroId])
    .map(c => ({ id: c.membroId, nome: membroMap[c.membroId], cargo: c.cargo }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function getMembroPublicoByCpf(cpf) {
  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  if (!cpfLimpo || cpfLimpo.length !== 11) return null;
  const m = await Member.findOne({
    where: { cpf: cpfLimpo },
    attributes: ['fullName', 'preferredName', 'email', 'phone', 'birthDate', 'city', 'zipCode', 'street', 'number', 'neighborhood'],
  });
  if (!m) return null;
  return {
    nome: m.preferredName || m.fullName,
    email: m.email || '',
    telefone: m.phone || '',
    dataNascimento: m.birthDate ? String(m.birthDate).slice(0, 10) : '',
    cidade: m.city || '',
    cep: m.zipCode || '',
    rua: m.street || '',
    numero: m.number || '',
    bairro: m.neighborhood || '',
  };
}

async function inscricaoPublicaCompleta(turmaId, body) {
  const {
    nome, email, telefone, cpf, dataNascimento, cidade,
    rua, numero, bairro, cep, deficiencia, geracao,
    liderCelulaId, celulaId, pastorId, pastorCargo,
    encontroComDeus, dataEncontroComDeus, anoConversaoMinisterio,
    observacoes,
  } = body;

  const turma = await CfmTurma.findByPk(turmaId, {
    include: [{
      model: CfmEscola, as: 'escola', attributes: ['nome'], required: false
    }],
  });
  if (!turma) throw new Error('Turma não encontrada');
  if (turma.status !== 'ABERTA') {
    throw new Error('As inscrições para esta turma estão encerradas');
  }

  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  if (!nome || !nome.trim()) throw new Error('Nome é obrigatório');
  if (!cpfLimpo) throw new Error('CPF é obrigatório');

  // Resolver nomes para dadosFormulario (snapshot no momento do cadastro)
  const geracaoNome = geracao || null; // geracao é a própria string da rede
  let liderNome = null;
  let liderCelulaNome = null;
  if (liderCelulaId) {
    const lider = await Member.findByPk(liderCelulaId, { attributes: ['fullName', 'preferredName'] });
    if (lider) liderNome = lider.preferredName || lider.fullName;
  }
  if (celulaId) {
    const cel = await Celula.findByPk(celulaId, { attributes: ['celula'] });
    if (cel) liderCelulaNome = cel.celula;
  }
  let pastorNome = null;
  if (pastorId) {
    const past = await Member.findByPk(pastorId, { attributes: ['fullName', 'preferredName'] });
    if (past) pastorNome = past.preferredName || past.fullName;
  }

  // Buscar ou criar membro
  let membro = await Member.findOne({ where: { cpf: cpfLimpo } });
  if (!membro && email) {
    membro = await Member.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  if (membro) {
    // Atualiza campos vazios do membro existente
    const upd = {};
    if (telefone && !membro.phone) upd.phone = telefone;
    if (dataNascimento && !membro.birthDate) upd.birthDate = dataNascimento;
    if (cidade && !membro.city) upd.city = cidade;
    if (rua && !membro.street) { upd.street = rua; upd.number = numero || null; upd.neighborhood = bairro || null; upd.zipCode = cep || null; }
    if (email && !membro.email) upd.email = email.toLowerCase().trim();
    if (Object.keys(upd).length) await membro.update(upd);
  } else {
    membro = await Member.create({
      fullName: nome.trim(),
      email: email ? email.toLowerCase().trim() : null,
      phone: telefone || null,
      cpf: cpfLimpo,
      birthDate: dataNascimento || null,
      city: cidade || null,
      street: rua || null,
      number: numero || null,
      neighborhood: bairro || null,
      zipCode: cep || null,
      status: 'VISITANTE',
      statusChangeDate: new Date().toISOString().slice(0, 10),
      country: 'Brasil',
    });
  }

  // Vincular à célula do líder selecionado
  if (liderCelulaId && celulaId) {
    // Desativar vínculos anteriores
    await CelulaMembroVinculo.update(
      { ativo: false, dataSaida: new Date().toISOString().slice(0, 10) },
      { where: { membroId: membro.id, ativo: true } }
    );
    // Criar novo vínculo
    await CelulaMembroVinculo.findOrCreate({
      where: { celulaId, membroId: membro.id, ativo: true },
      defaults: {
        papel: 'membro',
        dataEntrada: new Date().toISOString().slice(0, 10),
        ativo: true,
        origem: 'pre_cadastro',
      },
    });
    await membro.update({ celulaId });

    // Cascatear hierarquia pastoral da célula para o membro
    const celula = await Celula.findByPk(celulaId, {
      attributes: ['id', 'pastorGeracaoMemberId', 'pastorCampusMemberId'],
    });
    if (celula) {
      const hier = {};
      if (celula.pastorGeracaoMemberId) {
        // Pastor de geração tem prioridade — não sobrescreve pastor de campus
        hier.pastorGeracaoMemberId = celula.pastorGeracaoMemberId;
      } else if (celula.pastorCampusMemberId) {
        hier.pastorCampusMemberId = celula.pastorCampusMemberId;
      }
      if (Object.keys(hier).length) await membro.update(hier);
    }
  } else if (pastorId) {
    // Sem célula selecionada mas pastor escolhido manualmente
    const upd = {};
    if (pastorCargo === 'pastor_campus') upd.pastorCampusMemberId = pastorId;
    else upd.pastorGeracaoMemberId = pastorId;
    await membro.update(upd);
  }

  // Marco de Encontro com Deus
  if (encontroComDeus === 'sim' && dataEncontroComDeus) {
    const jaTemMarco = await MemberMilestone.findOne({
      where: { memberId: membro.id, milestoneType: 'ENCONTRO_COM_DEUS' },
    });
    if (!jaTemMarco) {
      await MemberMilestone.create({
        memberId: membro.id,
        milestoneType: 'ENCONTRO_COM_DEUS',
        achievedDate: dataEncontroComDeus,
        description: 'Registrado via matrícula CFM',
      });
    }
  }

  // Verificar inscrição duplicada
  const existing = await CfmInscricao.findOne({ where: { turmaId, memberId: membro.id } });
  if (existing) throw new Error('Você já possui uma inscrição nesta turma');

  // Verificar vagas
  let status = 'PENDENTE';
  if (turma.vagasMax) {
    const ativos = await _contarAtivos(turmaId);
    if (ativos >= turma.vagasMax) status = 'LISTA_ESPERA';
  }

  const dadosFormulario = {
    geracao: geracao || null,
    geracaoNome,
    deficiencia: deficiencia || null,
    encontroComDeus: encontroComDeus || null,
    dataEncontroComDeus: dataEncontroComDeus || null,
    anoConversaoMinisterio: anoConversaoMinisterio || null,
    liderCelulaId: liderCelulaId || null,
    liderNome,
    liderCelulaNome,
    pastorId: pastorId || null,
    pastorNome,
  };

  return CfmInscricao.create({
    turmaId,
    memberId: membro.id,
    nomeNaoMembro: null,
    status,
    observacoes: observacoes || null,
    dadosFormulario,
  });
}

async function atualizarDadosFormulario(inscricaoId, body) {
  const {
    geracao, liderCelulaId, pastorId, deficiencia, encontroComDeus, dataEncontroComDeus, anoConversaoMinisterio
  } = body;

  const insc = await CfmInscricao.findByPk(inscricaoId);
  if (!insc) throw new Error('Inscrição não encontrada');

  const geracaoNome = geracao || null; // geracao é a própria string da rede

  let liderNome = null;
  let liderCelulaNome = null;
  if (liderCelulaId) {
    const lider = await Member.findByPk(liderCelulaId, { attributes: ['fullName', 'preferredName'] });
    if (lider) liderNome = lider.preferredName || lider.fullName;
    const vinculo = await CelulaMembroVinculo.findOne({
      where: { membroId: liderCelulaId, papel: 'lider', ativo: true },
      attributes: ['celulaId'],
    });
    if (vinculo) {
      const cel = await Celula.findByPk(vinculo.celulaId, { attributes: ['celula'] });
      if (cel) liderCelulaNome = cel.celula;
    }
  }

  let pastorNome = null;
  if (pastorId) {
    const past = await Member.findByPk(pastorId, { attributes: ['fullName', 'preferredName'] });
    if (past) pastorNome = past.preferredName || past.fullName;
  }

  // Marco Encontro com Deus se marcado e membro vinculado
  if (encontroComDeus === 'sim' && dataEncontroComDeus && insc.memberId) {
    const jaTemMarco = await MemberMilestone.findOne({
      where: { memberId: insc.memberId, milestoneType: 'ENCONTRO_COM_DEUS' },
    });
    if (!jaTemMarco) {
      await MemberMilestone.create({
        memberId: insc.memberId,
        milestoneType: 'ENCONTRO_COM_DEUS',
        achievedDate: dataEncontroComDeus,
        description: 'Registrado via edição de dados CFM',
      });
    }
  }

  const existing = insc.dadosFormulario || {};
  insc.dadosFormulario = {
    ...existing,
    geracao: geracao !== undefined ? (geracao || null) : existing.geracao,
    geracaoNome: geracao !== undefined ? geracaoNome : existing.geracaoNome,
    deficiencia: deficiencia !== undefined ? (deficiencia || null) : existing.deficiencia,
    liderCelulaId: liderCelulaId !== undefined ? (liderCelulaId || null) : existing.liderCelulaId,
    liderNome: liderCelulaId !== undefined ? liderNome : existing.liderNome,
    liderCelulaNome: liderCelulaId !== undefined ? liderCelulaNome : existing.liderCelulaNome,
    pastorId: pastorId !== undefined ? (pastorId || null) : existing.pastorId,
    pastorNome: pastorId !== undefined ? pastorNome : existing.pastorNome,
    encontroComDeus: encontroComDeus !== undefined ? (encontroComDeus || null) : existing.encontroComDeus,
    dataEncontroComDeus: dataEncontroComDeus !== undefined ? (dataEncontroComDeus || null) : existing.dataEncontroComDeus,
    anoConversaoMinisterio: anoConversaoMinisterio !== undefined ? (anoConversaoMinisterio || null) : existing.anoConversaoMinisterio,
  };

  await insc.save();
  return insc.dadosFormulario;
}

async function listarMinisteriosPublicos() {
  return Ministerio.findAll({
    where: { ativo: true },
    attributes: ['id', 'nome'],
    order: [['nome', 'ASC']],
  });
}

async function listarRedesCfm() {
  const rows = await Celula.findAll({
    attributes: ['rede'],
    where: { rede: { [Op.ne]: null, [Op.notILike]: '%KIDS%' } },
    group: ['rede'],
    order: [['rede', 'ASC']],
    raw: true,
  });
  return rows.map(r => r.rede).filter(Boolean);
}

// ─── TIMEZONE HELPER ───────────────────────────────────────────────────────
// Servidor roda em UTC; Campo Grande é UTC-4. Usar sempre esta função
// para obter a data local correta ao invés de new Date().toISOString().slice(0,10).
function hojeLocal() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Campo_Grande' });
}

// ─── CFM CHECK-IN ─────────────────────────────────────────────────────────

function _extractToken(raw) {
  const m = (raw || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

async function scanCfmCheckin(rawToken) {
  const token = _extractToken(rawToken);
  if (!token) throw Object.assign(new Error('QR inválido'), { status: 400 });

  const inscricao = await CfmInscricao.findOne({
    where: { tokenQr: token },
    include: [
      {
        model: CfmTurma,
        as: 'turma',
        include: [
          { model: CfmEscola, as: 'escola' },
          {
            model: CfmTurmaMateria,
            as: 'turmaMaterias',
            include: [{ model: CfmMateria, as: 'materia' }],
            order: [['ordem', 'ASC']],
          },
        ],
      },
      { model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName'] },
    ],
  });

  if (!inscricao) throw Object.assign(new Error('Matrícula não encontrada'), { status: 404 });
  if (!['PENDENTE', 'ATIVO'].includes(inscricao.status)) {
    throw Object.assign(new Error(`Matrícula ${inscricao.status.toLowerCase()}`), { status: 422 });
  }

  const nome = inscricao.membro
    ? (inscricao.membro.preferredName || inscricao.membro.fullName)
    : inscricao.nomeNaoMembro;

  const hoje = hojeLocal();
  const hojeFormatado = hoje.split('-').reverse().join('/');

  const turmaMaterias = (inscricao.turma?.turmaMaterias || []).filter(tm => {
    if (tm.periodoInicio && hoje < tm.periodoInicio) return false;
    if (tm.periodoFim && hoje > tm.periodoFim) return false;
    return true;
  });

  const tmIds = turmaMaterias.map(tm => tm.id);

  const aulasHoje = tmIds.length > 0
    ? await CfmAula.findAll({
      where: {
        turmaId: inscricao.turmaId, turmaMateriaId: tmIds, dataAula: hoje, cancelada: false
      },
      attributes: ['turmaMateriaId'],
      raw: true,
    })
    : [];

  const tmIdsComAula = new Set(aulasHoje.map(a => a.turmaMateriaId));
  const materias = turmaMaterias
    .filter(tm => tmIdsComAula.has(tm.id))
    .map(tm => ({ turmaMateriaId: tm.id, nome: tm.materia?.nome || `Matéria ${tm.id}` }));

  if (materias.length === 0) {
    throw Object.assign(
      new Error(`Sem aula ativa em ${hojeFormatado}`),
      { status: 422 }
    );
  }

  return {
    inscricaoId: inscricao.id,
    nome,
    turma: `${inscricao.turma?.escola?.nome || ''} · ${inscricao.turma?.numeracao || ''}`.trim(),
    materias,
    requiresSelection: materias.length > 1,
  };
}

async function marcarCfmCheckin(rawToken, turmaMateriaId) {
  const token = _extractToken(rawToken);
  if (!token) throw Object.assign(new Error('QR inválido'), { status: 400 });

  const inscricao = await CfmInscricao.findOne({ where: { tokenQr: token } });
  if (!inscricao) throw Object.assign(new Error('Matrícula não encontrada'), { status: 404 });
  if (!['PENDENTE', 'ATIVO'].includes(inscricao.status)) {
    throw Object.assign(new Error(`Matrícula ${inscricao.status.toLowerCase()}`), { status: 422 });
  }

  const hoje = hojeLocal();
  const hojeFormatado = hoje.split('-').reverse().join('/');

  const aula = await CfmAula.findOne({
    where: {
      turmaId: inscricao.turmaId, turmaMateriaId, dataAula: hoje, cancelada: false
    },
  });

  if (!aula) {
    throw Object.assign(
      new Error(`Sem aula ativa em ${hojeFormatado}`),
      { status: 422 }
    );
  }

  const [presenca, created] = await CfmAulaPresenca.findOrCreate({
    where: { aulaId: aula.id, inscricaoId: inscricao.id },
    defaults: { presente: true },
  });

  if (!created && !presenca.presente) {
    await presenca.update({ presente: true });
  }

  return {
    jaRegistrado: !created && presenca.presente === true && !(!created && presenca.presente === false),
    presente: presenca.presente,
  };
}

async function enviarCartaoInscricao(inscricaoId) {
  const inscricao = await CfmInscricao.findByPk(inscricaoId);
  if (!inscricao) throw new Error('Inscrição não encontrada');
  if (!['PENDENTE', 'ATIVO', 'CONCLUIDO'].includes(inscricao.status)) {
    throw new Error('Status de inscrição não permite envio de cartão');
  }
  if (!inscricao.tokenQr) {
    inscricao.tokenQr = require('crypto').randomUUID();
    await inscricao.save();
  }
  return require('./cfmCartaoService').enviarCartaoAluno(inscricaoId);
}

async function enviarCartoesTurma(turmaId) {
  const inscricoes = await CfmInscricao.findAll({
    where: { turmaId, status: ['PENDENTE', 'ATIVO'] },
    attributes: ['id', 'tokenQr', 'status'],
  });
  const resultados = [];
  for (const insc of inscricoes) {
    if (!insc.tokenQr) {
      insc.tokenQr = require('crypto').randomUUID();
      await insc.save();
    }
    try {
      const r = await require('./cfmCartaoService').enviarCartaoAluno(insc.id);
      resultados.push({ inscricaoId: insc.id, ...r });
    } catch (e) {
      resultados.push({ inscricaoId: insc.id, erro: e.message });
    }
  }
  return { total: inscricoes.length, resultados };
}

module.exports = {
  listEscolas,
  createEscola,
  updateEscola,
  deleteEscola,
  listModulos,
  createModulo,
  updateModulo,
  deleteModulo,
  listMaterias,
  createMateria,
  updateMateria,
  deleteMateria,
  listTurmas,
  getTurma,
  createTurma,
  updateTurma,
  previewDeleteTurma,
  deleteTurma,
  getTurmaMaterias,
  syncTurmaMaterias,
  listInscricoes,
  createInscricao,
  confirmarPagamento,
  marcarDesistencia,
  cancelarInscricao,
  previewConclusao,
  concluirInscricao,
  reabrirInscricao,
  previewConclusaoTurma,
  concluirTurma,
  getPresencas,
  salvarPresencas,
  getNotas,
  salvarNota,
  salvarNotasBulk,
  getPainel,
  listarAulas,
  gerarAulasAutomaticas,
  criarAula,
  deletarAula,
  cancelarAula,
  getAulaDetalhes,
  salvarPresencasAula,
  gerarMensalidades,
  listarMensalidades,
  registrarPagamentoMensalidade,
  inscricaoPublica,
  getTurmasAbertas,
  buscarLideresCelula,
  listarPastoresPublicos,
  listarMinisteriosPublicos,
  listarRedesCfm,
  getMembroPublicoByCpf,
  inscricaoPublicaCompleta,
  atualizarDadosFormulario,
  listarEscolasPublicas,
  listarCampiPublicos,
  scanCfmCheckin,
  marcarCfmCheckin,
  enviarCartaoInscricao,
  enviarCartoesTurma,
  getListaPresencaImpressao,
};
