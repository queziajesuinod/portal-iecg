const axios = require('axios');
const { Op } = require('sequelize');
const { Webhook } = require('../models');

class WebhookService {
  async list() {
    return Webhook.findAll({ order: [['createdAt', 'DESC']] });
  }

  async create(data) {
    if (!data.name || !data.url || !data.events || !data.events.length) {
      throw new Error('Nome, URL e eventos são obrigatórios');
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
    if (!webhook) throw new Error('Webhook não encontrado');
    return webhook.update(data);
  }

  async sendEvent(event, payload) {
    const hooks = await Webhook.findAll({
      where: {
        active: true,
        events: { [Op.contains]: [event] },
      },
    });

    await Promise.all(
      hooks.map(async (hook) => {
        try {
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
        } catch (err) {
          // Loga e segue; não bloqueia a requisição original
          console.warn(`Falha ao enviar webhook ${hook.id}`, err.message);
        }
      })
    );
  }
}

module.exports = new WebhookService();
