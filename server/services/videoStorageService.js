const fs = require('fs/promises');
const path = require('path');

// Armazena o video completo baixado pelo helper, para gerar recortes/Shorts (Fase 2+).
// O arquivo e temporario: fica ate os clips serem produzidos/publicados e depois pode ser removido.
function getVideoRoot() {
  return process.env.VIDEO_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'videos');
}

async function ensureRoot() {
  const root = getVideoRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

function getExtensionFromName(name) {
  const ext = path.extname(name || '').toLowerCase().replace('.', '');
  const allowed = new Set(['mp4', 'mkv', 'webm', 'mov', 'm4v']);
  if (ext && allowed.has(ext)) return ext;
  return 'mp4';
}

async function saveVideo(videoId, srcPath, originalName) {
  const root = await ensureRoot();
  const ext = getExtensionFromName(originalName);
  const finalPath = path.join(root, `${videoId}.${ext}`);

  await fs.rename(srcPath, finalPath).catch(async (err) => {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(srcPath, finalPath);
    await fs.unlink(srcPath).catch(() => {});
  });

  const stat = await fs.stat(finalPath);
  return { path: finalPath, size: stat.size, ext };
}

async function removeVideo(videoPath) {
  if (!videoPath) return;
  await fs.unlink(videoPath).catch(() => {});
}

module.exports = {
  getVideoRoot,
  ensureRoot,
  saveVideo,
  removeVideo,
};
