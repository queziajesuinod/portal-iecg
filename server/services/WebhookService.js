const axios = require('axios');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const FormData = require('form-data');
const { Op } = require('sequelize');
const { Webhook } = require('../models');

class WebhookService {
  extractTransportOptions(payload) {
    if (!payload || typeof payload !== 'object') {
      return { cleanPayload: payload, transport: null };
    }
    const transport = payload.__webhookTransport && typeof payload.__webhookTransport === 'object'
      ? payload.__webhookTransport
      : null;
    if (!transport) return { cleanPayload: payload, transport: null };
    const cleanPayload = { ...payload };
    delete cleanPayload.__webhookTransport;
    return { cleanPayload, transport };
  }

  async postJson(hook, event, payload) {
    await axios.post(
      hook.url,
      { event, payload, source: 'portal-iecg' },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}),
        },
        timeout: 5000,
      }
    );
  }

  async postMultipart(hook, event, payload, transport) {
    const form = new FormData();
    form.append('event', event);
    form.append('source', 'portal-iecg');
    // Envia payload em campos de body (texto), nao como arquivo binario.
    form.append('payload', JSON.stringify(payload));
    form.append('title', payload?.video?.title || '');
    form.append('summary', payload?.transcript?.summary || '');
    form.append('seoMetaTitle', payload?.transcript?.seoMetaTitle || '');
    form.append('seoMetaDescription', payload?.transcript?.seoMetaDescription || '');
    form.append('seoSlug', payload?.transcript?.seoSlug || '');
    form.append('seoKeywords', JSON.stringify(payload?.transcript?.seoKeywords || []));

    const { audioPath } = transport;
    let audioAttached = false;
    let audioSize = 0;
    if (audioPath) {
      const stat = await fsp.stat(audioPath);
      if (stat.size > 0) {
        form.append('audio', fs.createReadStream(audioPath), {
          filename: transport.filename || `audio${path.extname(audioPath) || '.mp3'}`,
          contentType: transport.contentType || 'audio/mpeg',
          knownLength: stat.size,
        });
        audioAttached = true;
        audioSize = stat.size;
      }
    }

    console.log(
      `[webhook-multipart] event=${event} hook=${hook.id} audioAttached=${audioAttached} audioSize=${audioSize} path=${audioPath || 'none'}`
    );

    await axios.post(hook.url, form, {
      headers: {
        ...form.getHeaders(),
        ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}),
      },
      timeout: 600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async list() {
    return Webhook.findAll({ order: [['createdAt', 'DESC']] });
  }

  async create(data) {
    if (!data.name || !data.url || !data.events || !data.events.length) {
      throw new Error('Nome, URL e eventos sao obrigatorios');
    }
    return Webhook.create({
      name: data.name,
      url: data.url,
      events: data.events,
      secret: data.secret || null,
      active: data.active !== undefined ? data.active : true,
    });
  }

  async update(id, data) {
    const webhook = await Webhook.findByPk(id);
    if (!webhook) throw new Error('Webhook nao encontrado');
    return webhook.update(data);
  }

  async sendEvent(event, payload) {
    const { cleanPayload, transport } = this.extractTransportOptions(payload);
    const hooks = await Webhook.findAll({
      where: {
        active: true,
        events: { [Op.contains]: [event] },
      },
    });

    const results = await Promise.all(
      hooks.map(async (hook) => {
        try {
          if (transport?.type === 'multipart') {
            await this.postMultipart(hook, event, cleanPayload, transport);
          } else {
            await this.postJson(hook, event, cleanPayload);
          }
          return { hookId: hook.id, success: true };
        } catch (err) {
          console.warn(`Falha ao enviar webhook ${hook.id}`, err.message);
          return { hookId: hook.id, success: false, error: err.message };
        }
      })
    );

    const failed = results.filter((r) => !r.success).length;
    return {
      event,
      total: hooks.length,
      success: hooks.length - failed,
      failed,
      results,
    };
  }
}

module.exports = new WebhookService();
