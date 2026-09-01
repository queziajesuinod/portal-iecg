const {
  Registration,
  RegistrationTermAcceptance,
  RegistrationAttendee,
  EventLiabilityTerm,
} = require('../models');

// Reaproveita uma unica instancia do browser (lazy). Carregamento e' opcional:
// - PUPPETEER_EXECUTABLE_PATH definido -> usa puppeteer-core + Chrome/Chromium do sistema
//   (leve, sem baixar Chromium; ideal para Docker/produção).
// - Sem a variavel -> usa o puppeteer completo (Chromium empacotado; bom para dev local).
let _browserPromise = null;

function resolvePuppeteer() {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH
    || process.env.CHROME_PATH
    || process.env.CHROME_BIN
    || null;

  const tryRequire = (name) => {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(name);
    } catch (_) {
      return null;
    }
  };

  // Com caminho definido, preferimos puppeteer-core (leve); caimos para puppeteer se existir.
  const lib = execPath
    ? (tryRequire('puppeteer-core') || tryRequire('puppeteer'))
    : (tryRequire('puppeteer') || tryRequire('puppeteer-core'));

  if (!lib) {
    throw new Error(
      'PDF do termo indisponivel: instale "puppeteer" (dev) ou defina PUPPETEER_EXECUTABLE_PATH '
      + 'apontando para o Chrome/Chromium do sistema e instale "puppeteer-core".'
    );
  }
  return { lib, execPath };
}

async function getBrowser() {
  if (!_browserPromise) {
    const { lib, execPath } = resolvePuppeteer();
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    };
    if (execPath) launchOptions.executablePath = execPath;
    _browserPromise = lib.launch(launchOptions).catch((err) => {
      _browserPromise = null;
      throw err;
    });
  }
  return _browserPromise;
}

function fmtDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString('pt-BR');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Monta o documento com o conteudo "achatado" (paragrafos do snapshot + bloco de
// assinatura por participante, separados por marcadores de quebra). A paginacao em
// folhas A4 (com a marca d'agua ao fundo) e' feita no proprio navegador (page.evaluate),
// reproduzindo exatamente o que aparece na tela do check-in.
function buildDoc({ acceptances }) {
  const blocos = acceptances.map((a, i) => {
    const brk = i > 0 ? '<div data-pagebreak="1"></div>' : '';
    const sig = a.signatureImage
      ? `<div class="sig-img"><img src="${a.signatureImage}" alt="assinatura"></div>`
      : '';
    const metaLinhas = [
      a.signerName ? `Responsável: ${esc(a.signerName)}` : '',
      a.signerDocument ? `CPF: ${esc(a.signerDocument)}` : '',
      (a.emergencyContactName || a.emergencyContactPhone)
        ? `Contato de emergência: ${esc(a.emergencyContactName || '')}${a.emergencyContactPhone ? ` — ${esc(a.emergencyContactPhone)}` : ''}`
        : '',
      a.acceptedAt ? `Assinado em ${esc(fmtDateTime(a.acceptedAt))}` : '',
    ].filter(Boolean).join('<br>');
    const sigBloco = `<div class="sig">${sig}<div class="sig-line"></div><div class="sig-meta">${metaLinhas}</div></div>`;
    return `${brk}${a.termSnapshotHtml || ''}${sigBloco}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .sheet { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: #fff; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .wm { position: absolute; top: 0; left: 0; width: 100%; height: auto; display: block; }
  .layer { position: absolute; overflow: hidden; font-size: 11px; line-height: 1.4; color: #000; }
  .layer p { margin: 4px 0; }
  .layer ul { list-style: disc; padding-left: 18px; margin: 4px 0; }
  .layer ol { list-style: decimal; padding-left: 18px; margin: 4px 0; }
  .layer li { display: list-item; }
  .sig { margin-top: 22px; }
  .sig-img img { max-height: 90px; display: block; }
  .sig-line { border-top: 1px solid #000; width: 220px; margin-top: 6px; }
  .sig-meta { font-size: 9px; color: #222; margin-top: 6px; }
</style></head>
<body>
  <div id="measure" class="layer"></div>
  <div id="pages"></div>
</body></html>`
    .replace('<div id="measure" class="layer"></div>', `<div id="measure" class="layer">${blocos}</div>`);
}

// Executado DENTRO do navegador: mede os blocos e monta as folhas A4 com marca d'agua + texto.
function paginateInBrowser({ bg, top, bottom }) {
  const MMPX = 96 / 25.4;
  const sheetW = 210 * MMPX;
  const sheetH = 297 * MMPX;
  const side = 0.08;
  const layerLeft = sheetW * side;
  const layerWidth = sheetW * (1 - 2 * side);
  const layerTop = sheetH * (top / 100);
  const layerBottom = sheetH * (bottom / 100);
  const layerHeight = sheetH - layerTop - layerBottom;

  const measure = document.getElementById('measure');
  measure.style.cssText = `position:absolute;left:-99999px;top:0;width:${layerWidth}px;`;
  const blocks = Array.prototype.slice.call(measure.children);

  const tmp = document.createElement('div');
  tmp.className = 'layer';
  tmp.style.cssText = `position:absolute;left:-99999px;top:0;width:${layerWidth}px;`;
  document.body.appendChild(tmp);

  const pages = [];
  const flush = () => { if (tmp.childNodes.length) { pages.push(tmp.innerHTML); tmp.innerHTML = ''; } };
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.getAttribute('data-pagebreak') != null) { flush(); continue; }
    const clone = b.cloneNode(true);
    tmp.appendChild(clone);
    if (tmp.scrollHeight > layerHeight && tmp.childNodes.length > 1) {
      tmp.removeChild(clone);
      flush();
      tmp.appendChild(clone);
    }
  }
  flush();
  tmp.parentNode.removeChild(tmp);
  measure.parentNode.removeChild(measure);

  const wm = bg ? `<img class="wm" src="${bg}">` : '';
  const layerStyle = `left:${layerLeft}px;right:${layerLeft}px;top:${layerTop}px;bottom:${layerBottom}px;`;
  document.getElementById('pages').innerHTML = pages
    .map((html) => `<div class="sheet">${wm}<div class="layer" style="${layerStyle}">${html}</div></div>`)
    .join('');
}

async function loadData(registrationId) {
  const acceptances = await RegistrationTermAcceptance.findAll({
    where: { registrationId },
    include: [{
      model: RegistrationAttendee, as: 'attendee', required: false, attributes: ['id', 'attendeeNumber']
    }],
    order: [['acceptedAt', 'ASC']],
  });
  if (!acceptances.length) return null;

  const termId = acceptances[0].eventLiabilityTermId;
  let term = null;
  if (termId) term = await EventLiabilityTerm.findByPk(termId);
  if (!term) {
    term = await EventLiabilityTerm.findOne({ where: { eventId: acceptances[0].eventId, isActive: true } });
  }
  return { term, acceptances };
}

// Gera o PDF (Buffer) do termo assinado de uma inscricao. Retorna null se nao houver termo.
async function generateForRegistration(registrationId) {
  const data = await loadData(registrationId);
  if (!data) return null;

  const term = data.term || {};
  const html = buildDoc(data);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    // Pagina no navegador: monta as folhas A4 com marca d'agua + texto nos offsets.
    await page.evaluate(paginateInBrowser, {
      bg: term.backgroundImageUrl || null,
      top: Number(term.contentTopOffset) || 0,
      bottom: Number(term.contentBottomOffset) || 0,
    });
    // Aguarda a marca d'agua (data-URL) decodificar em cada folha.
    await page.evaluate(() => Promise.all(
      Array.prototype.slice.call(document.images).map((img) => (img.complete
        ? Promise.resolve()
        : new Promise((res) => { img.onload = res; img.onerror = res; }))),
    ));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm', bottom: '0mm', left: '0mm', right: '0mm',
      },
    });
    // Puppeteer v23 retorna Uint8Array; convertemos para Buffer (Express/nodemailer tratam como binario).
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

// True se a inscricao tem termo assinado (para expor botao/anexo).
async function registrationHasSignedTerm(registrationId) {
  const count = await RegistrationTermAcceptance.count({ where: { registrationId } });
  return count > 0;
}

// Busca a inscricao por orderCode (para a rota publica de download).
async function findRegistrationByOrderCode(orderCode) {
  return Registration.findOne({ where: { orderCode }, attributes: ['id', 'orderCode', 'eventId'] });
}

module.exports = {
  generateForRegistration,
  registrationHasSignedTerm,
  findRegistrationByOrderCode,
  buildDoc,
};
