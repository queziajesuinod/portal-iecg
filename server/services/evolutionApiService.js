const axios = require('axios');
const instanceBalancer = require('./instanceBalancer');

class EvolutionApiService {
  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'iecg-events';
  }

  /**
   * Cliente HTTP configurado
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey
      },
      timeout: 30000
    });
  }

  /**
   * Formatar número de telefone para WhatsApp
   * @param {string} phone - Telefone no formato (XX) XXXXX-XXXX ou similar
   * @returns {string} - Telefone no formato 5511999999999@s.whatsapp.net
   */
  normalizeDigits(phone) {
    if (!phone) return null;

    const cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return null;

    const raw = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;
    if (!raw) return null;

    if (raw.length >= 10) {
      const ddd = raw.slice(0, 2);
      let number = raw.slice(2);
      if (number.length === 9) {
        number = number.slice(1); // remove o primeiro dígito se for '9'
      }
      return `55${ddd}${number}`;
    }

    return `55${raw}`;
  }

  formatPhoneNumber(phone) {
    const normalized = this.normalizeDigits(phone);
    if (!normalized) {
      throw new Error('Telefone inválido para envio via WhatsApp');
    }
    return `${normalized}`;
  }

  resolveInstance(instanceName) {
    const base = instanceName || this.instanceName;
    return instanceBalancer.next(base);
  }

  async validarNumeroWhatsapp(phone, instanceName) {
    const normalized = this.normalizeDigits(phone);
    if (!normalized) {
      throw new Error('Telefone inválido ao validar WhatsApp');
    }

    try {
      const client = this.getClient();
      const instance = this.resolveInstance(instanceName);
      const response = await client.post(`/chat/whatsappNumbers/${instance}`, {
        numbers: [normalized]
      });

      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      console.error('Erro ao validar número de WhatsApp:', {
        message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(message);
    }
  }

  /**
   * Enviar mensagem de texto via WhatsApp
   * @param {string} phone - Número de telefone
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<Object>} - Resposta da API
   */
  async enviarMensagemTexto(phone, message, instanceName) {
    try {
      const client = this.getClient();
      const formattedPhone = this.formatPhoneNumber(phone);
      const instance = this.resolveInstance(instanceName);

      const response = await client.post(`/message/sendText/${instance}`, {
        number: formattedPhone,
        text: message
      });

      return {
        sucesso: true,
        externalId: response.data?.key?.id || null,
        dados: response.data
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem via Evolution API:', error.response?.data || error.message);
      return {
        sucesso: false,
        erro: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Enviar mensagem com mídia (imagem, PDF, etc)
   * @param {string} phone - Número de telefone
   * @param {string} message - Mensagem (caption)
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia (image, document, video, audio)
   * @returns {Promise<Object>} - Resposta da API
   */
  async enviarMensagemComMidia(phone, message, mediaUrl, mediaType = 'image', instanceName = null) {
    try {
      const client = this.getClient();
      const formattedPhone = this.formatPhoneNumber(phone);
      const instance = this.resolveInstance(instanceName);

      let endpoint = '';
      const payload = {
        number: formattedPhone,
        caption: message
      };

      switch (mediaType) {
        case 'image':
          endpoint = `/message/sendMedia/${instance}`;
          payload.mediatype = 'image';
          payload.media = mediaUrl;
          break;
        case 'document':
          endpoint = `/message/sendMedia/${instance}`;
          payload.mediatype = 'document';
          payload.media = mediaUrl;
          payload.fileName = 'documento.pdf';
          break;
        case 'video':
          endpoint = `/message/sendMedia/${instance}`;
          payload.mediatype = 'video';
          payload.media = mediaUrl;
          break;
        case 'audio':
          endpoint = `/message/sendMedia/${instance}`;
          payload.mediatype = 'audio';
          payload.media = mediaUrl;
          break;
        default:
          throw new Error(`Tipo de mídia não suportado: ${mediaType}`);
      }

      const response = await client.post(endpoint, payload);

      return {
        sucesso: true,
        externalId: response.data?.key?.id || null,
        dados: response.data
      };
    } catch (error) {
      console.error('Erro ao enviar mídia via Evolution API:', error.response?.data || error.message);
      return {
        sucesso: false,
        erro: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verificar status da instância
   * @returns {Promise<Object>}
   */
  async verificarStatus() {
    try {
      const client = this.getClient();
      const response = await client.get(`/instance/connectionState/${this.instanceName}`);

      return {
        conectado: response.data?.state === 'open',
        estado: response.data?.state,
        dados: response.data
      };
    } catch (error) {
      console.error('Erro ao verificar status da instância:', error.response?.data || error.message);
      return {
        conectado: false,
        erro: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obter QR Code para conectar instância (se necessário)
   * @returns {Promise<Object>}
   */
  async obterQRCode() {
    try {
      const client = this.getClient();
      const response = await client.get(`/instance/connect/${this.instanceName}`);

      return {
        sucesso: true,
        qrcode: response.data?.qrcode?.base64 || null,
        dados: response.data
      };
    } catch (error) {
      console.error('Erro ao obter QR Code:', error.response?.data || error.message);
      return {
        sucesso: false,
        erro: error.response?.data?.message || error.message
      };
    }
  }

  mapearAck(ackStatus) {
    switch (String(ackStatus).toUpperCase()) {
      case 'DELIVERY_ACK': case '3': return 'delivered';
      case 'READ': case '4': return 'read';
      case 'PLAYED': case '5': return 'read';
      case 'SERVER_ACK': case '2': return 'sent';
      case 'ERROR': case '0': return 'failed';
      default: return null;
    }
  }

  // Retorna array de { messageId, status, timestamp }
  processarWebhook(webhookData) {
    try {
      const { event, data } = webhookData;

      if (event === 'messages.update') {
        const items = Array.isArray(data) ? data : [data];
        return items
          .map((item) => {
            // Suporta formato novo (keyId + status) e antigo (key.id + update.status)
            const messageId = item?.keyId || item?.key?.id || null;
            const rawStatus = item?.status || item?.update?.status;
            const status = rawStatus ? this.mapearAck(rawStatus) : null;
            if (!messageId || !status) return null;
            return { messageId, status, timestamp: Date.now() };
          })
          .filter(Boolean);
      }

      if (event === 'messages.upsert') {
        const item = Array.isArray(data) ? data[0] : data;
        const messageId = item?.key?.id || item?.keyId || null;
        if (!messageId || !item?.key?.fromMe) return [];
        return [{ messageId, status: 'sent', timestamp: item?.messageTimestamp || Date.now() }];
      }

      return [];
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return [];
    }
  }
}

module.exports = new EvolutionApiService();
