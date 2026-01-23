export const EVENT_TYPE_OPTIONS = [
  { value: 'ACAMP', label: 'Acampamento' },
  { value: 'ENCONTRO', label: 'Encontro' },
  { value: 'CONFERENCIA', label: 'Conferencia' },
];

export const EVENT_TYPE_LABELS = EVENT_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});
