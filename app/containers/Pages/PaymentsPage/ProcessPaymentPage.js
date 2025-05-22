import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Typography,
  Box
} from '@mui/material';
import { useHistory } from 'react-router-dom';
import { Notification } from 'dan-components';

const ProcessPaymentPage = () => {
  const [paymentData, setPaymentData] = useState({
    payerName: '',
    payerEmail: '',
    payerPhone: '',
    amount: '',
  });
  const [notification, setNotification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';
  const history = useHistory();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({ ...paymentData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setNotification('Pagamento processado com sucesso!');
        }
      } else {
        setNotification(data.message || 'Erro ao processar pagamento.');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setNotification('Erro ao conectar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={4} maxWidth={600} mx="auto">
      <Typography variant="h4" gutterBottom>
        Processar Pagamento
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Pagador"
              name="payerName"
              value={paymentData.payerName}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="E-mail do Pagador"
              name="payerEmail"
              type="email"
              value={paymentData.payerEmail}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Telefone do Pagador"
              name="payerPhone"
              value={paymentData.payerPhone}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Valor (R$)"
              name="amount"
              type="number"
              value={paymentData.amount}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={submitting}
            >
              {submitting ? 'Processando...' : 'Processar Pagamento'}
            </Button>
          </Grid>
        </Grid>
      </form>

      <Notification message={notification} close={() => setNotification('')} />
    </Box>
  );
};

export default ProcessPaymentPage;
