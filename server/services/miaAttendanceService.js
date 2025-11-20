const {
  MiaAttendanceList,
  MiaAttendancePresence,
  Aposentado,
  User
} = require('../models');

const calcularIdade = (dataNascimento, referencia) => {
  if (!dataNascimento) return null;
  const ref = referencia ? new Date(referencia) : new Date();
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  let idade = ref.getFullYear() - nasc.getFullYear();
  const mes = ref.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && ref.getDate() < nasc.getDate())) {
    idade -= 1;
  }
  return idade;
};

class MiaAttendanceService {
  async criarLista(dados) {
    if (!dados?.titulo) {
      throw new Error('O t��tulo da lista Ǹ obrigat��rio.');
    }

    if (!dados?.dataReferencia) {
      throw new Error('Informe uma data de refer��ncia para a lista.');
    }

    return MiaAttendanceList.create({
      titulo: dados.titulo,
      dataReferencia: dados.dataReferencia,
      faixaEtariaMin: dados.faixaEtariaMin ?? null,
      faixaEtariaMax: dados.faixaEtariaMax ?? null,
      observacoes: dados.observacoes || null
    });
  }

  async listarListas(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await MiaAttendanceList.findAndCountAll({
      limit,
      offset,
      order: [
        ['dataReferencia', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return {
      registros: rows,
      totalPaginas: Math.ceil(count / limit),
      paginaAtual: page,
      totalRegistros: count
    };
  }

  async obterListaDetalhes(id) {
    const lista = await MiaAttendanceList.findByPk(id, {
      include: [{ model: MiaAttendancePresence, as: 'presencas' }]
    });

    if (!lista) {
      throw new Error('presença nǜo encontrada.');
    }

    const participantes = await this._carregarParticipantes(lista);

    return {
      lista,
      participantes
    };
  }

  async salvarPresencas(id, presencas = []) {
    const lista = await MiaAttendanceList.findByPk(id);
    if (!lista) {
      throw new Error('presença nǜo encontrada.');
    }

    for (const registro of presencas) {
      if (!registro.aposentadoId) continue;
      const [presenca, criada] = await MiaAttendancePresence.findOrCreate({
        where: {
          attendanceListId: id,
          aposentadoId: registro.aposentadoId
        },
        defaults: {
          presente: !!registro.presente,
          idadeNoEvento: registro.idade ?? null,
          observacao: registro.observacao || null
        }
      });

      if (!criada) {
        await presenca.update({
          presente: !!registro.presente,
          idadeNoEvento: registro.idade ?? presenca.idadeNoEvento,
          observacao: registro.observacao || presenca.observacao
        });
      }
    }

    return this.obterListaDetalhes(id);
  }

  async deletarLista(id) {
    const lista = await MiaAttendanceList.findByPk(id, {
      include: [{ model: MiaAttendancePresence, as: 'presencas' }]
    });

    if (!lista) {
      throw new Error('presenca nao encontrada.');
    }

    if ((lista.presencas || []).length > 0) {
      throw new Error('Nao e possivel excluir listas que ja possuem presencas salvas.');
    }

    await MiaAttendancePresence.destroy({
      where: { attendanceListId: id }
    });

    await lista.destroy();
  }

  async _carregarParticipantes(lista) {
    const registros = await Aposentado.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'telefone', 'data_nascimento']
        }
      ],
      order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    });

    const presencasMap = new Map(
      (lista.presencas || []).map((p) => [p.aposentadoId, p])
    );

    return registros
      .map((item) => {
        const idade = calcularIdade(item.user?.data_nascimento, lista.dataReferencia);

        if (
          typeof lista.faixaEtariaMin === 'number' &&
          idade !== null &&
          idade < lista.faixaEtariaMin
        ) {
          return null;
        }

        if (
          typeof lista.faixaEtariaMax === 'number' &&
          idade !== null &&
          idade > lista.faixaEtariaMax
        ) {
          return null;
        }

        const registroPresenca = presencasMap.get(item.id);

        return {
          id: item.id,
          nome: item.user?.name || 'Sem nome',
          telefone: item.user?.telefone || '',
          idade,
          tipo: item.tipo_pessoa || '',
          presente: registroPresenca ? registroPresenca.presente : false,
          observacao: registroPresenca?.observacao || null
        };
      })
      .filter(Boolean);
  }
}

module.exports = new MiaAttendanceService();
