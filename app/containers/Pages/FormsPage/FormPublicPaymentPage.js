import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography, Grid, TextField, Button, Box, Alert
} from '@mui/material';

const FormPublicPaymentPage = () => {
  const { submissionId } = useParams();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/forms/payment-status/${submissionId}`);
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.message || 'Erro ao buscar status de pagamento.');
      } catch {
        setError('Erro ao conectar ao servidor.');
      }
    };
    fetchStatus();
  }, [submissionId]);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/forms/${submissionId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      const json = await res.json();
      if (res.ok) {
        window.location.href = json.checkoutUrl;
      } else {
        setError(json.message || 'Erro ao gerar pagamento.');
      }
    } catch {
      setError('Erro ao gerar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return <Box p={4}><Typography>Carregando...</Typography></Box>;

  const { totalAmount, totalPaid, allowMultiplePayments } = data;
  const remaining = totalAmount - totalPaid;

  return (
    <Box p={4} maxWidth={600} mx="auto">
      <Typography variant="h5" gutterBottom>Pagamento</Typography>
      <Typography>Total: R$ {totalAmount.toFixed(2)}</Typography>
      <Typography>Pago: R$ {totalPaid.toFixed(2)}</Typography>
      <Typography>Restante: R$ {remaining.toFixed(2)}</Typography>

      {allowMultiplePayments && remaining > 0 && (
        <Box mt={3}>
          <TextField
            fullWidth
            label="Valor do novo pagamento"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handlePay}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            Gerar Pagamento
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FormPublicPaymentPage;
