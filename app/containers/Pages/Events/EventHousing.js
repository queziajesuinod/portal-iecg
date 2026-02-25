import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import BedIcon from '@mui/icons-material/KingBed';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import brand from 'dan-api/dummy/brand';
import {
  getHousingConfig,
  saveHousingConfig,
  generateHousingAllocation,
  getHousingAllocation,
  saveHousingAllocation,
} from '../../../api/housingTeamsApi';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function EventHousing() {
  const { id: eventId } = useParams();
  const [tab, setTab] = useState(0);
  const [notification, setNotification] = useState('');

  // ── Configuração de quartos ──
  const [rooms, setRooms] = useState([{ id: '1', name: 'Quarto 1', capacity: 4 }]);
  const [customRules, setCustomRules] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Geração LLM ──
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null); // alocação temporária não salva

  // ── Alocação salva ──
  const [savedAllocation, setSavedAllocation] = useState([]);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [loadingAllocation, setLoadingAllocation] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [eventId]);

  async function carregarDados() {
    try {
      const [config, allocation] = await Promise.all([
        getHousingConfig(eventId).catch(() => null),
        getHousingAllocation(eventId).catch(() => []),
      ]);

      if (config) {
        setRooms(config.rooms || []);
        setCustomRules(config.customRules || '');
      }
      setSavedAllocation(allocation || []);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Gerenciar quartos ──
  function addRoom() {
    const nextId = String(rooms.length + 1);
    setRooms((prev) => [...prev, { id: nextId, name: `Quarto ${nextId}`, capacity: 4 }]);
  }

  function updateRoom(index, field, value) {
    setRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: field === 'capacity' ? parseInt(value, 10) || 1 : value } : r))
    );
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
      setTab(1); // vai para aba de resultado
    } catch (err) {
      setNotification(err.message || 'Erro ao gerar alocação');
    } finally {
      setGenerating(false);
    }
  }

  // ── Salvar alocação final ──
  async function handleSaveAllocation() {
    if (!generationResult) return;
    try {
      setSavingAllocation(true);
      await saveHousingAllocation(eventId, generationResult.allocation, generationResult.reasoning);
      setNotification('Alocação de hospedagem salva com sucesso!');
      await carregarDados();
      setGenerationResult(null);
      setTab(2); // vai para aba de visualização salva
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar alocação');
    } finally {
      setSavingAllocation(false);
    }
  }

  // ── Agrupamento para exibição ──
  function groupByRoom(allocation) {
    const groups = {};
    allocation.forEach((item) => {
      const key = item.roomId || item.roomName;
      if (!groups[key]) groups[key] = { roomName: item.roomName || item.roomId, items: [] };
      groups[key].items.push(item);
    });
    // Ordena camas por slotLabel
    Object.values(groups).forEach((g) => {
      g.items.sort((a, b) => a.slotLabel?.localeCompare(b.slotLabel));
    });
    return Object.values(groups);
  }

  const totalSlots = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);

  const renderAllocationTable = (allocation, source = 'generated') => {
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
              {source === 'saved' && <TableCell>Sexo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {group.items.map((item) => {
              const nome = item.nome
                || item.attendee?.attendeeData?.nome_completo
                || item.attendee?.attendeeData?.nome
                || '-';
              const sexo = item.attendee?.attendeeData?.sexo || '';
              return (
                <TableRow key={item.attendeeId || item.id}>
                  <TableCell>
                    <Chip size="small" label={item.slotLabel} variant="outlined" />
                  </TableCell>
                  <TableCell>{nome}</TableCell>
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
                ✅ Separação por sexo<br />
                ✅ Pessoas da mesma compra no mesmo quarto<br />
                ✅ Ordenação alfabética<br />
                ✅ Numeração: 1.1, 1.2, 2.1...
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Regras adicionais (linguagem natural)"
                placeholder={`Exemplos:\n- Líderes de célula no quarto 1\n- Menores de 14 anos separados\n- Fulana e Ciclana não podem ficar juntas`}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                helperText="Escreva em português. O LLM irá interpretar e aplicar."
              />
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Resultado — {generationResult.allocation?.length || 0} inscritos alocados
                    {generationResult.totalAttendees && ` de ${generationResult.totalAttendees}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={() => setTab(0)}>
                      Ajustar Configuração
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={savingAllocation ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      onClick={handleSaveAllocation}
                      disabled={savingAllocation}
                    >
                      {savingAllocation ? 'Salvando...' : 'Confirmar e Salvar'}
                    </Button>
                  </Box>
                </Box>

                {renderAllocationTable(generationResult.allocation || [], 'generated')}
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Alocação Atual — {savedAllocation.length} inscritos
                  </Typography>
                  <Button variant="outlined" onClick={() => setTab(0)}>
                    Regenerar
                  </Button>
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
