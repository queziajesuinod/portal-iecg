const normalizeCpf = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits || null;
};

const formatCpf = (value) => {
  const digits = normalizeCpf(value);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

module.exports = {
  normalizeCpf,
  formatCpf
};
