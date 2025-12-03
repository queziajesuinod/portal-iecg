const WebhookService = require('../services/WebhookService');

class WebhookController {
  async list(req, res) {
    try {
      const data = await WebhookService.list();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async create(req, res) {
    try {
      const webhook = await WebhookService.create(req.body || {});
      return res.status(201).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  async update(req, res) {
    try {
      const webhook = await WebhookService.update(req.params.id, req.body || {});
      return res.status(200).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  async sendEvent(req, res) {
    try {
      const { event, payload } = req.body || {};
      if (!event) {
        return res.status(400).json({ erro: 'event é obrigatório' });
      }
      await WebhookService.sendEvent(event, payload || {});
      return res.status(202).json({ mensagem: 'Evento recebido' });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }
}

module.exports = new WebhookController();
