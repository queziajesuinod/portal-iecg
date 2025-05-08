import React, { useEffect, useState } from 'react';
import {
  Grid, TextField, Button, MenuItem, Typography, IconButton,
  Checkbox, FormControlLabel, Paper
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { Helmet } from 'react-helmet';
import Notification from 'dan-components/Notification';
import { PapperBlock } from 'dan-components';

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
    fields: [],
    gateway: '',
    totalAmount: '',
    minEntry: '',
    dueDate: '',
    returnUrl: '',
    allowMultiplePayments: false
  });
  const [tipos, setTipos] = useState([]);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/form-types`)
      .then(res => res.json())
      .then(setTipos)
      .catch(() => setTipos([]));
  }, []);

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
        setNotification('Formulário criado com sucesso!');
        setForm({
          name: '', description: '', slug: '', formTypeId: '', hasPayment: false,
          startDate: '', endDate: '', fields: [], gateway: '', totalAmount: '',
          minEntry: '', dueDate: '', returnUrl: '', allowMultiplePayments: false
        });
      } else {
        setNotification(data.message || 'Erro ao criar formulário');
      }
    } catch (err) {
      console.error('Erro ao enviar formulário:', err);
      setNotification('Erro ao conectar com o servidor');
    }
  };

  return (
    <div>
      <Helmet><title>Eventos</title></Helmet>
      <PapperBlock title="Novo Eventos" desc="Configure os campos e opções do Eventos">
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

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Tipo de Formulário"
                name="formTypeId"
                fullWidth
                value={form.formTypeId}
                onChange={handleChange}
              >
                {tipos.map(tipo => (
                  <MenuItem key={tipo.id} value={tipo.id}>{tipo.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.hasPayment} onChange={handleChange} name="hasPayment" />}
                label="Formulário com Pagamento?"
              />
            </Grid>

            {form.hasPayment && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Gateway de Pagamento"
                    name="gateway"
                    value={form.gateway}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="efi">Efi (Gerencianet)</MenuItem>
                    <MenuItem value="cielo">Cielo</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Valor Total (R$)" name="totalAmount" type="number" fullWidth value={form.totalAmount} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Valor Mínimo de Entrada (R$)" name="minEntry" type="number" fullWidth value={form.minEntry} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Data Limite para Pagamento" name="dueDate" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.dueDate} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="URL de Retorno" name="returnUrl" fullWidth value={form.returnUrl} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={form.allowMultiplePayments} onChange={handleChange} name="allowMultiplePayments" />}
                    label="Aceita Pagamentos Múltiplos?"
                  />
                </Grid>
              </>
            )}

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
                  <TextField label="Opções (se for select)" name="options" value={field.options} onChange={(e) => handleFieldChange(index, e)} fullWidth />
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
              <Button type="submit" variant="contained" color="primary" fullWidth>Criar Formulário</Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default FormCreatePage;
