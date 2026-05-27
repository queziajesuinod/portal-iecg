import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
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
        {info?.needsRefund ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Com reembolso:</strong> será estornado o valor de {formatCurrency(info.amount)} no cartão do comprador.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Sem reembolso:</strong> {info?.noRefundReason || 'Não houve cobrança a estornar.'}
            <br />
            A inscrição será cancelada e o histórico registrará que não houve estorno.
          </Alert>
        )}

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
    noRefundReason: PropTypes.string,
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
