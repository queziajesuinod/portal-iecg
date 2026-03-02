import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  Box,
  Tab,
  Tabs,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import BedIcon from '@mui/icons-material/KingBed';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import brand from 'dan-api/dummy/brand';
import {
  getHousingConfig,
  getHousingAvailableFields,
  getEventBatches,
  saveHousingConfig,
  generateHousingAllocation,
  getHousingAllocation,
  saveHousingAllocation,
} from '../../../api/housingTeamsApi';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

TabPanel.defaultProps = {
  children: null,
};

export default function EventHousing() {
  const { id: eventId } = useParams();
  const [tab, setTab] = useState(0);
  const [notification, setNotification] = useState('');

  // ── Configuração de quartos ──
  const [rooms, setRooms] = useState([{ id: '1', name: 'Quarto 1', capacity: 4 }]);
  const [customRules, setCustomRules] = useState('');
  const [availableFields, setAvailableFields] = useState([]);
  const [availableFieldsByTable, setAvailableFieldsByTable] = useState({
    attendeeData: [],
    registrations: [],
    registrationAttendees: [],
  });
  const [eventBatches, setEventBatches] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Geração LLM ──
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null); // alocação temporária não salva
  const [editableAllocation, setEditableAllocation] = useState([]);

  // ── Alocação salva ──
  const [savedAllocation, setSavedAllocation] = useState([]);
  const [savingAllocation, setSavingAllocation] = useState(false);

  async function carregarDados() {
    try {
      const [config, allocation, availableFieldsResponse, batchesResponse] = await Promise.all([
        getHousingConfig(eventId).catch(() => null),
        getHousingAllocation(eventId).catch(() => []),
        getHousingAvailableFields(eventId).catch(() => ({ fields: [] })),
        getEventBatches(eventId).catch(() => []),
      ]);

      if (config) {
        setRooms(config.rooms || []);
        setCustomRules(config.customRules || '');
      }
      setSavedAllocation(allocation || []);
      setEventBatches(Array.isArray(batchesResponse) ? batchesResponse : []);
      const flattenedFields = Array.isArray(availableFieldsResponse?.fields) ? availableFieldsResponse.fields : [];
      setAvailableFields(flattenedFields);

      const byTableFromResponse = availableFieldsResponse?.byTable;
      const derivedByTable = {
        attendeeData: flattenedFields
          .filter((field) => typeof field === 'string' && field.startsWith('attendeeData.'))
          .map((field) => field.replace('attendeeData.', '')),
        registrations: flattenedFields
          .filter((field) => typeof field === 'string' && field.startsWith('registration.'))
          .map((field) => field.replace('registration.', '')),
        registrationAttendees: flattenedFields
          .filter((field) => typeof field === 'string' && field.startsWith('registrationAttendee.'))
          .map((field) => field.replace('registrationAttendee.', '')),
      };

      const byTable = byTableFromResponse || derivedByTable;
      setAvailableFieldsByTable({
        attendeeData: Array.isArray(byTable.attendeeData) ? byTable.attendeeData : [],
        registrations: Array.isArray(byTable.registrations) ? byTable.registrations : [],
        registrationAttendees: Array.isArray(byTable.registrationAttendees) ? byTable.registrationAttendees : [],
      });
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [eventId]);

  function handleAddBatchReference(batch) {
    if (!batch) return;
    const ruleText = `Considerar lote "${batch.name}" (eventBatch.id=${batch.id}) nas regras de alocacao.`;
    setCustomRules((prev) => {
      const normalized = String(prev || '').trim();
      return normalized ? `${normalized}\n- ${ruleText}` : `- ${ruleText}`;
    });
  }

  // ── Gerenciar quartos ──
  function addRoom() {
    const nextId = String(rooms.length + 1);
    setRooms((prev) => [...prev, { id: nextId, name: `Quarto ${nextId}`, capacity: 4 }]);
  }

  function updateRoom(index, field, value) {
    setRooms((prev) => prev.map((r, i) => (
      i === index ? { ...r, [field]: field === 'capacity' ? parseInt(value, 10) || 1 : value } : r
    )));
  }

  function removeRoom(index) {
    if (rooms.length === 1) return;
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Salvar configuração ──
  async function handleSaveConfig() {
    try {
      setSavingConfig(true);
      await saveHousingConfig(eventId, { rooms, customRules });
      setNotification('Configuração de quartos salva com sucesso!');
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  }

  // ── Gerar alocação via LLM ──
  async function handleGenerate() {
    try {
      setGenerating(true);
      setGenerationResult(null);
      // Salva config automaticamente antes de gerar
      await saveHousingConfig(eventId, { rooms, customRules });
      const result = await generateHousingAllocation(eventId, customRules);
      setGenerationResult(result);
      setEditableAllocation(result.allocation || []);
      setTab(1); // vai para aba de resultado
    } catch (err) {
      setNotification(err.message || 'Erro ao gerar alocação');
    } finally {
      setGenerating(false);
    }
  }

  // ── Salvar alocação final ──
  async function handleSaveAllocation() {
    if (!generationResult || !editableAllocation.length) return;
    const occupancy = editableAllocation.reduce((acc, item) => {
      const roomId = String(item.roomId || '');
      acc[roomId] = (acc[roomId] || 0) + 1;
      return acc;
    }, {});
    const overloadedRooms = rooms
      .map((room) => {
        const roomId = String(room.id);
        const used = occupancy[roomId] || 0;
        const capacity = Number(room.capacity || 0);
        return {
          roomName: room.name || `Quarto ${roomId}`,
          used,
          capacity
        };
      })
      .filter((room) => room.capacity > 0 && room.used > room.capacity);

    if (overloadedRooms.length > 0) {
      const detail = overloadedRooms
        .map((room) => `${room.roomName} (${room.used}/${room.capacity})`)
        .join(', ');
      setNotification(`Nao foi possivel salvar: quarto(s) lotado(s) - ${detail}`);
      return;
    }

    try {
      setSavingAllocation(true);
      await saveHousingAllocation(eventId, editableAllocation, generationResult.reasoning);
      setNotification('Alocação de hospedagem salva com sucesso!');
      await carregarDados();
      setGenerationResult(null);
      setEditableAllocation([]);
      setTab(2); // vai para aba de visualização salva
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar alocação');
    } finally {
      setSavingAllocation(false);
    }
  }

  // ── Agrupamento para exibição ──
  function getRoomById(roomId) {
    return rooms.find((room) => String(room.id) === String(roomId)) || null;
  }

  function recalculateSlotLabels(allocation = []) {
    const ordered = [...allocation].sort((a, b) => (
      String(a.roomId).localeCompare(String(b.roomId), 'pt-BR', { numeric: true })
      || String(a.slotLabel || '').localeCompare(String(b.slotLabel || ''), 'pt-BR', { numeric: true })
      || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })
    ));
    const counters = {};
    return ordered.map((item) => {
      const roomId = String(item.roomId);
      counters[roomId] = (counters[roomId] || 0) + 1;
      return {
        ...item,
        slotLabel: `${roomId}.${counters[roomId]}`
      };
    });
  }

  function normalizeAllocationForEditing(allocation = []) {
    const fallbackRoomId = rooms[0]?.id ? String(rooms[0].id) : '1';
    const normalized = allocation.map((item) => {
      const requestedRoomId = String(item.roomId || fallbackRoomId);
      const room = getRoomById(requestedRoomId) || getRoomById(fallbackRoomId);
      const roomId = String(room?.id || fallbackRoomId);
      return {
        ...item,
        attendeeId: item.attendeeId || item.attendee?.id || item.id,
        roomId,
        roomName: item.roomName || room?.name || `Quarto ${roomId}`
      };
    });
    return recalculateSlotLabels(normalized);
  }

  function handleMoveAllocationItem(attendeeId, targetRoomId) {
    setEditableAllocation((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => String(item.attendeeId || item.id) === String(attendeeId));
      if (index < 0) return prev;

      const currentRoomId = String(next[index].roomId || '');
      const destinationRoomId = String(targetRoomId || '');
      if (!destinationRoomId || currentRoomId === destinationRoomId) return prev;

      const room = getRoomById(destinationRoomId);
      if (!room) return prev;

      next[index] = {
        ...next[index],
        roomId: destinationRoomId,
        roomName: room.name || `Quarto ${destinationRoomId}`
      };
      return recalculateSlotLabels(next);
    });
  }

  function handleEditSavedAllocation() {
    if (!savedAllocation.length) return;
    const normalizedSaved = normalizeAllocationForEditing(savedAllocation);
    setEditableAllocation(normalizedSaved);
    setGenerationResult({
      allocation: normalizedSaved,
      warnings: [],
      reasoning: 'Edição manual da alocação salva.',
      totalAttendees: normalizedSaved.length
    });
    setTab(1);
  }

  function escapeCsvValue(value) {
    const normalized = String(value ?? '').replace(/"/g, '""');
    return `"${normalized}"`;
  }

  function exportAllocationToExcel(allocation = [], filePrefix = 'alocacao_hospedagem') {
    if (!allocation.length) {
      setNotification('Não há dados para exportar.');
      return;
    }

    const groups = {};
    allocation.forEach((item) => {
      const key = String(item.roomId || item.roomName);
      if (!groups[key]) {
        groups[key] = {
          roomName: item.roomName || key,
          items: []
        };
      }
      groups[key].items.push(item);
    });
    const groupedList = Object.values(groups).sort((left, right) => String(left.roomName).localeCompare(String(right.roomName), 'pt-BR', { sensitivity: 'base' }));
    const rows = [['Quarto', 'Cama', 'Nome', 'Idade', 'Lider de celula', 'Sexo']];
    groupedList.forEach((group) => {
      group.items.forEach((item) => {
        const nome = item.nome
          || item.attendee?.attendeeData?.nome_completo
          || item.attendee?.attendeeData?.nome
          || '-';
        const idade = item.idade || item.attendee?.attendeeData?.idade || '-';
        const liderDeCelula = item.lider_de_celula || item.attendee?.attendeeData?.lider_de_celula || '-';
        const sexo = item.attendee?.attendeeData?.sexo || '-';
        rows.push([group.roomName, item.slotLabel || '-', nome, idade, liderDeCelula, sexo]);
      });
    });

    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(';')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${filePrefix}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function groupByRoom(allocation) {
    const groups = {};
    allocation.forEach((item) => {
      const key = String(item.roomId || item.roomName);
      if (!groups[key]) {
        const room = getRoomById(key);
        groups[key] = {
          roomId: key,
          roomName: item.roomName || room?.name || key,
          items: []
        };
      }
      groups[key].items.push(item);
    });
    Object.values(groups).forEach((group) => {
      group.items.sort((left, right) => String(left.slotLabel || '').localeCompare(String(right.slotLabel || ''), 'pt-BR', { numeric: true }));
    });
    return Object.values(groups).sort((left, right) => String(left.roomId).localeCompare(String(right.roomId), 'pt-BR', { numeric: true }));
  }

  const totalSlots = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);

  const renderAllocationTable = (allocation, source = 'generated', editable = false) => {
    const groups = groupByRoom(allocation);
    if (!groups.length) return <Typography variant="body2" color="textSecondary">Nenhuma alocação disponível.</Typography>;

    return groups.map((group) => (
      <Box key={group.roomName} sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
          <BedIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
          {group.roomName}
          <Chip size="small" label={`${group.items.length} pessoa(s)`} sx={{ ml: 1 }} />
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={80}>Cama</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Idade</TableCell>
              <TableCell>Lider de celula</TableCell>
              {editable && <TableCell width={220}>Mover para</TableCell>}
              {source === 'saved' && <TableCell>Sexo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {group.items.map((item) => {
              const nome = item.nome
                || item.attendee?.attendeeData?.nome_completo
                || item.attendee?.attendeeData?.nome
                || '-';
              const idade = item.idade
                || item.attendee?.attendeeData?.idade
                || '-';
              const liderDeCelula = item.lider_de_celula
                || item.attendee?.attendeeData?.lider_de_celula
                || '-';
              const sexo = item.attendee?.attendeeData?.sexo || '';
              return (
                <TableRow key={item.attendeeId || item.id}>
                  <TableCell>
                    <Chip size="small" label={item.slotLabel} variant="outlined" />
                  </TableCell>
                  <TableCell>{nome}</TableCell>
                  <TableCell>{idade}</TableCell>
                  <TableCell>{liderDeCelula}</TableCell>
                  {editable && (
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={String(item.roomId || '')}
                        onChange={(event) => handleMoveAllocationItem(item.attendeeId || item.id, event.target.value)}
                      >
                        {rooms.map((room) => (
                          <MenuItem key={room.id} value={String(room.id)}>
                            {room.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  )}
                  {source === 'saved' && <TableCell>{sexo}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    ));
  };

  return (
    <div>
      <Helmet>
        <title>{brand.name} - Hospedagem</title>
      </Helmet>

      <PapperBlock
        title="Gestão de Hospedagem"
        icon="ion-ios-bed"
        desc="Configure os quartos e gere a alocação inteligente dos inscritos"
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="⚙️ Configurar Quartos" />
          <Tab label="✨ Resultado Gerado" disabled={!generationResult} />
          <Tab label="✅ Alocação Salva" />
        </Tabs>

        {/* ── TAB 0: Configurar quartos ── */}
        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            {/* Lista de quartos */}
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Quartos
                <Chip size="small" label={`${totalSlots} vagas totais`} sx={{ ml: 1 }} color="primary" />
              </Typography>

              {rooms.map((room, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1.5 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={1}>
                        <Typography variant="body2" color="textSecondary" fontWeight="bold">
                          #{index + 1}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Nome do quarto"
                          value={room.name}
                          onChange={(e) => updateRoom(index, 'name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Vagas"
                          inputProps={{ min: 1, max: 50 }}
                          value={room.capacity}
                          onChange={(e) => updateRoom(index, 'capacity', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <Tooltip title="Remover quarto">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={rooms.length === 1}
                              onClick={() => removeRoom(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}

              <Button startIcon={<AddIcon />} onClick={addRoom} size="small" sx={{ mt: 1 }}>
                Adicionar Quarto
              </Button>
            </Grid>

            {/* Regras */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Regras de Alocação
              </Typography>

              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                <AlertTitle>Regras automáticas já aplicadas</AlertTitle>
                  ✅ Numeração: 1.1, 1.2, 2.1...<br />
                  ✅ Pessoas do mesmo sexo no mesmo quarto<br />
                  (O LLM irá interpretar e aplicar essas regras obrigatórias além das suas regras adicionais)
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Regras adicionais (linguagem natural)"
                placeholder={'Exemplos:\n- Líderes de célula no quarto 1\n- Menores de 14 anos separados\n- Fulana e Ciclana não podem ficar juntas'}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                helperText="Escreva em português. O LLM irá interpretar e aplicar."
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Lotes do evento (clique para inserir referencia no texto livre):
                </Typography>
                {eventBatches.length === 0 ? (
                  <Typography variant="caption" color="textSecondary">
                    Nenhum lote encontrado.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {eventBatches.map((batch) => (
                      <Chip
                        key={batch.id}
                        size="small"
                        variant="outlined"
                        label={`${batch.name} (${batch.id})`}
                        onClick={() => handleAddBatchReference(batch)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Campos disponiveis por tabela:
                </Typography>
                {availableFields.length === 0 ? (
                  <Typography variant="caption" color="textSecondary">
                    Nenhum campo encontrado nos inscritos confirmados.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                        RegistrationAttendees.attendeeData
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {availableFieldsByTable.attendeeData.map((field) => (
                          <Chip key={`attendeeData.${field}`} size="small" variant="outlined" label={`attendeeData.${field}`} />
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                        Registrations
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {availableFieldsByTable.registrations.map((field) => (
                          <Chip key={`registration.${field}`} size="small" variant="outlined" label={`registration.${field}`} />
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                        RegistrationAttendees
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {availableFieldsByTable.registrationAttendees.map((field) => (
                          <Chip key={`registrationAttendee.${field}`} size="small" variant="outlined" label={`registrationAttendee.${field}`} />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Gerando com IA...' : 'Gerar Alocação com IA'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── TAB 1: Resultado gerado (não salvo ainda) ── */}
        <TabPanel value={tab} index={1}>
          {generationResult && (
            <Grid container spacing={3}>
              {/* Avisos */}
              {generationResult.warnings?.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="warning" icon={<WarningIcon />}>
                    <AlertTitle>Avisos da IA</AlertTitle>
                    {generationResult.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                  </Alert>
                </Grid>
              )}

              {/* Raciocínio */}
              {generationResult.reasoning && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <AlertTitle>Raciocínio da IA</AlertTitle>
                    {generationResult.reasoning}
                  </Alert>
                </Grid>
              )}

              {/* Tabela por quarto */}
              <Grid item xs={12}>
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2
                }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Resultado - {editableAllocation.length || 0} inscritos alocados
                    {generationResult.totalAttendees && ` de ${generationResult.totalAttendees}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => exportAllocationToExcel(editableAllocation, 'alocacao_hospedagem_ajuste')}
                      disabled={!editableAllocation.length}
                    >
                      Exportar Excel
                    </Button>
                    <Button variant="outlined" onClick={() => setTab(0)}>
                      Ajustar Configuracao
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={savingAllocation ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      onClick={handleSaveAllocation}
                      disabled={savingAllocation}
                    >
                      {savingAllocation ? 'Salvando...' : 'Salvar Alocacao Editada'}
                    </Button>
                  </Box>
                </Box>

                {renderAllocationTable(editableAllocation || [], 'generated', true)}
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ── TAB 2: Alocação salva ── */}
        <TabPanel value={tab} index={2}>
          {savedAllocation.length === 0 ? (
            <Alert severity="info">
              Nenhuma alocação salva ainda. Configure os quartos e gere a alocação.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2
                }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Alocacao Atual - {savedAllocation.length} inscritos
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => exportAllocationToExcel(savedAllocation, 'alocacao_hospedagem_salva')}
                    >
                      Exportar Excel
                    </Button>
                    <Button variant="outlined" onClick={handleEditSavedAllocation}>
                      Editar Alocacao
                    </Button>
                    <Button variant="outlined" onClick={() => setTab(0)}>
                      Regenerar
                    </Button>
                  </Box>
                </Box>
                {renderAllocationTable(savedAllocation, 'saved')}
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}
