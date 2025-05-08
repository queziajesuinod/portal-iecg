import React, { useEffect, useState } from 'react';
import {
  Typography, Grid, Button, TextField, Box, Alert
} from '@mui/material';

const FormPaymentPage = ({ submissionId }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [newAmount, setNewAmount] = useState('');
  const [message, setMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/forms/payment-status/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPaymentData(data);
    };

    fetchData();
  }, [submissionId]);

  const handleNewPayment = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/forms/${submissionId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount: parseFloat(newAmount) })
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = data.checkoutUrl;
    } else {
      setMessage(data.message || 'Erro ao criar novo pagamento');
    }
  };

  if (!paymentData) return <Typography>Carregando dados de pagamento...</Typography>;

  const { totalAmount, totalPaid, allowMultiplePayments } = paymentData;
  const remaining = totalAmount - totalPaid;

  return (
    <Box mt={4}>
      <Typography variant="h5">Resumo do Pagamento</Typography>
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} sm={4}><strong>Total:</strong> R$ {totalAmount.toFixed(2)}</Grid>
        <Grid item xs={12} sm={4}><strong>Pago:</strong> R$ {totalPaid.toFixed(2)}</Grid>
        <Grid item xs={12} sm={4}><strong>Restante:</strong> R$ {remaining.toFixed(2)}</Grid>
      </Grid>

      {allowMultiplePayments && remaining > 0 && (
        <Box mt={3}>
          <Typography variant="h6">Adicionar Novo Pagamento</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Valor"
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleNewPayment}
                disabled={!newAmount || parseFloat(newAmount) <= 0}
              >
                Pagar
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {message && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}
    </Box>
  );
};

export default FormPaymentPage;
