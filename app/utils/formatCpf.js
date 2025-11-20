export const formatCpf = (value = '') => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  let formatted = digits;

  if (digits.length > 3 && digits.length <= 6) {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  } else if (digits.length > 6 && digits.length <= 9) {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  } else if (digits.length > 9) {
    formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  return formatted;
};
