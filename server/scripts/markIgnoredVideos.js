require('dotenv').config();
const { Op } = require('sequelize');
const { YoutubeVideo, VideoTranscript, sequelize } = require('../models');

function getFilters() {
  const minDuration = Number(process.env.SYNC_MIN_DURATION_SECONDS);
  return {
    minDurationSeconds: Number.isFinite(minDuration) && minDuration >= 0 ? minDuration : 900,
  };
}

async function run() {
  const filters = getFilters();
  console.log(`[cleanup] Filtros: duração mínima = ${filters.minDurationSeconds}s (${Math.round(filters.minDurationSeconds / 60)}min)`);
  console.log('[cleanup] Buscando vídeos curtos não ignorados ainda...');

  await sequelize.authenticate();

  // Acha videos curtos que ainda nao estao ignorados
  const candidates = await YoutubeVideo.findAll({
    where: {
      ignored: false,
      [Op.or]: [
        { durationSeconds: null },
        { durationSeconds: { [Op.lt]: filters.minDurationSeconds } },
      ],
    },
    include: [{
      model: VideoTranscript,
      as: 'transcript',
      attributes: ['id', 'transcript'],
    }],
  });

  if (!candidates.length) {
    console.log('[cleanup] Nenhum vídeo precisa ser marcado. Tudo certo.');
    await sequelize.close();
    return;
  }

  let marked = 0;
  let preserved = 0;

  for (const video of candidates) {
    const hasTranscript = Boolean(video.transcript?.transcript?.trim());
    if (hasTranscript) {
      preserved += 1;
      console.log(`  ⊘ preservado (já tem transcrição): "${video.title}" (${video.durationSeconds || 0}s)`);
      continue;
    }
    await video.update({ ignored: true, ignoreReason: 'too_short' });
    marked += 1;
    console.log(`  ✓ ignorado: "${video.title}" (${video.durationSeconds || 0}s)`);
  }

  console.log('\n[cleanup] Resumo:');
  console.log(`  ${marked} vídeo(s) marcado(s) como ignorado(s) por duração.`);
  if (preserved) {
    console.log(`  ${preserved} vídeo(s) preservado(s) (já têm transcrição).`);
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error('[cleanup] Erro:', err);
  process.exit(1);
});
