const axios = require('axios');

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
        'apikey': this.apiKey
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

  async validarNumeroWhatsapp(phone) {
    const normalized = this.normalizeDigits(phone);
    if (!normalized) {
      throw new Error('Telefone inválido ao validar WhatsApp');
    }

    try {
      const client = this.getClient();
      const response = await client.post(`/chat/whatsappNumbers/${this.instanceName}`, {
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
  async enviarMensagemTexto(phone, message) {
    try {
      const client = this.getClient();
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await client.post(`/message/sendText/${this.instanceName}`, {
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
  async enviarMensagemComMidia(phone, message, mediaUrl, mediaType = 'image') {
    try {
      const client = this.getClient();
      const formattedPhone = this.formatPhoneNumber(phone);

      let endpoint = '';
      let payload = {
        number: formattedPhone,
        caption: message
      };

      switch (mediaType) {
        case 'image':
          endpoint = '/message/sendMedia/${this.instanceName}';
          payload.mediatype = 'image';
          payload.media = mediaUrl;
          break;
        case 'document':
          endpoint = '/message/sendMedia/${this.instanceName}';
          payload.mediatype = 'document';
          payload.media = mediaUrl;
          payload.fileName = 'documento.pdf';
          break;
        case 'video':
          endpoint = '/message/sendMedia/${this.instanceName}';
          payload.mediatype = 'video';
          payload.media = mediaUrl;
          break;
        case 'audio':
          endpoint = '/message/sendMedia/${this.instanceName}';
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

  /**
   * Webhook handler - processar atualizações de status de mensagens
   * @param {Object} webhookData - Dados recebidos do webhook
   * @returns {Object} - Informações extraídas
   */
  processarWebhook(webhookData) {
    try {
      const { event, data } = webhookData;

      // Extrair informações relevantes
      const messageId = data?.key?.id || null;
      const status = this.mapearStatus(event);
      const timestamp = data?.messageTimestamp || Date.now();

      return {
        messageId,
        status,
        timestamp,
        dadosCompletos: data
      };
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return null;
    }
  }

  /**
   * Mapear eventos do webhook para status internos
   * @param {string} event - Evento recebido
   * @returns {string} - Status mapeado
   */
  mapearStatus(event) {
    const mapeamento = {
      'messages.upsert': 'sent',
      'messages.update': 'delivered',
      'message.ack': 'delivered',
      'message.read': 'read'
    };

    return mapeamento[event] || 'pending';
  }
}

module.exports = new EvolutionApiService();