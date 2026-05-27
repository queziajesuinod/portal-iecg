const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const NETSCAPE_HEADER = '# Netscape HTTP Cookie File\n# Gerado pelo Portal IECG\n\n';

function jsonToNetscape(jsonInput) {
  const parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
  if (!Array.isArray(parsed)) {
    throw new Error('JSON de cookies deve ser um array');
  }

  const lines = [NETSCAPE_HEADER];
  for (const cookie of parsed) {
    if (!cookie?.name || cookie?.value === undefined) continue;

    const domain = String(cookie.domain || '');
    if (!domain) continue;

    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const cookiePath = cookie.path || '/';
    const secure = cookie.secure ? 'TRUE' : 'FALSE';
    const expiry = Number.isFinite(cookie.expirationDate)
      ? Math.floor(cookie.expirationDate)
      : 0;
    const name = String(cookie.name);
    const value = String(cookie.value);

    lines.push(`${domain}\t${includeSubdomains}\t${cookiePath}\t${secure}\t${expiry}\t${name}\t${value}\n`);
  }

  return lines.join('');
}

function detectAndNormalize(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Conteúdo de cookies vazio');
  }
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('Conteúdo de cookies vazio');
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return jsonToNetscape(trimmed);
  }
  if (trimmed.startsWith('#') || /^[^\s]+\s+(TRUE|FALSE)\s+\//.test(trimmed.split('\n').find((l) => l.trim() && !l.startsWith('#')) || '')) {
    return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
  }
  throw new Error('Formato de cookies não reconhecido. Cole JSON (extensão Chrome) ou texto Netscape (cookies.txt).');
}

function summarize(normalized) {
  const lines = normalized.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const domains = new Set();
  for (const line of lines) {
    const domain = line.split('\t')[0];
    if (domain) domains.add(domain);
  }
  return {
    cookieCount: lines.length,
    domains: Array.from(domains),
  };
}

async function writeCookiesToTempFile(netscapeContent) {
  const tmpDir = path.join(os.tmpdir(), 'iecg-yt-cookies');
  await fs.mkdir(tmpDir, { recursive: true });
  const id = crypto.randomBytes(6).toString('hex');
  const filePath = path.join(tmpDir, `cookies-${id}.txt`);
  await fs.writeFile(filePath, netscapeContent, { encoding: 'utf8', mode: 0o600 });
  return filePath;
}

async function cleanupCookiesFile(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

function getGlobalCookiesPath() {
  return process.env.YT_DLP_COOKIES_PATH || null;
}

module.exports = {
  jsonToNetscape,
  detectAndNormalize,
  summarize,
  writeCookiesToTempFile,
  cleanupCookiesFile,
  getGlobalCookiesPath,
};
