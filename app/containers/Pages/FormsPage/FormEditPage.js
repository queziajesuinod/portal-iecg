import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Grid, MenuItem, Typography, IconButton, Checkbox, FormControlLabel
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { useParams, useHistory } from 'react-router-dom';

const tiposDeCampo = ['text', 'number', 'email', 'date', 'checkbox', 'select'];
const gatewaysDisponiveis = ['efi', 'pagseguro', 'cielo'];

const FormEditPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    formTypeId: '',
    hasPayment: false,
    allowMultiplePayments: false,
    startDate: '',
    endDate: '',
    gateway: '',
    totalAmount: '',
    minEntry: '',
    dueDate: '',
    returnUrl: '',
    fields: []
  });
  const [formTypes, setFormTypes] = useState([]);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    const carregarFormTypes = async () => {
      const res = await fetch(`${API_URL}/form-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tipos = await res.json();
      setFormTypes(tipos);
    };

    const carregarFormulario = async () => {
      const res = await fetch(`${API_URL}/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dados = await res.json();
      setForm({
        ...dados,
        formTypeId: dados.formTypeId || '',
        fields: dados.FormFields || [],
        allowMultiplePayments: dados.allowMultiplePayments || false,
        gateway: dados?.FormPaymentConfig?.gateway || '',
        totalAmount: dados?.FormPaymentConfig?.totalAmount || '',
        minEntry: dados?.FormPaymentConfig?.minEntry || '',
        dueDate: dados?.FormPaymentConfig?.dueDate?.substring(0, 10) || '',
        returnUrl: dados?.FormPaymentConfig?.returnUrl || ''
      });
    };

    carregarFormTypes();
    carregarFormulario();
  }, [id, API_URL]);

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

    try {
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
        setNotification('Formulário atualizado com sucesso!');
        setTimeout(() => history.push('/app/forms'), 1500);
      } else {
        setNotification(data.message || 'Erro ao atualizar formulário');
      }
    } catch (err) {
      console.error('Erro ao atualizar formulário:', err);
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{form.name ? `Editando: ${form.name}` : 'Editar Formulário'}</title>
      </Helmet>
      <PapperBlock title={form.name || 'Editar Formulário'} desc="Edite os dados do formulário">
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
              <TextField label="Início" name="startDate" type="date" fullWidth value={form.startDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Fim" name="endDate" type="date" fullWidth value={form.endDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Tipo de Formulário" name="formTypeId" select value={form.formTypeId} onChange={handleChange} fullWidth required>
                {Array.isArray(formTypes) && formTypes.map((ft) => (
                  <MenuItem key={ft.id} value={ft.id}>{ft.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={form.hasPayment} onChange={handleChange} name="hasPayment" />} label="Formulário com pagamento?" />
            </Grid>

            {form.hasPayment && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField label="Gateway de Pagamento" name="gateway" select value={form.gateway} onChange={handleChange} fullWidth required>
                    {gatewaysDisponiveis.map(g => (
                      <MenuItem key={g} value={g}>{g.toUpperCase()}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Valor Total (R$)" name="totalAmount" type="number" value={form.totalAmount} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Entrada Mínima (R$)" name="minEntry" type="number" value={form.minEntry} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Data de Vencimento" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel control={<Checkbox checked={form.allowMultiplePayments} onChange={handleChange} name="allowMultiplePayments" />} label="Permitir múltiplos pagamentos por pessoa" />
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
              <Button type="submit" variant="contained" color="primary" fullWidth>Atualizar Formulário</Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default FormEditPage;