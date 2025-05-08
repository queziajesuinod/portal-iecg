import React, { useEffect, useState } from 'react';
import {
  TextField, Button, Grid, MenuItem, Typography, IconButton, FormControlLabel, Checkbox
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { useParams } from 'react-router-dom';

const tiposDeCampo = ['text', 'number', 'email', 'date', 'checkbox', 'select'];

const FormEditPage = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`${API_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setForm(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updated = [...form.FormFields];
    updated[index][name] = type === 'checkbox' ? checked : value;
    setForm({ ...form, FormFields: updated });
  };

  const handleAddField = () => {
    setForm({ ...form, FormFields: [...form.FormFields, { label: '', type: 'text', required: false, options: '' }] });
  };

  const handleRemoveField = (index) => {
    const updated = [...form.FormFields];
    updated.splice(index, 1);
    setForm({ ...form, FormFields: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/forms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Formulário atualizado com sucesso!');
    } else {
      setMessage(data.message || 'Erro ao atualizar formulário.');
    }
  };

  if (loading || !form) return <Typography>Carregando...</Typography>;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Editar Formulário</Typography>
      {message && <Typography color="primary">{message}</Typography>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Nome" name="name" fullWidth value={form.name} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Slug" name="slug" fullWidth value={form.slug} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descrição" name="description" fullWidth value={form.description} onChange={handleChange} multiline />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Início" name="startDate" type="date" fullWidth value={form.startDate?.slice(0,10)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fim" name="endDate" type="date" fullWidth value={form.endDate?.slice(0,10)} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Checkbox name="hasPayment" checked={form.hasPayment} onChange={handleChange} />}
              label="Este formulário requer pagamento?"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6">Campos</Typography>
            <Button onClick={handleAddField} startIcon={<AddCircle />}>Adicionar Campo</Button>
          </Grid>

          {form.FormFields.map((field, index) => (
            <React.Fragment key={index}>
              <Grid item xs={4}>
                <TextField label="Label" name="label" value={field.label} onChange={(e) => handleFieldChange(index, e)} fullWidth />
              </Grid>
              <Grid item xs={3}>
                <TextField label="Tipo" name="type" select value={field.type} onChange={(e) => handleFieldChange(index, e)} fullWidth>
                  {tiposDeCampo.map(tipo => (
                    <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={3}>
                <TextField label="Opções (se for select)" name="options" value={field.options || ''} onChange={(e) => handleFieldChange(index, e)} fullWidth />
              </Grid>
              <Grid item xs={1}>
                <FormControlLabel control={<Checkbox checked={field.required} onChange={(e) => handleFieldChange(index, e)} name="required" />} label="Obrig?" />
              </Grid>
              <Grid item xs={1}>
                <IconButton onClick={() => handleRemoveField(index)} color="error"><RemoveCircle /></IconButton>
              </Grid>
            </React.Fragment>
          ))}

          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>Salvar Alterações</Button>
          </Grid>
        </Grid>
      </form>
    </div>
  );
};

export default FormEditPage;
