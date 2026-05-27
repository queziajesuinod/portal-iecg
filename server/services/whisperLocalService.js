const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const crypto = require('crypto');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'whisper_transcribe.py');

function getPythonBin() {
  return process.env.WHISPER_PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
}

function getModel() {
  return process.env.WHISPER_MODEL || 'large-v3';
}

function parseProgressLines(buffer, onEvent) {
  const lines = buffer.split('\n');
  const remainder = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
    try {
      const evt = JSON.parse(trimmed);
      if (evt && evt.event) onEvent(evt);
    } catch (_) {
      // ignora linhas que nao sao JSON
    }
  }
  return remainder;
}

let activeProcess = null;

async function transcribeAudioFile(audioPath, { languageHint = 'pt', onProgress } = {}) {
  const pythonBin = getPythonBin();
  const model = getModel();
  const id = crypto.randomBytes(4).toString('hex');
  const outputJsonPath = path.join(os.tmpdir(), `whisper-${id}.json`);

  const args = [SCRIPT_PATH, audioPath, model, outputJsonPath];
  if (languageHint) args.push(languageHint);

  await new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    activeProcess = proc;
    let stderr = '';
    let progressBuffer = '';

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (process.env.WHISPER_VERBOSE === 'true') {
        process.stderr.write(`[whisper] ${text}`);
      }
      if (onProgress) {
        progressBuffer = parseProgressLines(progressBuffer + text, onProgress);
      }
    });
    proc.on('error', (err) => {
      activeProcess = null;
      if (err.code === 'ENOENT') {
        reject(new Error(`Python nao encontrado (${pythonBin}). Ajuste WHISPER_PYTHON_PATH.`));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code, signal) => {
      activeProcess = null;
      if (code === 0) resolve();
      else if (signal) reject(new Error(`Whisper interrompido (signal ${signal})`));
      else reject(new Error(`Whisper falhou (exit ${code}): ${stderr.slice(-500)}`));
    });
  });

  const raw = await fs.readFile(outputJsonPath, 'utf8');
  await fs.unlink(outputJsonPath).catch(() => {});
  return JSON.parse(raw);
}

function killActiveTranscription() {
  if (activeProcess && !activeProcess.killed) {
    activeProcess.kill('SIGTERM');
    return true;
  }
  return false;
}

module.exports = {
  transcribeAudioFile,
  killActiveTranscription,
};
