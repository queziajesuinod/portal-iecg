const liveQaService = require('../services/liveQaService');

function statusErro(error) {
  return /não encontrada|nao encontrada/i.test(error.message) ? 404 : 400;
}

class LiveQaPublicController {
  // GET /api/public/qa/:code
  async entrar(req, res) {
    try {
      const sala = await liveQaService.buscarSalaPorCodigo(req.params.code);
      return res.status(200).json({
        id: sala.id,
        code: sala.code,
        title: sala.title,
        description: sala.description,
        status: sala.status,
        questionsLocked: sala.questionsLocked,
      });
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // GET /api/public/qa/:code/questions?voterToken=...
  async listarPerguntas(req, res) {
    try {
      const data = await liveQaService.listarPerguntasPublico(req.params.code, req.query.voterToken);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // GET /api/public/qa/:code/live
  async perguntaAoVivo(req, res) {
    try {
      const sala = await liveQaService.buscarSalaPorCodigo(req.params.code);
      const pergunta = await liveQaService.perguntaAoVivo(sala.id);
      const proximas = await liveQaService.proximasDaFila(sala.id, pergunta ? pergunta.id : null, 3);
      return res.status(200).json({
        session: {
          code: sala.code, title: sala.title, status: sala.status, liveTheme: sala.liveTheme || null,
        },
        question: pergunta
          ? {
            id: pergunta.id, text: pergunta.text, authorName: pergunta.authorName, likesCount: pergunta.likesCount
          }
          : null,
        upNext: proximas.map((p) => ({
          id: p.id, text: p.text, authorName: p.authorName, likesCount: p.likesCount,
        })),
      });
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // POST /api/public/qa/:code/questions
  async criarPergunta(req, res) {
    try {
      const pergunta = await liveQaService.criarPergunta(req.params.code, req.body || {});
      return res.status(201).json({ id: pergunta.id, text: pergunta.text, likesCount: 0 });
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // POST /api/public/qa/questions/:questionId/like
  async curtir(req, res) {
    try {
      const { voterToken } = req.body || {};
      const result = await liveQaService.alternarCurtida(req.params.questionId, voterToken);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }
}

module.exports = new LiveQaPublicController();
