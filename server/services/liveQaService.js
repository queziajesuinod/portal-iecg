const { Op } = require('sequelize');
const db = require('../models');

const {
  LiveQaSession, LiveQaQuestion, LiveQaLike, sequelize
} = db;

// Alfabeto sem caracteres ambíguos (0/O, 1/I) para o código da sala
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCodigo(tamanho = 6) {
  let codigo = '';
  for (let i = 0; i < tamanho; i += 1) {
    codigo += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return codigo;
}

class LiveQaService {
  // ===================== SALAS (admin) =====================

  async listarSalas() {
    return LiveQaSession.findAll({ order: [['createdAt', 'DESC']] });
  }

  async criarSala({ title, description, createdBy }) {
    if (!title || !title.trim()) {
      throw new Error('Título da sala é obrigatório');
    }
    // Garante código único
    let code;
    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
      code = gerarCodigo();
      // eslint-disable-next-line no-await-in-loop
      const existe = await LiveQaSession.findOne({ where: { code } });
      if (!existe) break;
      code = null;
    }
    if (!code) throw new Error('Não foi possível gerar um código único, tente novamente');

    return LiveQaSession.create({
      code,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      status: 'open',
      createdBy: createdBy || null,
    });
  }

  async atualizarSala(id, {
    title, description, status, liveTheme, questionsLocked,
  }) {
    const sala = await LiveQaSession.findByPk(id);
    if (!sala) throw new Error('Sala não encontrada');
    if (title !== undefined) sala.title = String(title).trim();
    if (description !== undefined) sala.description = description ? String(description).trim() : null;
    if (status !== undefined) sala.status = status === 'closed' ? 'closed' : 'open';
    if (liveTheme !== undefined) sala.liveTheme = liveTheme || null;
    if (questionsLocked !== undefined) sala.questionsLocked = !!questionsLocked;
    await sala.save();
    return sala;
  }

  async excluirSala(id) {
    const sala = await LiveQaSession.findByPk(id);
    if (!sala) throw new Error('Sala não encontrada');
    await sala.destroy();
    return true;
  }

  // ===================== PERGUNTAS (admin) =====================

  async listarPerguntasAdmin(sessionId, { incluirArquivadas = true } = {}) {
    const where = { sessionId };
    if (!incluirArquivadas) where.status = 'active';
    return LiveQaQuestion.findAll({
      where,
      order: [['likesCount', 'DESC'], ['createdAt', 'ASC']],
    });
  }

  async moderarPergunta(questionId, { status, isLive, answered }) {
    return sequelize.transaction(async (transaction) => {
      const pergunta = await LiveQaQuestion.findByPk(questionId, { transaction });
      if (!pergunta) throw new Error('Pergunta não encontrada');

      if (isLive === true) {
        // Ao trocar a pergunta ao vivo, a anterior passa para respondida.
        await LiveQaQuestion.update(
          { isLive: false, answered: true },
          {
            where: {
              sessionId: pergunta.sessionId,
              isLive: true,
              id: { [Op.ne]: pergunta.id },
            },
            transaction,
          }
        );
        pergunta.isLive = true;
        pergunta.answered = false;
      } else if (isLive === false) {
        pergunta.isLive = false;
      }

      if (status !== undefined) pergunta.status = status === 'archived' ? 'archived' : 'active';
      if (answered !== undefined) {
        pergunta.answered = !!answered;
        if (pergunta.answered) pergunta.isLive = false;
      }

      await pergunta.save({ transaction });
      return pergunta;
    });
  }

  async excluirPergunta(questionId) {
    const pergunta = await LiveQaQuestion.findByPk(questionId);
    if (!pergunta) throw new Error('Pergunta não encontrada');
    await pergunta.destroy();
    return true;
  }

  async perguntaAoVivo(sessionId) {
    return LiveQaQuestion.findOne({
      where: { sessionId, isLive: true, status: 'active' },
    });
  }

  // Próximas perguntas da fila (mais curtidas), exceto a que está ao vivo e as respondidas
  async proximasDaFila(sessionId, excludeId, limit = 3) {
    const where = { sessionId, status: 'active', answered: false };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return LiveQaQuestion.findAll({
      where,
      order: [['likesCount', 'DESC'], ['createdAt', 'ASC']],
      limit,
    });
  }

  // ===================== PÚBLICO =====================

  async buscarSalaPorCodigo(code) {
    if (!code) throw new Error('Código é obrigatório');
    const sala = await LiveQaSession.findOne({
      where: { code: String(code).trim().toUpperCase() },
    });
    if (!sala) throw new Error('Sala não encontrada');
    return sala;
  }

  async listarPerguntasPublico(code, voterToken) {
    const sala = await this.buscarSalaPorCodigo(code);
    const perguntas = await LiveQaQuestion.findAll({
      where: { sessionId: sala.id, status: 'active' },
      order: [['likesCount', 'DESC'], ['createdAt', 'ASC']],
    });

    // Marca quais o visitante atual já curtiu
    let curtidas = new Set();
    if (voterToken && perguntas.length) {
      const likes = await LiveQaLike.findAll({
        where: { voterToken, questionId: { [Op.in]: perguntas.map((p) => p.id) } },
        attributes: ['questionId'],
      });
      curtidas = new Set(likes.map((l) => l.questionId));
    }

    return {
      session: {
        id: sala.id,
        code: sala.code,
        title: sala.title,
        description: sala.description,
        status: sala.status,
        questionsLocked: sala.questionsLocked,
      },
      questions: perguntas.map((p) => ({
        id: p.id,
        text: p.text,
        authorName: p.authorName,
        likesCount: p.likesCount,
        isLive: p.isLive,
        answered: p.answered,
        likedByMe: curtidas.has(p.id),
        createdAt: p.createdAt,
        mine: !!voterToken && p.authorToken === voterToken,
      })),
    };
  }

  async criarPergunta(code, { text, authorName, authorToken }) {
    const sala = await this.buscarSalaPorCodigo(code);
    if (sala.status !== 'open') throw new Error('Esta sala está fechada para novas perguntas');
    if (sala.questionsLocked) throw new Error('O envio de novas perguntas está bloqueado no momento');
    if (!text || !text.trim()) throw new Error('Digite sua pergunta');
    if (text.trim().length > 500) throw new Error('Pergunta muito longa (máx. 500 caracteres)');

    return LiveQaQuestion.create({
      sessionId: sala.id,
      text: text.trim(),
      authorName: authorName ? String(authorName).trim().slice(0, 120) : null,
      authorToken: authorToken || null,
      status: 'active',
      likesCount: 0,
    });
  }

  async alternarCurtida(questionId, voterToken) {
    if (!voterToken) throw new Error('Identificador do visitante ausente');
    const pergunta = await LiveQaQuestion.findByPk(questionId);
    if (!pergunta || pergunta.status !== 'active') throw new Error('Pergunta não encontrada');

    return sequelize.transaction(async (t) => {
      const existente = await LiveQaLike.findOne({
        where: { questionId, voterToken },
        transaction: t,
      });

      let liked;
      if (existente) {
        await existente.destroy({ transaction: t });
        liked = false;
      } else {
        await LiveQaLike.create({ questionId, voterToken }, { transaction: t });
        liked = true;
      }

      const total = await LiveQaLike.count({ where: { questionId }, transaction: t });
      pergunta.likesCount = total;
      await pergunta.save({ transaction: t });

      return { liked, likesCount: total };
    });
  }
}

module.exports = new LiveQaService();
