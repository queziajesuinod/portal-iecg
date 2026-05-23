import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box, Paper, Typography, Stepper, Step, StepLabel,
  Button, CircularProgress, Alert, Autocomplete, TextField,
  Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, FormControl, InputLabel, Chip,
  Stack, Divider, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ErrorIcon from '@mui/icons-material/Error';
import { PapperBlock, Notification } from 'dan-components';
import { useLocation } from 'react-router-dom';
import {
  listarEventos, getImportSetup, previewImport, executeImport
} from '../../../api/eventImportApi';

const STEPS = ['Selecionar Evento', 'Mapear Campos', 'Pré-visualizar', 'Resultado'];

const STATUS_OPTIONS = ['MEMBRO', 'CONGREGADO', 'VISITANTE'];

const ACTION_CHIP = {
  create: { label: 'Criar membro', color: 'success', icon: <AddCircleIcon fontSize="small" /> },
  add_activity: { label: 'Adicionar atividade', color: 'info', icon: <CheckCircleIcon fontSize="small" /> },
  skip: { label: 'Já importado', color: 'default', icon: <SkipNextIcon fontSize="small" /> }
};

export default function EventImportPage() {
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1
  const [eventos, setEventos] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Step 2
  const [setup, setSetup] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [buyerFieldMapping, setBuyerFieldMapping] = useState({});
  const [memberStatus, setMemberStatus] = useState('MEMBRO');

  // Step 3
  const [preview, setPreview] = useState(null);

  // Step 4
  const [result, setResult] = useState(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const preselectedId = qs.get('eventId') || null;

    setLoading(true);
    listarEventos()
      .then(async (data) => {
        const list = Array.isArray(data?.eventos) ? data.eventos : (Array.isArray(data) ? data : []);
        setEventos(list);

        if (!preselectedId) return;

        const found = list.find((e) => e.id === preselectedId);
        if (!found) {
          setError(`Evento não encontrado (id: ${preselectedId})`);
          return;
        }

        setSelectedEvent(found);
        try {
          const setupData = await getImportSetup(found.id);
          setSetup(setupData);
          setFieldMapping(setupData.suggestedMapping || {});
          setBuyerFieldMapping(setupData.suggestedBuyerMapping || {});
          setActiveStep(1);
        } catch (err) {
          setError(err.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectEvent = async (eventOverride) => {
    const ev = eventOverride || selectedEvent;
    if (!ev) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getImportSetup(ev.id);
      setSetup(data);
      setFieldMapping(data.suggestedMapping || {});
      setBuyerFieldMapping(data.suggestedBuyerMapping || {});
      setActiveStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await previewImport(selectedEvent.id, { fieldMapping, buyerFieldMapping });
      setPreview(data);
      setActiveStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await executeImport(selectedEvent.id, { fieldMapping, buyerFieldMapping, memberStatus });
      setResult(data);
      setActiveStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedEvent(null);
    setSetup(null);
    setFieldMapping({});
    setBuyerFieldMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Selecione o evento para importar os inscritos como membros.</Typography>
      <Autocomplete
        options={eventos}
        getOptionLabel={(e) => {
          const date = e.startDate ? new Date(e.startDate).toLocaleDateString('pt-BR') : '';
          const finished = e.endDate && new Date(e.endDate) < new Date() ? ' ✓ Finalizado' : '';
          return `${e.title}${date ? ` — ${date}` : ''}${finished}`;
        }}
        value={selectedEvent}
        onChange={(_, v) => setSelectedEvent(v)}
        renderInput={(params) => <TextField {...params} label="Evento (incluindo finalizados)" size="small" />}
        sx={{ maxWidth: 520, mb: 3 }}
      />
      <Button variant="contained" disabled={!selectedEvent || loading} onClick={handleSelectEvent}>
        {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
        Próximo
      </Button>
    </Box>
  );

  const renderImportedBanner = () => {
    if (!setup || setup.importedCount === 0) return null;
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Este evento já teve <strong>{setup.importedCount}</strong> inscritos importados como membros.
        Você pode reimportar — inscritos já importados serão ignorados automaticamente.
      </Alert>
    );
  };

  const renderMappingTable = (label, fields, mapping, setMapping) => {
    if (!fields || !fields.length) return null;
    return (
      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>{label}</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Campo do evento</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Mapear para campo do membro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.fieldName}>
                <TableCell>{f.fieldLabel} {f.isRequired && <Chip label="obrigatório" size="small" sx={{ ml: 0.5 }} />}</TableCell>
                <TableCell><Chip label={f.fieldType} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={mapping[f.fieldName] || ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [f.fieldName]: e.target.value || null }))}
                      displayEmpty
                    >
                      <MenuItem value="">(não importar)</MenuItem>
                      {setup.memberFields.map((mf) => (
                        <MenuItem key={mf.key} value={mf.key}>{mf.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderStep2 = () => {
    if (!setup) return null;
    const hasName = Object.values(fieldMapping).includes('fullName') || Object.values(buyerFieldMapping).includes('fullName');
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          <strong>{setup.event?.title}</strong> — {setup.attendeeCount} inscritos confirmados
        </Typography>

        {renderImportedBanner()}

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Associe os campos do formulário do evento aos campos do cadastro de membro.
        </Typography>

        {renderMappingTable('Campos dos inscritos', setup.attendeeFields, fieldMapping, setFieldMapping)}
        {renderMappingTable('Campos do comprador (fallback quando inscrito não preenche)', setup.buyerFields, buyerFieldMapping, setBuyerFieldMapping)}

        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status do novo membro</InputLabel>
            <Select value={memberStatus} label="Status do novo membro" onChange={(e) => setMemberStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {!hasName && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Mapeie ao menos um campo para <strong>Nome completo</strong> para continuar.
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => setActiveStep(0)}>Voltar</Button>
          <Button variant="contained" disabled={!hasName || loading} onClick={handlePreview}>
            {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Pré-visualizar
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderStep3 = () => {
    if (!preview) return null;
    const { attendees, summary } = preview;
    return (
      <Box>
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
          <Chip icon={<AddCircleIcon />} label={`${summary.create || 0} serão criados`} color="success" />
          <Chip icon={<CheckCircleIcon />} label={`${summary.add_activity || 0} recebem atividade`} color="info" />
          <Chip icon={<SkipNextIcon />} label={`${summary.skip || 0} já importados`} color="default" />
        </Stack>

        <Box sx={{ maxHeight: 420, overflow: 'auto', mb: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Membro existente</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendees.map((att, idx) => {
                const chip = ACTION_CHIP[att.action] || ACTION_CHIP.skip;
                return (
                  <TableRow key={att.attendeeId}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{att.mappedData.fullName || <Typography color="error" variant="body2">sem nome</Typography>}</TableCell>
                    <TableCell>{att.mappedData.email || '-'}</TableCell>
                    <TableCell>{att.mappedData.whatsapp || att.mappedData.phone || '-'}</TableCell>
                    <TableCell>
                      {att.existingMember
                        ? <Tooltip title={att.existingMember.id}><span>{att.existingMember.fullName}</span></Tooltip>
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" icon={chip.icon} label={chip.label} color={chip.color} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => setActiveStep(1)}>Voltar</Button>
          <Button variant="contained" color="success" disabled={loading} onClick={handleExecute}>
            {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Executar importação
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderStep4 = () => {
    if (!result) return null;
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          Importação concluída!
        </Alert>
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <Chip icon={<AddCircleIcon />} label={`${result.created} membros criados`} color="success" />
          <Chip icon={<CheckCircleIcon />} label={`${result.addedActivity} atividades adicionadas`} color="info" />
          <Chip icon={<SkipNextIcon />} label={`${result.skipped} ignorados`} color="default" />
          {result.errors?.length > 0 && (
            <Chip icon={<ErrorIcon />} label={`${result.errors.length} erros`} color="error" />
          )}
        </Stack>

        {result.errors?.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" color="error" gutterBottom>Erros:</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pedido</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.errors.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.orderCode || e.attendeeId}</TableCell>
                    <TableCell><Typography color="error" variant="body2">{e.erro}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Button variant="contained" onClick={handleReset}>Nova importação</Button>
      </Box>
    );
  };

  const STEP_CONTENT = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <PapperBlock title="Importar inscritos de evento" desc="De-para: campos do formulário de inscrição → cadastro de membro">
      <Helmet><title>Importar Inscritos</title></Helmet>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        {STEP_CONTENT[activeStep]?.()}
      </Paper>
      <Notification message={error || ''} close={() => setError(null)} type="error" />
    </PapperBlock>
  );
}
