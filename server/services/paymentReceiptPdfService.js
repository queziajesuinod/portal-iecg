/**
 * Comprovante de pagamento (PDF) gerado a partir dos dados da transacao ja salvos
 * (Cielo: AuthorizationCode / ProofOfSale(NSU) / Tid; PIX: EndToEndId / txid).
 * A Cielo nao entrega um PDF pronto — este comprovante e montado por nos.
 */
const { Op } = require('sequelize');
const {
  Registration, RegistrationPayment, Event
} = require('../models');
const { renderHtmlToPdf } = require('./liabilityTermPdfService');

const METHOD_LABELS = {
  pix: 'PIX',
  credit_card: 'Cartao de Credito',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  pos: 'Maquininha',
  transfer: 'Transferencia',
  manual: 'Manual',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function money(v) {
  const n = Number(v) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function fmtDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString('pt-BR');
}

// Extrai identificadores da Cielo do providerPayload (formatos variados).
function cieloInfo(payment) {
  const pp = payment.providerPayload || {};
  const root = (pp.dadosCompletos && typeof pp.dadosCompletos === 'object') ? pp.dadosCompletos : pp;
  const cieloPay = root.Payment || root.payment || root;
  return {
    authorizationCode: cieloPay.AuthorizationCode || cieloPay.authorizationCode || null,
    proofOfSale: cieloPay.ProofOfSale || cieloPay.proofOfSale || null, // NSU
    tid: cieloPay.Tid || cieloPay.tid || null,
  };
}

async function loadData(registrationId) {
  const registration = await Registration.findByPk(registrationId, {
    include: [{ model: Event, as: 'event', attributes: ['id', 'title', 'startDate'] }],
  });
  if (!registration) return null;

  const payments = await RegistrationPayment.findAll({
    where: {
      registrationId,
      status: 'confirmed',
      amount: { [Op.gt]: 0 },
    },
    order: [['confirmedAt', 'ASC'], ['createdAt', 'ASC']],
  });
  if (!payments.length) return null;

  return { registration, payments };
}

// Rotulos "Meio de pagamento" no estilo Cielo (Cielo2Pix, Cielo Credito...).
function meioPagamento(p) {
  if (p.method === 'pix') return 'Cielo Pix';
  if (p.method === 'credit_card') return 'Cielo Credito';
  if (p.provider === 'cielo') return 'Cielo';
  return METHOD_LABELS[p.method] || p.method;
}

function linhaDado(label, value) {
  return `<div class="row"><span class="label">${esc(label)}</span><span class="val">${esc(value || '---')}</span></div>`;
}

// Um bloco por transacao, no mesmo formato do "Resumo de Transacoes" da Cielo.
function blocoTransacao(p) {
  const info = cieloInfo(p);
  const valorCapturado = (Number(p.amount) || 0) + (Number(p.taxa) || 0);
  const formaLabel = p.method === 'credit_card'
    ? `Cartao de Credito${p.installments && p.installments > 1 ? ` (${p.installments}x)` : ''}`
    : (METHOD_LABELS[p.method] || p.method);

  // Dados da transacao conforme o meio.
  const dadosTransacao = [];
  dadosTransacao.push(linhaDado('ID da transacao', p.providerPaymentId || info.tid));
  if (p.method === 'pix') {
    dadosTransacao.push(linhaDado('Identificador da transacao (txid)', p.pixTransactionId));
    dadosTransacao.push(linhaDado('Codigo End to End (e2eid)', p.pixEndToEndId));
  } else if (p.method === 'credit_card') {
    if (p.cardBrand) dadosTransacao.push(linhaDado('Bandeira', p.cardBrand));
    dadosTransacao.push(linhaDado('Codigo de autorizacao', info.authorizationCode));
    dadosTransacao.push(linhaDado('NSU (ProofOfSale)', info.proofOfSale));
    dadosTransacao.push(linhaDado('Tid', info.tid));
  }

  return `
  <div class="tx">
    <div class="amount">${money(valorCapturado)}</div>
    <div class="when">${esc(fmtDateTime(p.confirmedAt || p.createdAt))}</div>

    <div class="grp">
      <div class="row"><span class="label">Situacao</span><span class="badge">Paga</span></div>
      ${linhaDado('Valor Capturado', money(valorCapturado))}
      ${linhaDado('Valor Cancelado / Estornado', '---')}
    </div>

    <div class="grp">
      ${linhaDado('Meio de pagamento', meioPagamento(p))}
      ${linhaDado('Forma de pagamento', formaLabel)}
    </div>

    <div class="grp">
      <h3>Dados da Transacao</h3>
      ${dadosTransacao.join('')}
    </div>
  </div>`;
}

function buildHtml({ registration, payments }) {
  const buyer = registration.buyerData || {};
  const buyerName = buyer.buyer_name || buyer.nome || buyer.name || '-';
  const buyerDoc = buyer.buyer_document || buyer.cpf || buyer.documento || buyer.cnpj || '';
  const buyerCity = buyer.buyer_city || buyer.cidade || buyer.city || '';
  const eventTitle = registration.event?.title || 'Evento';

  const totalPago = payments.reduce((sum, p) => sum + (Number(p.amount) || 0) + (Number(p.taxa) || 0), 0);
  const blocos = payments.map(blocoTransacao).join('');
  const totalHtml = payments.length > 1
    ? `<div class="total"><span>Total pago (${payments.length} pagamentos)</span><span>${money(totalPago)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante de Pagamento</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; }
  h1 { font-size: 17px; margin: 0 0 2px; color: #111827; }
  h3 { font-size: 12px; margin: 12px 0 6px; color: #111827; }
  .sub { color: #6b7280; margin: 0 0 18px; font-size: 12px; }
  .grp { padding: 8px 0; border-bottom: 1px solid #eef0f2; }
  .grp:last-child { border-bottom: 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin: 4px 0; }
  .label { color: #6b7280; }
  .val { font-weight: 600; color: #111827; text-align: right; word-break: break-all; }
  .tx { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin-bottom: 16px; }
  .amount { font-size: 22px; font-weight: 700; color: #111827; }
  .when { color: #6b7280; margin: 0 0 10px; }
  .badge { display:inline-block; background:#dcfce7; color:#166534; font-weight:700; font-size:11px; padding:3px 12px; border-radius:999px; }
  .total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: #111827; padding: 8px 2px; }
  .foot { color: #9ca3af; font-size: 10px; margin-top: 18px; text-align: center; line-height: 1.5; }
</style></head>
<body>
  <h1>Comprovante de Pagamento</h1>
  <p class="sub">${esc(eventTitle)} &nbsp;·&nbsp; Pedido ${esc(registration.orderCode)}</p>

  <div class="tx">
    <h3 style="margin-top:0">Dados do comprador</h3>
    ${linhaDado('Nome do cliente', buyerName)}
    ${linhaDado('Documento (CPF/CNPJ)', buyerDoc)}
    ${linhaDado('Cidade', buyerCity)}
  </div>

  ${blocos}
  ${totalHtml}

  <p class="foot">
    Documento gerado pelo Portal IECG como comprovante dos pagamentos processados via Cielo.<br>
    Nao possui valor fiscal. Emitido em ${esc(fmtDateTime(new Date()))}.
  </p>
</body></html>`;
}

async function generateForRegistration(registrationId) {
  const data = await loadData(registrationId);
  if (!data) return null;
  const html = buildHtml(data);
  return renderHtmlToPdf(html);
}

async function registrationHasConfirmedPayment(registrationId) {
  const count = await RegistrationPayment.count({
    where: { registrationId, status: 'confirmed', amount: { [Op.gt]: 0 } }
  });
  return count > 0;
}

async function findRegistrationByOrderCode(orderCode) {
  return Registration.findOne({ where: { orderCode }, attributes: ['id', 'orderCode', 'eventId'] });
}

module.exports = {
  generateForRegistration,
  registrationHasConfirmedPayment,
  findRegistrationByOrderCode,
};
