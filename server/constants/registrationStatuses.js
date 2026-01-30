const COUNTABLE_PAYMENT_STATUSES = ['pending', 'authorized', 'partial', 'confirmed'];

function isCountablePaymentStatus(status) {
  return COUNTABLE_PAYMENT_STATUSES.includes(status);
}

module.exports = {
  COUNTABLE_PAYMENT_STATUSES,
  isCountablePaymentStatus
};
