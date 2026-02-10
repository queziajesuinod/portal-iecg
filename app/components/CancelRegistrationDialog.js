import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

function formatCurrency(value) {
  const number = Number(value || 0);
  return `R$ ${number.toFixed(2).replace('.', ',')}`;
}

function CancelRegistrationDialog({
  open,
  onClose,
  onConfirm,
  loading,
  info,
  targetLabel
}) {
  const payments = info?.creditCardPayments || [];
  const registrationLabel = targetLabel || 'esta inscrição';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirmar cancelamento</DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom>
          {info?.needsRefund
            ? `Será estornado o valor de ${formatCurrency(info.amount)}.`
            : 'Não será necessário estornar valor.'}
        </Typography>

        {payments.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Pagamentos por cartão
            </Typography>
            <List dense>
              {payments.map((payment) => (
                <ListItem key={payment.id} disableGutters>
                  <ListItemText
                    primary={
                      payment.providerPaymentId
                        ? `PaymentId ${payment.providerPaymentId}`
                        : `Pagamento ${payment.id}`
                    }
                    secondary={`${formatCurrency(payment.amount)} • ${payment.status}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        <Typography variant="body2" color="textSecondary">
          Deseja cancelar {registrationLabel}?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Não, manter
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Cancelando...' : 'Sim, cancelar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CancelRegistrationDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  info: PropTypes.shape({
    needsRefund: PropTypes.bool,
    amount: PropTypes.number,
    creditCardPayments: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      providerPaymentId: PropTypes.string,
      amount: PropTypes.number,
      status: PropTypes.string
    }))
  }),
  targetLabel: PropTypes.string
};

CancelRegistrationDialog.defaultProps = {
  open: false,
  loading: false,
  info: null,
  targetLabel: null
};

export default CancelRegistrationDialog;
