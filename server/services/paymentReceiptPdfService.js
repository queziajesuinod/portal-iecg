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

function buildHtml({ registration, payments }) {
  const buyer = registration.buyerData || {};
  const buyerName = buyer.buyer_name || buyer.nome || buyer.name || '-';
  const buyerDoc = buyer.buyer_document || buyer.cpf || buyer.documento || buyer.cnpj || '';
  const buyerEmail = buyer.buyer_email || buyer.email || '';
  const eventTitle = registration.event?.title || 'Evento';

  const totalPago = payments.reduce((sum, p) => sum + (Number(p.amount) || 0) + (Number(p.taxa) || 0), 0);

  const linhas = payments.map((p, i) => {
    const info = cieloInfo(p);
    const metodo = METHOD_LABELS[p.method] || p.method;
    const ids = [];
    if (p.method === 'credit_card') {
      if (p.cardBrand) ids.push(`Bandeira: ${esc(p.cardBrand)}`);
      if (p.installments) ids.push(`Parcelas: ${esc(p.installments)}x`);
      if (info.authorizationCode) ids.push(`Autorizacao: ${esc(info.authorizationCode)}`);
      if (info.proofOfSale) ids.push(`NSU: ${esc(info.proofOfSale)}`);
      if (info.tid) ids.push(`Tid: ${esc(info.tid)}`);
    } else if (p.method === 'pix') {
      if (p.pixEndToEndId) ids.push(`EndToEndId: ${esc(p.pixEndToEndId)}`);
      else if (p.pixTransactionId) ids.push(`Txid: ${esc(p.pixTransactionId)}`);
    } else if (p.providerPaymentId) {
      ids.push(`Ref.: ${esc(p.providerPaymentId)}`);
    }
    const idsHtml = ids.length ? `<div class="ids">${ids.join(' &nbsp;·&nbsp; ')}</div>` : '';
    const valorLinha = (Number(p.amount) || 0) + (Number(p.taxa) || 0);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(fmtDateTime(p.confirmedAt || p.createdAt))}</td>
        <td>${esc(metodo)}${idsHtml}</td>
        <td class="r">${money(valorLinha)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante de Pagamento</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #111827; }
  .sub { color: #6b7280; margin: 0 0 18px; font-size: 12px; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .label { color: #6b7280; }
  .val { font-weight: 600; color: #111827; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  td.r, th.r { text-align: right; }
  .ids { color: #6b7280; font-size: 10px; margin-top: 3px; }
  .total { display: flex; justify-content: space-between; margin-top: 12px; font-size: 15px; }
  .total .val { color: #16a34a; }
  .foot { color: #9ca3af; font-size: 10px; margin-top: 22px; text-align: center; line-height: 1.5; }
  .badge { display:inline-block; background:#dcfce7; color:#166534; font-weight:700; font-size:11px; padding:3px 10px; border-radius:999px; }
</style></head>
<body>
  <h1>Comprovante de Pagamento</h1>
  <p class="sub">${esc(eventTitle)} &nbsp;·&nbsp; <span class="badge">PAGO</span></p>

  <div class="box">
    <div class="row"><span class="label">Codigo do pedido</span><span class="val">${esc(registration.orderCode)}</span></div>
    <div class="row"><span class="label">Comprador</span><span class="val">${esc(buyerName)}</span></div>
    ${buyerDoc ? `<div class="row"><span class="label">Documento</span><span class="val">${esc(buyerDoc)}</span></div>` : ''}
    ${buyerEmail ? `<div class="row"><span class="label">E-mail</span><span class="val">${esc(buyerEmail)}</span></div>` : ''}
  </div>

  <div class="box">
    <table>
      <thead>
        <tr><th>#</th><th>Data</th><th>Forma de pagamento</th><th class="r">Valor</th></tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="total"><span class="val" style="color:#111827">Total pago</span><span class="val">${money(totalPago)}</span></div>
  </div>

  <p class="foot">
    Documento gerado automaticamente pelo Portal IECG como comprovante dos pagamentos processados.<br>
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
