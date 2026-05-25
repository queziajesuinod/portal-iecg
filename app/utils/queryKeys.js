/**
 * Chaves padronizadas do react-query.
 *
 * Manter aqui ajuda a:
 * - Evitar typos espalhados pelo codigo.
 * - Saber o que invalidar em mutations (basta usar a chave certa).
 * - Estruturar hierarquia (ex: ['events','list'] invalida tudo de eventos).
 */
export const queryKeys = {
  events: {
    all: ['events'],
    list: (params = {}) => ['events', 'list', params],
    detail: (id) => ['events', 'detail', id],
    stats: ['events', 'stats'],
    ticketsSummary: (id) => ['events', 'tickets-summary', id],
    batches: (eventId) => ['events', 'batches', eventId],
    formFields: (eventId) => ['events', 'form-fields', eventId],
    paymentOptions: (eventId) => ['events', 'payment-options', eventId],
    registrations: (eventId, params = {}) => ['events', 'registrations', eventId, params],
    registrationRules: (eventId) => ['events', 'registration-rules', eventId],
    summary: (eventId) => ['events', 'summary', eventId],
  },
  members: {
    all: ['members'],
    list: ['members', 'list'],
    allForSelect: ['members', 'all-for-select'],
    byCargo: (cargo) => ['members', 'by-cargo', cargo],
    duplicates: ['members', 'duplicates'],
    detail: (id) => ['members', 'detail', id],
  },
  campus: {
    all: ['campus'],
    list: ['campus', 'list'],
  },
  apelos: {
    all: ['apelos'],
    list: (params = {}) => ['apelos', 'list', params],
    detail: (id) => ['apelos', 'detail', id],
    direcionamentos: (apeloId) => ['apelos', 'direcionamentos', apeloId],
    historico: (apeloId) => ['apelos', 'historico', apeloId],
  },
};

export default queryKeys;
