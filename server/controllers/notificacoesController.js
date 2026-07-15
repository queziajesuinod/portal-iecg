const NotificationGroupService = require('../services/notificationGroupService');
const NotificationTemplateService = require('../services/notificationTemplateService');
const NotificationCampaignService = require('../services/notificationCampaignService');
const { previewAudienceCount } = require('../services/notificationAudienceService');

function getUserId(req) {
  return req.user?.id || null;
}

// ── Grupos ────────────────────────────────────────────────────────────────────

async function listarGrupos(req, res) {
  try {
    const grupos = await NotificationGroupService.listar();
    return res.json(grupos);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

async function buscarGrupo(req, res) {
  try {
    const grupo = await NotificationGroupService.buscarPorId(req.params.id);
    return res.json(grupo);
  } catch (err) {
    return res.status(404).json({ erro: err.message });
  }
}

async function criarGrupo(req, res) {
  try {
    const grupo = await NotificationGroupService.criar(req.body, getUserId(req));
    return res.status(201).json(grupo);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function atualizarGrupo(req, res) {
  try {
    const grupo = await NotificationGroupService.atualizar(req.params.id, req.body, getUserId(req));
    return res.json(grupo);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function deletarGrupo(req, res) {
  try {
    const result = await NotificationGroupService.deletar(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function previewGrupo(req, res) {
  try {
    const result = await NotificationGroupService.preview(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function previewFiltroLivre(req, res) {
  try {
    const { sources, deduplicateBy } = req.body;
    const result = await previewAudienceCount(sources || [], deduplicateBy || 'phone');
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

async function listarTemplates(req, res) {
  try {
    const { channel, context } = req.query;
    return res.json(await NotificationTemplateService.listar({ channel, context }));
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

async function buscarTemplate(req, res) {
  try {
    return res.json(await NotificationTemplateService.buscarPorId(req.params.id));
  } catch (err) {
    return res.status(404).json({ erro: err.message });
  }
}

async function criarTemplate(req, res) {
  try {
    const template = await NotificationTemplateService.criar(req.body, getUserId(req));
    return res.status(201).json(template);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function atualizarTemplate(req, res) {
  try {
    const template = await NotificationTemplateService.atualizar(req.params.id, req.body, getUserId(req));
    return res.json(template);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function deletarTemplate(req, res) {
  try {
    return res.json(await NotificationTemplateService.deletar(req.params.id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

// ── Campanhas ─────────────────────────────────────────────────────────────────

async function listarCampanhas(req, res) {
  try {
    return res.json(await NotificationCampaignService.listar(req.query));
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

async function buscarCampanha(req, res) {
  try {
    return res.json(await NotificationCampaignService.buscarPorId(req.params.id));
  } catch (err) {
    return res.status(404).json({ erro: err.message });
  }
}

async function criarCampanha(req, res) {
  try {
    const campanha = await NotificationCampaignService.criar(req.body, getUserId(req));
    return res.status(201).json(campanha);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function atualizarCampanha(req, res) {
  try {
    const campanha = await NotificationCampaignService.atualizar(req.params.id, req.body, getUserId(req));
    return res.json(campanha);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function deletarCampanha(req, res) {
  try {
    return res.json(await NotificationCampaignService.deletar(req.params.id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function previewCampanha(req, res) {
  try {
    return res.json(await NotificationCampaignService.previewAudiencia(req.params.id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function dispararCampanha(req, res) {
  try {
    const campaign = await NotificationCampaignService.buscarPorId(req.params.id);
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({ erro: 'Campanha já foi enviada ou está em andamento' });
    }
    // Fire-and-forget: o cliente acompanha pelo monitor
    NotificationCampaignService.disparar(req.params.id).catch((err) => {
      console.error(`[Campanha ${req.params.id}] Erro no disparo:`, err.message);
    });
    return res.json({ mensagem: 'Disparo iniciado. Acompanhe o progresso pelo monitor.' });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function monitorarCampanha(req, res) {
  try {
    return res.json(await NotificationCampaignService.monitorar(req.params.id));
  } catch (err) {
    return res.status(404).json({ erro: err.message });
  }
}

async function pararCampanha(req, res) {
  try {
    return res.json(await NotificationCampaignService.cancelar(req.params.id));
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

async function listarDestinatarios(req, res) {
  try {
    const result = await NotificationCampaignService.listarDestinatarios(req.params.id, req.query);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

// ── Rastreamento de abertura de e-mail (público, sem auth) ──────────────────────
// GIF transparente 1x1 servido para o pixel de rastreamento.
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

async function trackOpen(req, res) {
  try {
    await NotificationCampaignService.registrarAbertura(req.params.recipientId);
  } catch (err) {
    // Nunca falha o pixel: rastreamento é best-effort.
    console.error('[Notificacoes] Erro ao registrar abertura:', err.message);
  }
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  return res.end(TRACKING_PIXEL);
}

// ── Sequências ────────────────────────────────────────────────────────────────
const NotificationSequenceService = require('../services/notificationSequenceService');

async function listarSequencias(req, res) {
  try { return res.json(await NotificationSequenceService.listar()); } catch (err) { return res.status(500).json({ erro: err.message }); }
}

async function buscarSequencia(req, res) {
  try { return res.json(await NotificationSequenceService.buscarPorId(req.params.id)); } catch (err) { return res.status(404).json({ erro: err.message }); }
}

async function criarSequencia(req, res) {
  try {
    const seq = await NotificationSequenceService.criar(req.body, getUserId(req));
    return res.status(201).json(seq);
  } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function atualizarSequencia(req, res) {
  try {
    const seq = await NotificationSequenceService.atualizar(req.params.id, req.body, getUserId(req));
    return res.json(seq);
  } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function deletarSequencia(req, res) {
  try { return res.json(await NotificationSequenceService.deletar(req.params.id)); } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function ativarSequencia(req, res) {
  try { return res.json(await NotificationSequenceService.ativar(req.params.id)); } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function pausarSequencia(req, res) {
  try { return res.json(await NotificationSequenceService.pausar(req.params.id)); } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function dispararStep(req, res) {
  try {
    const step = await NotificationSequenceService.buscarPorId(req.params.id)
      .then((s) => s.steps.find((st) => st.id === req.params.stepId));
    if (!step) return res.status(404).json({ erro: 'Step não encontrado' });
    if (step.status !== 'pending') return res.status(400).json({ erro: 'Step já foi disparado ou está em andamento' });
    NotificationSequenceService.dispararStep(req.params.stepId).catch((err) => {
      console.error(`[Step ${req.params.stepId}] Erro:`, err.message);
    });
    return res.json({ mensagem: 'Disparo do step iniciado. Acompanhe pelo monitor.' });
  } catch (err) { return res.status(400).json({ erro: err.message }); }
}

async function monitorarStep(req, res) {
  try { return res.json(await NotificationSequenceService.monitorarStep(req.params.stepId)); } catch (err) { return res.status(404).json({ erro: err.message }); }
}

module.exports = {
  listarGrupos,
  buscarGrupo,
  criarGrupo,
  atualizarGrupo,
  deletarGrupo,
  previewGrupo,
  previewFiltroLivre,
  listarTemplates,
  buscarTemplate,
  criarTemplate,
  atualizarTemplate,
  deletarTemplate,
  listarCampanhas,
  buscarCampanha,
  criarCampanha,
  atualizarCampanha,
  deletarCampanha,
  previewCampanha,
  dispararCampanha,
  monitorarCampanha,
  pararCampanha,
  listarDestinatarios,
  trackOpen,
  listarSequencias,
  buscarSequencia,
  criarSequencia,
  atualizarSequencia,
  deletarSequencia,
  ativarSequencia,
  pausarSequencia,
  dispararStep,
  monitorarStep
};
