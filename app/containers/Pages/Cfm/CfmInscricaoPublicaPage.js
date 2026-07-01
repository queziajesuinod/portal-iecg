import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress, Alert,
  Paper, Chip, Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SchoolIcon from '@mui/icons-material/School';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BASE = typeof window !== 'undefined' ? window.location.origin : '';
const formatarData = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };

export default function CfmInscricaoPublicaPage() {
  const { turmaId } = useParams();
  const [turma, setTurma] = useState(null);
  const [loadingTurma, setLoadingTurma] = useState(true);
  const [turmaError, setTurmaError] = useState('');
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cpf: '', observacoes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get(`${BASE}/api/public/cfm/turmas/${turmaId}`)
      .then((r) => setTurma(r.data.turma))
      .catch((e) => setTurmaError(e.response?.data?.erro || 'Turma não encontrada ou inscrições encerradas'))
      .finally(() => setLoadingTurma(false));
  }, [turmaId]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${BASE}/api/public/cfm/turmas/${turmaId}/inscricao`, form);
      setSuccess(true);
    } catch (submitErr) {
      setError(submitErr.response?.data?.erro || submitErr.message || 'Erro ao realizar inscrição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTurma) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (turmaError) {
    return (
      <Box display="flex" justifyContent="center" pt={8} px={2}>
        <Alert severity="error" sx={{ maxWidth: 480, width: '100%' }}>{turmaError}</Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box display="flex" justifyContent="center" pt={8} px={2}>
        <Paper elevation={2} sx={{
          p: 4, maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 3
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>Inscrição realizada!</Typography>
          <Typography color="text.secondary" mb={2}>
            Sua inscrição na turma <strong>{turma?.numeracao}</strong> foi recebida com sucesso.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aguarde o contato da administração para confirmar e orientar sobre o pagamento da matrícula.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const escola = turma?.escola?.nome || turma?.escola;
  const modulo = turma?.modulo?.nome || turma?.modulo;

  return (
    <Box display="flex" justifyContent="center" pt={6} pb={8} px={2}>
      <Paper elevation={2} sx={{
        p: { xs: 3, sm: 4 }, maxWidth: 520, width: '100%', borderRadius: 3
      }}>
        {/* Cabeçalho turma */}
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {escola || 'Centro de Formação de Ministério'}
            </Typography>
            {modulo && <Typography variant="body2" color="text.secondary">{modulo}</Typography>}
          </Box>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          {turma?.numeracao && <Chip size="small" label={`Turma ${turma.numeracao}`} color="primary" />}
          {turma?.periodoInicio && <Chip size="small" label={`Início: ${formatarData(turma.periodoInicio)}`} variant="outlined" />}
          {turma?.campus?.nome && <Chip size="small" label={turma.campus.nome} variant="outlined" />}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" fontWeight={600} mb={2}>Formulário de Inscrição</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nome completo"
            value={form.nome}
            onChange={handleChange('nome')}
            required fullWidth
            autoComplete="name"
          />
          <TextField
            label="E-mail"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            required fullWidth
            autoComplete="email"
          />
          <TextField
            label="Telefone / WhatsApp"
            value={form.telefone}
            onChange={handleChange('telefone')}
            required fullWidth
            autoComplete="tel"
            inputProps={{ inputMode: 'tel' }}
          />
          <TextField
            label="CPF (opcional)"
            value={form.cpf}
            onChange={handleChange('cpf')}
            fullWidth
            helperText="Informe seu CPF se já for membro cadastrado para vinculação automática"
            inputProps={{ inputMode: 'numeric' }}
          />
          <TextField
            label="Observações (opcional)"
            value={form.observacoes}
            onChange={handleChange('observacoes')}
            multiline rows={2}
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !form.nome || !form.email || !form.telefone}
            sx={{ mt: 1, py: 1.5 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Realizar Inscrição'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
