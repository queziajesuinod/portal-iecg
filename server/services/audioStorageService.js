const fs = require('fs/promises');
const path = require('path');

function getAudioRoot() {
  return process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'audios');
}

async function ensureRoot() {
  const root = getAudioRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

function getExtensionFromName(name) {
  const ext = path.extname(name || '').toLowerCase().replace('.', '');
  const allowed = new Set(['mp3', 'm4a', 'wav', 'ogg', 'opus', 'aac', 'flac']);
  if (ext && allowed.has(ext)) return ext;
  return 'mp3';
}

async function saveAudio(videoId, srcPath, originalName) {
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

async function removeAudio(audioPath) {
  if (!audioPath) return;
  await fs.unlink(audioPath).catch(() => {});
}

module.exports = {
  getAudioRoot,
  ensureRoot,
  saveAudio,
  removeAudio,
};
