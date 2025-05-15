// FormPublicPage.jsx – Página pública isolada para preenchimento de formulário
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  TextField,
  Checkbox,
  Button,
  FormControlLabel,
  Grid,
  Typography,
  Box
} from '@mui/material';

const FormPublicPage = () => {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`${API_URL}/public/forms/${slug}`);
        const data = await res.json();
        if (res.ok) setForm(data);
        else setError(data.message || 'Evento não encontrado.');
      } catch (err) {
        setError('Erro ao carregar Evento.');
      }
    };
    fetchForm();
  }, [slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues({ ...values, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/forms/${form.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ formId: form.id, fields: values, paymentInfo: values.paymentInfo || null })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Inscrição enviado com sucesso!');
        }
      } else {
        setError(data.message || 'Erro ao enviar Inscrição.');
      }
    } catch (err) {
      setError('Erro ao enviar Inscrição.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;
  if (!form) return <Box p={4}><Typography>Carregando formulário...</Typography></Box>;

  return (
    <Box p={4} maxWidth={700} mx="auto">
      <Typography variant="h4" gutterBottom>{form.name}</Typography>
      <Typography variant="subtitle1" paragraph>{form.description}</Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {form.FormFields.map((field, index) => (
            <Grid item xs={12} sm={field.type === 'checkbox' ? 12 : 6} key={index}>
              {field.type === 'checkbox' ? (
                <FormControlLabel
                  control={<Checkbox name={field.label} onChange={handleChange} />}
                  label={field.label}
                />
              ) : field.type === 'select' ? (
                <TextField
                  fullWidth
                  select
                  label={field.label}
                  name={field.label}
                  onChange={handleChange}
                  SelectProps={{ native: true }}
                  required={field.required}
                >
                  <option value="">Selecione...</option>
                  {(field.options || '').split(',').map(opt => (
                    <option key={opt} value={opt.trim()}>{opt.trim()}</option>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  label={field.label}
                  name={field.label}
                  type={field.type || 'text'}
                  onChange={handleChange}
                  required={field.required}
                />
              )}
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar Inscrição'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default FormPublicPage;