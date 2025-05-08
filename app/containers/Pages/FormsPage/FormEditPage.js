// FormCreateEditPage.js - Cria e edita formulários dinâmicos com opção de pagamento
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Grid, MenuItem, Typography, IconButton, Checkbox, FormControlLabel
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { useParams, useHistory } from 'react-router-dom';

const tiposDeCampo = ['text', 'number', 'email', 'date', 'checkbox', 'select'];
const gatewaysDisponiveis = ['efi'];

const FormCreateEditPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const history = useHistory();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    formTypeId: '',
    hasPayment: false,
    paymentGateway: '',
    startDate: '',
    endDate: '',
    fields: []
  });
  const [formTypes, setFormTypes] = useState([]);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const carregarFormTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/form-types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tipos = await res.json();
        setFormTypes(tipos);
      } catch (err) {
        setNotification('Erro ao carregar tipos de formulário');
      }
    };

    const carregarFormulario = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dados = await res.json();
        setForm({ ...dados, fields: dados.FormFields || [], formTypeId: dados.formTypeId || '' });
      } catch (err) {
        setNotification('Erro ao carregar formulário');
      }
    };

    carregarFormTypes();
    if (isEdit) carregarFormulario();
  }, [id, isEdit, API_URL]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updated = [...form.fields];
    updated[index][name] = type === 'checkbox' ? checked : value;
    setForm({ ...form, fields: updated });
  };

  const handleAddField = () => {
    setForm({ ...form, fields: [...form.fields, { label: '', type: 'text', required: false, options: '' }] });
  };

  const handleRemoveField = (index) => {
    const updated = [...form.fields];
    updated.splice(index, 1);
    setForm({ ...form, fields: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const endpoint = isEdit ? `${API_URL}/forms/${id}` : `${API_URL}/forms`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        setNotification('Formulário salvo com sucesso!');
        setTimeout(() => history.push('/app/forms'), 1500);
      } else {
        setNotification(data.message || 'Erro ao salvar formulário');
      }
    } catch (err) {
      setNotification('Erro ao conectar com o servidor');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'Editar Formulário' : 'Criar Formulário'}</title>
      </Helmet>
      <PapperBlock title={isEdit ? 'Editar Formulário' : 'Criar Novo Formulário'} desc="Preencha os dados abaixo">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField name="name" label="Nome" fullWidth required value={form.name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="slug" label="Slug (URL)" fullWidth required value={form.slug} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField name="description" label="Descrição" multiline fullWidth value={form.description} onChange={handleChange} />
            </Grid>
            <Grid item xs={6}>
              <TextField name="startDate" label="Início" type="date" fullWidth value={form.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField name="endDate" label="Fim" type="date" fullWidth value={form.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="formTypeId" select label="Tipo de Formulário" value={form.formTypeId} onChange={handleChange} fullWidth required>
                {formTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Checkbox checked={form.hasPayment} onChange={handleChange} name="hasPayment" />}
                label="Habilitar pagamento"
              />
              {form.hasPayment && (
                <TextField
                  select
                  fullWidth
                  name="paymentGateway"
                  label="Gateway de Pagamento"
                  value={form.paymentGateway}
                  onChange={handleChange}
                >
                  {gatewaysDisponiveis.map(g => <MenuItem key={g} value={g}>{g.toUpperCase()}</MenuItem>)}
                </TextField>
              )}
            </Grid>
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
                    {tiposDeCampo.map(tipo => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={3}>
                  <TextField label="Opções (se for select)" name="options" value={field.options} onChange={(e) => handleFieldChange(index, e)} fullWidth />
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
              <Button type="submit" variant="contained" color="primary" fullWidth>
                {isEdit ? 'Atualizar Formulário' : 'Criar Formulário'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default FormCreateEditPage;
