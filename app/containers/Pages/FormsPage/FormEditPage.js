import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton,
  Box
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import { Helmet } from 'react-helmet';
import { Notification, PapperBlock } from 'dan-components';
import { useParams, useHistory } from 'react-router-dom';

const tiposDeCampo = ['text', 'number', 'email', 'date', 'checkbox', 'select'];

const formatDate = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

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
    configuracaoPagamento: {
      gateway: '',
      totalAmount: '',
      minEntry: '',
      dueDate: '',
      returnUrl: ''
    },
    fields: []
  });

  const [formTypes, setFormTypes] = useState([]);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    // Carrega tipos de formulário
    const fetchFormTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/form-types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setFormTypes(data);
        } else {
          setNotification('Erro ao carregar tipos de formulário.');
        }
      } catch (error) {
        setNotification('Erro ao carregar tipos de formulário.');
      }
    };

    // Carrega dados do formulário
    const fetchForm = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        setForm({
          name: data.name || '',
          description: data.description || '',
          slug: data.slug || '',
          formTypeId: data.formTypeId || '',
          hasPayment: data.hasPayment || false,
          allowMultiplePayments: data.allowMultiplePayments || false,
          startDate: formatDate(data.startDate),
          endDate: formatDate(data.endDate),
          configuracaoPagamento: {
            gateway: data.FormPaymentConfig?.gateway || '',
            totalAmount: data.FormPaymentConfig?.totalAmount || '',
            minEntry: data.FormPaymentConfig?.minEntry || '',
            dueDate: formatDate(data.FormPaymentConfig?.dueDate),
            returnUrl: data.FormPaymentConfig?.returnUrl || ''
          },
          fields: (data.FormFields || []).map(f => ({
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options
          }))
        });
      } catch (error) {
        setNotification('Erro ao carregar formulário.');
      }
    };

    fetchFormTypes();
    fetchForm();
    // eslint-disable-next-line
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Pagamento
    if (name.startsWith('pagamento_')) {
      setForm({
        ...form,
        configuracaoPagamento: {
          ...form.configuracaoPagamento,
          [name.replace('pagamento_', '')]: value
        }
      });
    } else if (name === 'hasPayment' || name === 'allowMultiplePayments') {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
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

    // Payload
    const payload = {
      ...form,
      configuracaoPagamento: form.hasPayment ? form.configuracaoPagamento : undefined,
    };

    try {
      const res = await fetch(`${API_URL}/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setNotification('Formulário atualizado com sucesso!');
        setTimeout(() => history.push('/app/eventos'), 1500);
      } else {
        setNotification(data.message || 'Erro ao atualizar formulário');
      }
    } catch (err) {
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{form.name ? `Editar: ${form.name}` : 'Editar Evento'}</title>
      </Helmet>
      <PapperBlock title={form.name || 'Editar Formulário'} desc="Edite os dados do Evento">
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
                  <TextField label="Gateway de Pagamento" name="pagamento_gateway" select value={form.configuracaoPagamento.gateway} onChange={handleChange} fullWidth required>
                    <MenuItem value="efi">Efi (Gerencianet)</MenuItem>
                    <MenuItem value="pagseguro">PagSeguro</MenuItem>
                    <MenuItem value="cielo">Cielo</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Valor Total (R$)" name="pagamento_totalAmount" type="number" value={form.configuracaoPagamento.totalAmount} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Entrada Mínima (R$)" name="pagamento_minEntry" type="number" value={form.configuracaoPagamento.minEntry} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Data de Vencimento" name="pagamento_dueDate" type="date" value={form.configuracaoPagamento.dueDate} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
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
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Atualizar Formulário
              </Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default FormEditPage;
