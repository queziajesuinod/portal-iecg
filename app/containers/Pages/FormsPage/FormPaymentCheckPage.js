import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  Alert
} from '@mui/material';

const FormPaymentCheckPage = () => {
  const [cpf, setCpf] = useState('');
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleBuscar = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`${API_URL}/public/payments/por-cpf/${cpf}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setErro(data.message || 'Erro ao buscar informações.');
      }
    } catch (err) {
      setErro('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4} maxWidth={800} mx="auto">
      <Typography variant="h5" gutterBottom>Consultar Pagamentos</Typography>
      <Typography variant="body2" paragraph>Informe seu CPF para visualizar seus pagamentos registrados.</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={8}>
          <TextField
            fullWidth
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />
        </Grid>
        <Grid item xs={4}>
          <Button fullWidth variant="contained" onClick={handleBuscar} disabled={loading || !cpf}>
            Buscar
          </Button>
        </Grid>
      </Grid>

      {erro && <Alert severity="error" sx={{ mt: 2 }}>{erro}</Alert>}

      {result.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6">Resultados Encontrados</Typography>
          {result.map((item, i) => (
            <Paper key={i} sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1"><strong>Formulário:</strong> {item.formName}</Typography>
              <Typography><strong>Total:</strong> R$ {item.totalAmount.toFixed(2)}</Typography>
              <Typography><strong>Pago:</strong> R$ {item.totalPaid.toFixed(2)}</Typography>
              <Typography><strong>Restante:</strong> R$ {(item.totalAmount - item.totalPaid).toFixed(2)}</Typography>
              {item.allowMultiplePayments && (item.totalPaid < item.totalAmount) && (
                <Box mt={1}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => window.location.href = `/public/pagamento/${item.submissionId}`}
                  >
                    Fazer Novo Pagamento
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FormPaymentCheckPage;
