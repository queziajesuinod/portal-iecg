import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid, Card, CardContent, Typography, Button, Box, Table, TableContainer,
  TableBody, TableCell, TableHead, TableRow, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, FormControlLabel, Checkbox, Switch, Autocomplete, Alert,
  Divider, List, ListItem, ListItemText, Stack, CircularProgress
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import ScienceIcon from '@mui/icons-material/Science';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { useConfirm } from '../../../utils/useConfirm';
import {
  buscarEvento,
  listarCoordenadoresEvento, obterOpcoesCamposCoordenador, criarCoordenadorEvento,
  atualizarCoordenadorEvento, deletarCoordenadorEvento, validarCoordenadorEvento,
  enviarRelatorioCoordenador, enviarTesteCoordenador
} from '../../../api/eventsApi';
import { listarMembros } from '../../../api/membersApi';
import { formatDateTimeInAppTimezone } from '../../../utils/dateTime';

const CONTENT_LABELS = {
  newRegistrants: 'Novos inscritos',
  fullList: 'Lista geral',
  partialPayments: 'Pagamento parcial',
  netValue: 'Valor líquido'
};

const emptyForm = {
  memberId: null,
  member: null,
  name: '',
  email: '',
  phone: '',
  channels: { email: true, whatsapp: false },
  content: {
    newRegistrants: true, fullList: true, partialPayments: true, netValue: true, attachments: true, breakdownFields: []
  },
  listFields: ['attendee.nome', 'batch.name', 'payment.status'],
  intervalDays: 2,
  sendHour: 8,
  windowSource: 'BATCH_PERIOD',
  windowStart: '',
  windowEnd: '',
  isActive: true
};

function EventCoordinators() {
  const { id } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [notification, setNotification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [memberSearch, setMemberSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [validateResult, setValidateResult] = useState(null);

  const eventoQuery = useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => buscarEvento(id),
    enabled: Boolean(id)
  });
  const evento = eventoQuery.data || null;

  const coordsQuery = useQuery({
    queryKey: ['events', 'coordinators', id],
    queryFn: () => listarCoordenadoresEvento(id),
    enabled: Boolean(id)
  });
  const coordenadores = coordsQuery.data || [];

  const fieldOptionsQuery = useQuery({
    queryKey: ['events', 'coordinator-field-options', id],
    queryFn: () => obterOpcoesCamposCoordenador(id),
    enabled: Boolean(id)
  });
  const fieldOptions = fieldOptionsQuery.data || { standard: [], form: [] };
  const allFields = useMemo(
    () => [...(fieldOptions.standard || []), ...(fieldOptions.form || [])],
    [fieldOptions]
  );
  const fieldLabel = (key) => allFields.find((f) => f.key === key)?.label || key;

  // Campos que fazem sentido para "contabilizar por" (exclui valores/datas/identificadores).
  const NON_GROUPABLE = ['payment.finalPrice', 'payment.paidTotal', 'payment.remaining', 'registration.createdAt', 'registration.orderCode', 'attendee.nome'];
  const groupableFields = useMemo(
    () => allFields.filter((f) => !NON_GROUPABLE.includes(f.key)),
    [allFields]
  );

  const membersQuery = useQuery({
    queryKey: ['members', 'search', memberSearch],
    queryFn: () => listarMembros({ search: memberSearch, limit: 20 }),
    enabled: memberSearch.length >= 2
  });
  const memberOptions = membersQuery.data?.members || [];

  const invalidateCoords = () => queryClient.invalidateQueries({ queryKey: ['events', 'coordinators', id] });

  const abrirDialog = (coordenador = null) => {
    setValidateResult(null);
    if (coordenador) {
      setEditing(coordenador);
      setForm({
        memberId: coordenador.memberId || null,
        member: coordenador.member || null,
        name: coordenador.name || '',
        email: coordenador.email || '',
        phone: coordenador.phone || '',
        channels: { email: false, whatsapp: false, ...(coordenador.channels || {}) },
        content: { ...emptyForm.content, ...(coordenador.content || {}) },
        listFields: Array.isArray(coordenador.listFields) && coordenador.listFields.length
          ? coordenador.listFields
          : [...emptyForm.listFields],
        intervalDays: coordenador.intervalDays ?? 2,
        sendHour: coordenador.sendHour ?? 8,
        windowSource: coordenador.windowSource || 'BATCH_PERIOD',
        windowStart: coordenador.windowStart ? coordenador.windowStart.substring(0, 16) : '',
        windowEnd: coordenador.windowEnd ? coordenador.windowEnd.substring(0, 16) : '',
        isActive: coordenador.isActive !== false
      });
    } else {
      setEditing(null);
      setForm({
        ...emptyForm, content: { ...emptyForm.content }, channels: { ...emptyForm.channels }, listFields: [...emptyForm.listFields]
      });
    }
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setMemberSearch('');
  };

  const salvarMutation = useMutation({
    mutationFn: ({ coordId, dados }) => (coordId ? atualizarCoordenadorEvento(coordId, dados) : criarCoordenadorEvento(id, dados)),
    onSuccess: (_data, { coordId }) => {
      setNotification(coordId ? 'Coordenador atualizado!' : 'Coordenador criado!');
      fecharDialog();
      invalidateCoords();
    },
    onError: (err) => setNotification(err.message || 'Erro ao salvar coordenador')
  });

  const handleSalvar = () => {
    if (!form.channels.email && !form.channels.whatsapp) {
      setNotification('Selecione ao menos um canal de envio.');
      return;
    }
    if (!form.memberId && !form.email && !form.phone) {
      setNotification('Vincule um membro ou informe e-mail/telefone de contato.');
      return;
    }
    const dados = {
      memberId: form.memberId || null,
      name: form.name || null,
      email: form.email || null,
      phone: form.phone || null,
      channels: form.channels,
      content: form.content,
      listFields: form.listFields,
      intervalDays: Number(form.intervalDays) || 2,
      sendHour: Number(form.sendHour) || 0,
      windowSource: form.windowSource,
      windowStart: form.windowSource === 'CUSTOM' && form.windowStart ? form.windowStart : null,
      windowEnd: form.windowSource === 'CUSTOM' && form.windowEnd ? form.windowEnd : null,
      isActive: form.isActive
    };
    salvarMutation.mutate({ coordId: editing?.id || null, dados });
  };

  const deletarMutation = useMutation({
    mutationFn: (coordId) => deletarCoordenadorEvento(coordId),
    onSuccess: () => { setNotification('Coordenador removido.'); invalidateCoords(); },
    onError: (err) => setNotification(err.message || 'Erro ao remover coordenador')
  });

  const handleDeletar = async (coordenador) => {
    const nome = coordenador.name || coordenador.member?.fullName || 'este coordenador';
    const ok = await confirm({
      title: 'Remover coordenador', message: `Deseja remover "${nome}"?`, confirmText: 'Remover', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    deletarMutation.mutate(coordenador.id);
  };

  const handleValidar = async (coordenador) => {
    setBusyId(coordenador.id);
    setValidateResult(null);
    try {
      const res = await validarCoordenadorEvento(coordenador.id);
      setValidateResult({ coordId: coordenador.id, ...res });
    } catch (err) {
      setNotification(err.message || 'Erro ao validar envio');
    } finally {
      setBusyId(null);
    }
  };

  const resumoEnvio = (res) => {
    if (!res) return '';
    const partes = (res.results || []).map((r) => `${r.channel === 'email' ? 'E-mail' : 'WhatsApp'}: ${r.status === 'sent' ? 'enviado' : `falhou (${r.error || 'erro'})`}`);
    return partes.join(' | ');
  };

  const handleEnviar = async (coordenador, teste = false) => {
    setBusyId(coordenador.id);
    try {
      const res = teste
        ? await enviarTesteCoordenador(coordenador.id)
        : await enviarRelatorioCoordenador(coordenador.id);
      setNotification(`${teste ? 'Teste' : 'Envio'} concluído. ${resumoEnvio(res)}`);
      if (!teste) invalidateCoords();
    } catch (err) {
      setNotification(err.message || 'Erro ao enviar relatório');
    } finally {
      setBusyId(null);
    }
  };

  // ===== Seletor de colunas =====
  const toggleField = (key) => {
    setForm((prev) => {
      const has = prev.listFields.includes(key);
      return {
        ...prev,
        listFields: has ? prev.listFields.filter((k) => k !== key) : [...prev.listFields, key]
      };
    });
  };

  const moveField = (index, dir) => {
    setForm((prev) => {
      const arr = [...prev.listFields];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...prev, listFields: arr };
    });
  };

  const setChannel = (key, value) => setForm((p) => ({ ...p, channels: { ...p.channels, [key]: value } }));
  const setContent = (key, value) => setForm((p) => ({ ...p, content: { ...p.content, [key]: value } }));

  const title = `${brand.name} - Coordenadores${evento?.title ? ` - ${evento.title}` : ''}`;
  const isBalanceDue = evento?.registrationPaymentMode === 'BALANCE_DUE';

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>

      <PapperBlock title={`Coordenadores${evento?.title ? ` — ${evento.title}` : ''}`} icon="ion-ios-contacts-outline" desc="Envio periódico de relatórios ao coordenador do evento (e-mail e/ou WhatsApp).">
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => history.push(`/app/events/${id}`)}>Voltar</Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => abrirDialog()}>Novo coordenador</Button>
        </Stack>

        {coordsQuery.isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : coordenadores.length === 0 ? (
          <Typography color="textSecondary">Nenhum coordenador cadastrado para este evento.</Typography>
        ) : (
          <TableContainer sx={{ width: '100%', overflowX: 'auto', '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Coordenador</TableCell>
                  <TableCell>Canais</TableCell>
                  <TableCell>Conteúdo</TableCell>
                  <TableCell>Cadência</TableCell>
                  <TableCell>Próximo envio</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coordenadores.map((c) => {
                  const nome = c.name || c.member?.fullName || '(sem nome)';
                  const contato = c.email || c.member?.email || c.phone || c.member?.whatsapp || c.member?.phone || '-';
                  const conteudo = Object.entries(c.content || {}).filter(([, v]) => v).map(([k]) => CONTENT_LABELS[k] || k).join(', ');
                  const busy = busyId === c.id;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{nome}</Typography>
                        <Typography variant="caption" color="textSecondary">{contato}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {c.channels?.email && <Chip size="small" icon={<EmailIcon />} label="E-mail" />}
                          {c.channels?.whatsapp && <Chip size="small" color="success" icon={<WhatsAppIcon />} label="WhatsApp" />}
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="caption">{conteudo || '-'}</Typography></TableCell>
                      <TableCell>{`A cada ${c.intervalDays}d às ${String(c.sendHour).padStart(2, '0')}h`}</TableCell>
                      <TableCell>{c.isActive && c.nextRunAt ? formatDateTimeInAppTimezone(c.nextRunAt) : '-'}</TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={c.isActive ? 'Ativo' : 'Inativo'} color={c.isActive ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell align="center">
                        {busy ? <CircularProgress size={20} /> : (
                          <>
                            <Tooltip title="Validar envio"><IconButton size="small" onClick={() => handleValidar(c)}><FactCheckIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Testar envio"><IconButton size="small" onClick={() => handleEnviar(c, true)}><ScienceIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Enviar agora"><IconButton size="small" color="primary" onClick={() => handleEnviar(c, false)}><SendIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirDialog(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Remover"><IconButton size="small" color="error" onClick={() => handleDeletar(c)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {validateResult && (
          <Alert severity={((validateResult.email?.ok !== false) && (validateResult.whatsapp?.ok !== false)) ? 'success' : 'warning'} sx={{ mt: 2 }} onClose={() => setValidateResult(null)}>
            {validateResult.email && <div>E-mail: {validateResult.email.ok ? '✓ ' : '✗ '}{validateResult.email.message}</div>}
            {validateResult.whatsapp && <div>WhatsApp: {validateResult.whatsapp.ok ? '✓ ' : '✗ '}{validateResult.whatsapp.message}</div>}
          </Alert>
        )}
      </PapperBlock>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onClose={fecharDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar coordenador' : 'Novo coordenador'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Vínculo do coordenador */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Coordenador</Typography>
              <Autocomplete
                options={memberOptions}
                value={form.member}
                getOptionLabel={(m) => (m ? `${m.fullName}${m.email ? ` — ${m.email}` : ''}` : '')}
                isOptionEqualToValue={(o, v) => o.id === v?.id}
                loading={membersQuery.isFetching}
                onInputChange={(_e, value) => setMemberSearch(value)}
                onChange={(_e, value) => setForm((p) => ({
                  ...p,
                  member: value,
                  memberId: value?.id || null,
                  name: value?.fullName || p.name,
                  email: p.email || value?.email || '',
                  phone: p.phone || value?.whatsapp || value?.phone || ''
                }))}
                renderInput={(params) => <TextField {...params} label="Vincular membro (buscar por nome/e-mail)" placeholder="Digite ao menos 2 letras" />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Nome (override)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="E-mail" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="WhatsApp/Telefone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Canais */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Canais de envio</Typography>
              <FormControlLabel control={<Checkbox checked={!!form.channels.email} onChange={(e) => setChannel('email', e.target.checked)} />} label="E-mail" />
              <FormControlLabel control={<Checkbox checked={!!form.channels.whatsapp} onChange={(e) => setChannel('whatsapp', e.target.checked)} />} label="WhatsApp" />
            </Grid>

            {/* Conteúdo */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>O que enviar</Typography>
              <FormControlLabel control={<Checkbox checked={form.content.newRegistrants !== false} onChange={(e) => setContent('newRegistrants', e.target.checked)} />} label={CONTENT_LABELS.newRegistrants} />
              <FormControlLabel control={<Checkbox checked={form.content.fullList !== false} onChange={(e) => setContent('fullList', e.target.checked)} />} label={CONTENT_LABELS.fullList} />
              <FormControlLabel
                control={<Checkbox checked={form.content.partialPayments !== false} onChange={(e) => setContent('partialPayments', e.target.checked)} disabled={!isBalanceDue} />}
                label={`${CONTENT_LABELS.partialPayments}${!isBalanceDue ? ' (evento sem pagamento parcial)' : ''}`}
              />
              <FormControlLabel control={<Checkbox checked={form.content.netValue !== false} onChange={(e) => setContent('netValue', e.target.checked)} />} label={CONTENT_LABELS.netValue} />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={<Checkbox checked={form.content.attachments !== false} onChange={(e) => setContent('attachments', e.target.checked)} />}
                label="Anexar listas (CSV)"
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Desmarque para enviar apenas o texto/resumo, sem os arquivos de lista.
              </Typography>
            </Grid>

            {/* Contabilizar na mensagem por campo (ex.: por Setor, por Lote) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Contabilizar na mensagem por</Typography>
              <Autocomplete
                multiple
                options={groupableFields}
                getOptionLabel={(f) => f.label}
                isOptionEqualToValue={(o, v) => o.key === v.key}
                value={groupableFields.filter((f) => (form.content.breakdownFields || []).includes(f.key))}
                onChange={(_e, value) => setContent('breakdownFields', value.map((v) => v.key))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Ex.: Setor, Lote"
                    helperText="A mensagem mostra a quantidade de inscritos por cada campo escolhido (ex.: por Setor)"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Seletor de colunas das listas */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Colunas das listas</Typography>
              <Typography variant="caption" color="textSecondary">Escolha quais campos vão nas listas (CSV) e a ordem de envio.</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent sx={{ maxHeight: 260, overflowY: 'auto', py: 1 }}>
                  <Typography variant="caption" color="textSecondary">Disponíveis</Typography>
                  {allFields.map((f) => (
                    <FormControlLabel
                      key={f.key}
                      sx={{ display: 'flex' }}
                      control={<Checkbox size="small" checked={form.listFields.includes(f.key)} onChange={() => toggleField(f.key)} />}
                      label={<span>{f.label} {f.section && <Chip size="small" variant="outlined" label={f.section} sx={{ ml: 0.5, height: 18 }} />}</span>}
                    />
                  ))}
                  {!allFields.length && <Typography variant="body2" color="textSecondary">Carregando campos…</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent sx={{ maxHeight: 260, overflowY: 'auto', py: 1 }}>
                  <Typography variant="caption" color="textSecondary">Selecionadas (ordem)</Typography>
                  <List dense>
                    {form.listFields.map((key, index) => (
                      <ListItem
                        key={key}
                        disableGutters
                        secondaryAction={(
                          <>
                            <IconButton size="small" onClick={() => moveField(index, -1)} disabled={index === 0}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                            <IconButton size="small" onClick={() => moveField(index, 1)} disabled={index === form.listFields.length - 1}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => toggleField(key)}><DeleteIcon fontSize="inherit" /></IconButton>
                          </>
                        )}
                      >
                        <ListItemText primary={`${index + 1}. ${fieldLabel(key)}`} />
                      </ListItem>
                    ))}
                    {!form.listFields.length && <Typography variant="body2" color="textSecondary">Nenhuma coluna selecionada — será usado o padrão.</Typography>}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Cadência e janela */}
            <Grid item xs={6} sm={3}>
              <TextField fullWidth type="number" label="Intervalo (dias)" inputProps={{ min: 1 }} value={form.intervalDays} onChange={(e) => setForm((p) => ({ ...p, intervalDays: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth type="number" label="Hora do envio (0-23)" inputProps={{ min: 0, max: 23 }} value={form.sendHour} onChange={(e) => setForm((p) => ({ ...p, sendHour: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Período de envio</InputLabel>
                <Select label="Período de envio" value={form.windowSource} onChange={(e) => setForm((p) => ({ ...p, windowSource: e.target.value }))}>
                  <MenuItem value="BATCH_PERIOD">Durante a inscrição dos lotes</MenuItem>
                  <MenuItem value="CUSTOM">Período personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {form.windowSource === 'CUSTOM' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" label="Início" InputLabelProps={{ shrink: true }} value={form.windowStart} onChange={(e) => setForm((p) => ({ ...p, windowStart: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" label="Fim" InputLabelProps={{ shrink: true }} value={form.windowEnd} onChange={(e) => setForm((p) => ({ ...p, windowEnd: e.target.value }))} />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />} label="Envio automático ativo" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSalvar} disabled={salvarMutation.isPending}>
            {salvarMutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}

export default EventCoordinators;
