import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { useHistory, useLocation } from 'react-router-dom';
import { Notification } from 'dan-components';

const ProcessPaymentPage = () => {
  const location = useLocation();
  const { paymentData: initialPaymentData } = location.state || {};

  const [paymentData, setPaymentData] = useState({
    payerName: initialPaymentData?.payerName || '',
    payerEmail: initialPaymentData?.payerEmail || '',
    payerPhone: initialPaymentData?.payerPhone || '',
    amount: initialPaymentData?.amount || '',
  });
  const [notification, setNotification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';
  const history = useHistory();

  const validateFields = () => {
    const newErrors = {};
    if (!paymentData.payerName.trim()) newErrors.payerName = 'Nome é obrigatório';
    if (!paymentData.payerEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(paymentData.payerEmail)) {
      newErrors.payerEmail = 'E-mail inválido';
    }
    if (!paymentData.payerPhone.trim() || !/^\d{10,11}$/.test(paymentData.payerPhone)) {
      newErrors.payerPhone = 'Telefone inválido';
    }
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({ ...paymentData, [name]: value });
    setErrors({ ...errors, [name]: '' }); // Limpa o erro do campo ao alterar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;

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
        body: JSON.stringify({
          ...paymentData, // Envia os dados do pagador e o valor
          returnUrl: `${window.location.origin}/payment-success`, // URL de retorno após o pagamento
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl; // Redireciona para o gateway de pagamento
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

      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Pagador"
              name="payerName"
              value={paymentData.payerName}
              onChange={handleChange}
              required
              error={!!errors.payerName}
              helperText={errors.payerName}
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
              error={!!errors.payerEmail}
              helperText={errors.payerEmail}
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
              error={!!errors.payerPhone}
              helperText={errors.payerPhone}
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
              error={!!errors.amount}
              helperText={errors.amount}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={submitting}
              startIcon={submitting && <CircularProgress size={20} />}
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
