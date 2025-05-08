import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  IconButton
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { Helmet } from 'react-helmet';

const tiposDeCampo = ['text', 'number', 'email', 'date', 'checkbox', 'select'];

const FormCreatePage = () => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    formTypeId: '',
    hasPayment: false,
    startDate: '',
    endDate: '',
    fields: []
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleAddField = () => {
    setForm({ ...form, fields: [...form.fields, { label: '', type: 'text', required: false, options: '' }] });
  };

  const handleRemoveField = (index) => {
    const updated = [...form.fields];
    updated.splice(index, 1);
    setForm({ ...form, fields: updated });
  };

  const handleFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updated = [...form.fields];
    updated[index][name] = type === 'checkbox' ? checked : value;
    setForm({ ...form, fields: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        alert('Formulário criado com sucesso!');
        setForm({ name: '', description: '', slug: '', formTypeId: '', hasPayment: false, startDate: '', endDate: '', fields: [] });
      } else {
        alert(data.message || 'Erro ao criar formulário');
      }
    } catch (err) {
      console.error('Erro ao enviar formulário:', err);
      alert('Erro ao conectar com o servidor');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Criar Novo Formulário</title>
      </Helmet>
      <Typography variant="h4" gutterBottom>Criar Novo Formulário</Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Nome" name="name" fullWidth value={form.name} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Slug (URL)" name="slug" fullWidth value={form.slug} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descrição" name="description" fullWidth value={form.description} onChange={handleChange} multiline />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Início" name="startDate" type="date" fullWidth value={form.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fim" name="endDate" type="date" fullWidth value={form.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>

          {/* Campos dinâmicos */}
          <Grid item xs={12}>
            <Typography variant="h6">Campos do Formulário</Typography>
            <Button variant="outlined" onClick={handleAddField} startIcon={<AddCircle />}>Adicionar Campo</Button>
          </Grid>

          {form.fields.map((field, index) => (
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
                <TextField
                  label="Opções (se for select)"
                  name="options"
                  value={field.options}
                  onChange={(e) => handleFieldChange(index, e)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={1}>
                <FormControlLabel
                  control={<Checkbox checked={field.required} onChange={(e) => handleFieldChange(index, e)} name="required" />}
                  label="Obrig?"
                />
              </Grid>
              <Grid item xs={1}>
                <IconButton onClick={() => handleRemoveField(index)} color="error"><RemoveCircle /></IconButton>
              </Grid>
            </React.Fragment>
          ))}

          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>Criar Formulário</Button>
          </Grid>
        </Grid>
      </form>
    </div>
  );
};

export default FormCreatePage;
