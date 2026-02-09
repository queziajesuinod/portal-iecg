const EfiPay = require('sdk-node-apis-efi');
const { v4: uuidv4 } = require('uuid');

const ENVIRONMENT = (process.env.EFI_ENVIRONMENT || 'sandbox').toLowerCase();
const IS_SANDBOX = ENVIRONMENT !== 'production';
const COMMISSION_PERCENT = Number.parseFloat(process.env.EFI_COMMISSION_PERCENT || '1.5');
const FAVORECIDO_CHAVE = process.env.EFI_PIX_FAVORECIDO_CHAVE;
const PAGADOR_CHAVE = process.env.EFI_PIX_PAGADOR_CHAVE;
const INFO_PAGADOR_DEFAULT = process.env.EFI_PIX_INFO_PAGADOR || 'Comissão Efipay';
const ID_PREFIX = process.env.EFI_PIX_ID_PREFIX || 'efi-commission';
const PIX_API_BASE_URL = IS_SANDBOX
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br';
const LOG_PIX_URL = process.env.DEBUG_EFI_PIX_URL === 'true';

const efiOptions = {
  sandbox: IS_SANDBOX,
  client_id: process.env.EFI_CLIENT_ID || '',
  client_secret: process.env.EFI_CLIENT_SECRET || '',
  partner_token: process.env.EFI_PARTNER_TOKEN,
  cache: process.env.EFI_CACHE_TOKEN !== 'false',
  validateMtls: process.env.EFI_VALIDATE_MTLS !== 'false'
};

if (process.env.EFI_CERTIFICATE_BASE64) {
  efiOptions.certificate = process.env.EFI_CERTIFICATE_BASE64;
  efiOptions.cert_base64 = true;
} else if (process.env.EFI_CERTIFICATE_PATH) {
  efiOptions.certificate = process.env.EFI_CERTIFICATE_PATH;
}

if (process.env.EFI_PEM_KEY_BASE64) {
  efiOptions.pemKey = process.env.EFI_PEM_KEY_BASE64;
} else if (process.env.EFI_PEM_KEY_PATH) {
  efiOptions.pemKey = process.env.EFI_PEM_KEY_PATH;
}

let efipayClient;
function getEfiClient() {
  if (!efipayClient) {
    efipayClient = new EfiPay(efiOptions);
  }
  return efipayClient;
}

function isCommissionEnabled() {
  return (
    COMMISSION_PERCENT > 0 &&
    efiOptions.client_id &&
    efiOptions.client_secret &&
    PAGADOR_CHAVE &&
    FAVORECIDO_CHAVE
  );
}

function normalizeError(error) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error?.mensagem) return error.mensagem;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  if (error?.dados) return JSON.stringify(error.dados);
  return JSON.stringify(error);
}

function calcularComissaoCentavos(valorCentavos) {
  if (!Number.isFinite(valorCentavos)) {
    return 0;
  }
  return Math.max(Math.round(valorCentavos * (COMMISSION_PERCENT / 100)), 0);
}

function buildPixPayload(amountCentavos, context = {}) {
  const rawId = `${ID_PREFIX}-${context.orderCode || context.registrationId || uuidv4()}-${Date.now()}`;
  const sanitizedId = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 35) || uuidv4().replace(/[^a-zA-Z0-9]/g, '').slice(0, 35);

  return {
    params: {
      idEnvio: sanitizedId
    },
    body: {
      valor: (amountCentavos / 100).toFixed(2),
      pagador: {
        chave: PAGADOR_CHAVE,
        infoPagador: context.infoPagador || INFO_PAGADOR_DEFAULT
      },
      favorecido: {
        chave: FAVORECIDO_CHAVE
      }
    }
  };
}

async function enviarComissaoEfi(valorCentavos, context = {}) {
  if (!isCommissionEnabled()) {
    return { sucesso: false, erro: 'Ef� n�o est� configurado para envio de comiss�es' };
  }

  if (!Number.isFinite(valorCentavos) || valorCentavos <= 0) {
    return { sucesso: false, erro: 'Valor inv�lido para comiss�o' };
  }

  const comissaoCentavos = calcularComissaoCentavos(valorCentavos);
  if (comissaoCentavos < 1) {
    return { sucesso: false, erro: 'Comiss�o menor que R$0,01 n�o ser� enviada', amountCentavos: comissaoCentavos };
  }

  const { params, body } = buildPixPayload(comissaoCentavos, context);
  const pixUrl = `${PIX_API_BASE_URL}/v3/gn/pix/${params.idEnvio}`;
  if (LOG_PIX_URL) {
    console.info('[efiService] Pix endpoint', pixUrl);
  }

  try {
    const resposta = await getEfiClient().pixSend(params, body);
    return {
      sucesso: true,
      amountCentavos: comissaoCentavos,
      dadosCompletos: resposta
    };
  } catch (error) {
    const mensagem = normalizeError(error) || 'Erro desconhecido ao enviar Pix';
    console.error('[efiService] Falha ao enviar comissão Efi', { mensagem, params, body, context, error });
    return {
      sucesso: false,
      amountCentavos: comissaoCentavos,
      erro: mensagem,
      dadosCompletos: error
    };
  }
}

module.exports = {
  calcularComissaoCentavos,
  enviarComissaoEfi,
  isCommissionEnabled
};
