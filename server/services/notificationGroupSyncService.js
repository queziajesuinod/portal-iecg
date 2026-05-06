const { literal } = require('sequelize');
const { NotificationGroup } = require('../models');
const { resolveAudience } = require('./notificationAudienceService');

// Debounce map: evita múltiplos refreshes simultâneos para o mesmo grupo
const inFlight = new Set();

async function refreshGroupPreview(group) {
  if (inFlight.has(group.id)) return;
  inFlight.add(group.id);
  try {
    const recipients = await resolveAudience(group.sources || [], group.deduplicateBy || 'phone');
    await NotificationGroup.update(
      { previewCount: recipients.length, previewUpdatedAt: new Date() },
      { where: { id: group.id } }
    );
  } catch {
    // silencioso — não bloqueia o fluxo principal
  } finally {
    inFlight.delete(group.id);
  }
}

async function syncGroupsForSourceType(sourceType) {
  try {
    // Sanitize para evitar SQL injection (sourceType vem de constante interna, mas por segurança)
    const safe = sourceType.replace(/[^a-z_]/g, '');
    const groups = await NotificationGroup.findAll({
      where: literal(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(sources) elem
        WHERE elem->>'type' = '${safe}'
      )`)
    });
    // fire-and-forget para cada grupo correspondente
    groups.forEach((g) => refreshGroupPreview(g));
  } catch {
    // silencioso
  }
}

module.exports = { syncGroupsForSourceType, refreshGroupPreview };
