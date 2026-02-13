const PAYMENT_STATUS_META = {
  pending: {
    label: 'Pendente',
    sx: {
      backgroundColor: '#f9a825',
      color: '#1f1f1f',
      fontWeight: 600
    }
  },
  confirmed: {
    label: 'Confirmado',
    sx: {
      backgroundColor: '#2e7d32',
      color: '#ffffff',
      fontWeight: 600
    }
  },
  denied: {
    label: 'Negado',
    sx: {
      backgroundColor: '#d32f2f',
      color: '#ffffff',
      fontWeight: 600
    }
  },
  cancelled: {
    label: 'Cancelado',
    sx: {
      backgroundColor: '#ef6c00',
      color: '#ffffff',
      fontWeight: 600
    }
  },
  refunded: {
    label: 'Reembolsado',
    sx: {
      backgroundColor: '#757575',
      color: '#ffffff',
      fontWeight: 600
    }
  },
  authorized: {
    label: 'Autorizado'
  },
  partial: {
    label: 'Parcial'
  },
  expired: {
    label: 'Expirado'
  }
};

export function getPaymentStatusLabel(status) {
  const key = String(status || '').toLowerCase();
  return PAYMENT_STATUS_META[key]?.label || status || '-';
}

export function getPaymentStatusChipSx(status) {
  const key = String(status || '').toLowerCase();
  return PAYMENT_STATUS_META[key]?.sx || undefined;
}
