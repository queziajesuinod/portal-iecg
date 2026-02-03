const WebhookService = require('./WebhookService');

const DEFAULT_EVENTS = [
  'apelo.created',
  'apelo.moved',
  'apelo.status_changed',
  'celula.created',
  'celula.updated',
  'celula.deleted',
  'event.created',
  'event.updated',
  'event.deleted',
  'registration.created'
];

const rawList = (process.env.ENABLED_WEBHOOK_EVENTS || '').split(',').map((v) => v.trim()).filter(Boolean);
const ENABLE_ALL = rawList.includes('*');
const enabledEvents = ENABLE_ALL || rawList.length === 0 ? DEFAULT_EVENTS : rawList;

const shouldEmit = (eventKey) => ENABLE_ALL || enabledEvents.includes(eventKey);

const emit = async (eventKey, payload) => {
  if (!shouldEmit(eventKey)) {
    return null;
  }
  try {
    return await WebhookService.sendEvent(eventKey, payload);
  } catch (err) {
    console.warn(`Falha ao disparar webhook ${eventKey}:`, err.message || err);
    return null;
  }
};

module.exports = {
  emit,
  shouldEmit
};
