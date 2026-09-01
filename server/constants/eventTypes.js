// Rótulos amigáveis para os valores do enum eventType (banco).
// Os VALORES vêm do banco (pg_enum); aqui só mapeamos o rótulo exibido.
const EVENT_TYPE_LABELS = {
  ACAMP: 'Acampamento',
  ENCONTRO: 'Encontro',
  CONFERENCIA: 'Conferência',
};

// Fallback para valores sem rótulo cadastrado: "NOVO_TIPO" -> "Novo tipo".
const humanizeEventType = (value) => {
  const texto = String(value || '').replace(/_/g, ' ').trim().toLowerCase();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : String(value || '');
};

const labelEventType = (value) => EVENT_TYPE_LABELS[value] || humanizeEventType(value);

module.exports = { EVENT_TYPE_LABELS, humanizeEventType, labelEventType };
