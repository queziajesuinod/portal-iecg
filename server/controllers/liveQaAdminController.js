const liveQaService = require('../services/liveQaService');

function statusErro(error) {
  return /não encontrada|nao encontrada/i.test(error.message) ? 404 : 400;
}

class LiveQaAdminController {
  // GET /api/admin/qa/sessions
  async listarSalas(req, res) {
    try {
      const salas = await liveQaService.listarSalas();
      return res.status(200).json(salas);
    } catch (error) {
      return res.status(400).json({ erro: error.message });
    }
  }

  // POST /api/admin/qa/sessions
  async criarSala(req, res) {
    try {
      const createdBy = req.user && (req.user.id || req.user.userId);
      const sala = await liveQaService.criarSala({ ...req.body, createdBy });
      return res.status(201).json(sala);
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // PUT /api/admin/qa/sessions/:id
  async atualizarSala(req, res) {
    try {
      const sala = await liveQaService.atualizarSala(req.params.id, req.body || {});
      return res.status(200).json(sala);
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // DELETE /api/admin/qa/sessions/:id
  async excluirSala(req, res) {
    try {
      await liveQaService.excluirSala(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // GET /api/admin/qa/sessions/:id/questions
  async listarPerguntas(req, res) {
    try {
      const perguntas = await liveQaService.listarPerguntasAdmin(req.params.id);
      const aoVivo = await liveQaService.perguntaAoVivo(req.params.id);
      return res.status(200).json({ questions: perguntas, liveQuestionId: aoVivo ? aoVivo.id : null });
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // PATCH /api/admin/qa/questions/:questionId
  async moderarPergunta(req, res) {
    try {
      const pergunta = await liveQaService.moderarPergunta(req.params.questionId, req.body || {});
      return res.status(200).json(pergunta);
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // DELETE /api/admin/qa/questions/:questionId
  async excluirPergunta(req, res) {
    try {
      await liveQaService.excluirPergunta(req.params.questionId);
      return res.status(204).send();
    } catch (error) {
      return res.status(statusErro(error)).json({ erro: error.message });
    }
  }

  // POST /api/admin/qa/upload-bg  (multipart, campo "file")
  async uploadBackground(req, res) {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    // O multer já salvou em public/uploads/qa com nome único; serve via express.static('public')
    return res.status(201).json({ url: `/uploads/qa/${req.file.filename}` });
  }
}

module.exports = new LiveQaAdminController();
