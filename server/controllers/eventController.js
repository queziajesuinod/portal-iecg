const eventService = require('../services/eventService');

async function listar(req, res) {
  try {
    const eventos = await eventService.listarEventos();
    res.status(200).json(eventos);
  } catch (err) {
    console.error('Erro ao listar eventos:', err);
    res.status(500).json({ message: 'Erro ao listar eventos' });
  }
}

async function estatisticas(req, res) {
  try {
    const stats = await eventService.obterEstatisticasGerais();
    res.status(200).json(stats);
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
}

async function resumoIngressos(req, res) {
  try {
    const summary = await eventService.obterResumoIngressosPorEvento(req.params.eventId);
    res.status(200).json(summary);
  } catch (err) {
    console.error('Erro ao obter resumo de ingressos do evento:', err);
    res.status(500).json({ message: 'Erro ao obter resumo de ingressos do evento' });
  }
}

async function buscarPorId(req, res) {
  try {
    const evento = await eventService.buscarEventoPorId(req.params.id);
    res.status(200).json(evento);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function criar(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const evento = await eventService.criarEvento(req.body, userId);
    return res.status(201).json(evento);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const evento = await eventService.atualizarEvento(req.params.id, req.body);
    res.status(200).json(evento);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await eventService.deletarEvento(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function duplicar(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const novoEvento = await eventService.duplicarEvento(req.params.id, userId);
    return res.status(201).json(novoEvento);
  } catch (err) {
    console.error('Erro ao duplicar evento:', err);
    return res.status(400).json({ message: err.message });
  }
}

// Rotas públicas
async function listarPublicos(req, res) {
  try {
    const eventos = await eventService.listarEventosPublicos();
    res.status(200).json(eventos);
  } catch (err) {
    console.error('Erro ao listar eventos públicos:', err);
    res.status(500).json({ message: 'Erro ao listar eventos' });
  }
}

async function buscarPublicoPorId(req, res) {
  try {
    const evento = await eventService.buscarEventoPublicoPorId(req.params.id);
    res.status(200).json(evento);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  listarPublicos,
  buscarPublicoPorId,
  estatisticas,
  resumoIngressos,
  duplicar
};
