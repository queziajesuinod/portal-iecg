import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  Box,
  Tab,
  Tabs,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import GroupsIcon from '@mui/icons-material/Groups';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import brand from 'dan-api/dummy/brand';
import {
  getTeamsConfig,
  getTeamsAvailableFields,
  getEventBatches,
  saveTeamsConfig,
  generateTeamsAllocation,
  getTeamsAllocation,
  saveTeamsAllocation,
} from '../../../api/housingTeamsApi';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// Paleta de cores para os times
const TEAM_COLORS = [
  '#1976d2', '#d32f2f', '#388e3c', '#f57c00',
  '#7b1fa2', '#0097a7', '#c2185b', '#455a64',
  '#6d4c41', '#0288d1',
];

export default function EventTeams() {
  const { id: eventId } = useParams();
  const [tab, setTab] = useState(0);
  const [notification, setNotification] = useState('');

  // ── Configuração ──
  const [teamsCount, setTeamsCount] = useState(4);
  const [playersPerTeam, setPlayersPerTeam] = useState('');
  const [teamNames, setTeamNames] = useState(['Time A', 'Time B', 'Time C', 'Time D']);
  const [customRules, setCustomRules] = useState('');
  const [availableFields, setAvailableFields] = useState([]);
  const [availableFieldsByTable, setAvailableFieldsByTable] = useState({
    attendeeData: [],
    registrations: [],
    registrationAttendees: [],
  });
  const [eventBatches, setEventBatches] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Geração ──
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  // ── Salvo ──
  const [savedAllocation, setSavedAllocation] = useState([]);
  const [savingAllocation, setSavingAllocation] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [eventId]);

  async function carregarDados() {
    try {
      const [config, allocation, availableFieldsResponse, batchesResponse] = await Promise.all([
        getTeamsConfig(eventId).catch(() => null),
        getTeamsAllocation(eventId).catch(() => []),
        getTeamsAvailableFields(eventId).catch(() => ({ fields: [] })),
        getEventBatches(eventId).catch(() => []),
      ]);
      if (config) {
        setTeamsCount(config.teamsCount || 4);
        setPlayersPerTeam(config.playersPerTeam || '');
        setTeamNames(config.teamNames || generateDefaultNames(config.teamsCount || 4));
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

  function handleAddBatchReference(batch) {
    if (!batch) return;
    const ruleText = `Considerar lote "${batch.name}" (eventBatch.id=${batch.id}) nas regras de divisao.`;
    setCustomRules((prev) => {
      const normalized = String(prev || '').trim();
      return normalized ? `${normalized}\n- ${ruleText}` : `- ${ruleText}`;
    });
  }

  function generateDefaultNames(count) {
    return Array.from({ length: count }, (_, i) => `Time ${String.fromCharCode(65 + i)}`);
  }

  function handleTeamsCountChange(value) {
    const n = Math.max(2, Math.min(20, parseInt(value, 10) || 2));
    setTeamsCount(n);
    setTeamNames((prev) => {
      const updated = [...prev];
      while (updated.length < n) updated.push(`Time ${String.fromCharCode(65 + updated.length)}`);
      return updated.slice(0, n);
    });
  }

  function updateTeamName(index, value) {
    setTeamNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  async function handleSaveConfig() {
    try {
      setSavingConfig(true);
      await saveTeamsConfig(eventId, {
        teamsCount,
        playersPerTeam: playersPerTeam || null,
        teamNames,
        customRules,
      });
      setNotification('Configuração de times salva!');
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setGenerationResult(null);
      await saveTeamsConfig(eventId, { teamsCount, playersPerTeam: playersPerTeam || null, teamNames, customRules });
      const result = await generateTeamsAllocation(eventId, customRules);
      setGenerationResult(result);
      setTab(1);
    } catch (err) {
      setNotification(err.message || 'Erro ao gerar times');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAllocation() {
    if (!generationResult) return;
    try {
      setSavingAllocation(true);
      await saveTeamsAllocation(eventId, generationResult.allocation, generationResult.reasoning);
      setNotification('Divisão de times salva com sucesso!');
      await carregarDados();
      setGenerationResult(null);
      setTab(2);
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar times');
    } finally {
      setSavingAllocation(false);
    }
  }

  // Agrupa allocation por time
  function groupByTeam(allocation) {
    const groups = {};
    allocation.forEach((item) => {
      const key = item.teamId;
      if (!groups[key]) groups[key] = { teamId: item.teamId, teamName: item.teamName, members: [] };
      groups[key].members.push(item);
    });
    return Object.values(groups).sort((a, b) => a.teamId.localeCompare(b.teamId));
  }

  function getTeamColor(index) {
    return TEAM_COLORS[index % TEAM_COLORS.length];
  }

  function getNomeMembro(item) {
    return item.nome
      || item.attendee?.attendeeData?.nome_completo
      || item.attendee?.attendeeData?.nome
      || '-';
  }

  function getSexoMembro(item) {
    return item.attendee?.attendeeData?.sexo || item.sexo || '';
  }

  const renderTeamsCards = (allocation, summaries = []) => {
    const groups = groupByTeam(allocation);
    if (!groups.length) return <Typography color="textSecondary">Nenhuma divisão disponível.</Typography>;

    const summaryMap = {};
    summaries.forEach((s) => { summaryMap[s.teamId] = s; });

    return (
      <Grid container spacing={2}>
        {groups.map((team, index) => {
          const color = getTeamColor(index);
          const summary = summaryMap[team.teamId];
          const masc = team.members.filter((m) => {
            const s = getSexoMembro(m).toLowerCase();
            return ['m', 'masculino'].includes(s);
          }).length;
          const fem = team.members.length - masc;

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={team.teamId}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: color }}>
                      <GroupsIcon />
                    </Avatar>
                  }
                  title={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {team.teamName}
                    </Typography>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip size="small" label={`${team.members.length} pessoas`} />
                      {masc > 0 && <Chip size="small" label={`♂ ${masc}`} color="primary" variant="outlined" />}
                      {fem > 0 && <Chip size="small" label={`♀ ${fem}`} color="secondary" variant="outlined" />}
                    </Box>
                  }
                  sx={{ pb: 0, borderBottom: `3px solid ${color}` }}
                />
                <CardContent sx={{ pt: 1 }}>
                  {/* Barra de equilíbrio M/F */}
                  {team.members.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="textSecondary">Equilíbrio M/F</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(masc / team.members.length) * 100}
                        sx={{ height: 6, borderRadius: 3 }}
                        color="primary"
                      />
                    </Box>
                  )}

                  {summary?.idadeMedia && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      Idade média: {parseFloat(summary.idadeMedia).toFixed(1)} anos
                    </Typography>
                  )}

                  <List dense disablePadding>
                    {team.members.map((member) => (
                      <ListItem key={member.attendeeId || member.id} disableGutters sx={{ py: 0.25 }}>
                        <ListItemAvatar sx={{ minWidth: 32 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: color, fontSize: 11 }}>
                            <PersonIcon sx={{ fontSize: 14 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={getNomeMembro(member)}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <div>
      <Helmet>
        <title>{brand.name} - Times</title>
      </Helmet>

      <PapperBlock
        title="Divisão de Times"
        icon="ion-ios-people"
        desc="Configure e gere a divisão equilibrada de times com IA"
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="⚙️ Configurar Times" />
          <Tab label="✨ Resultado Gerado" disabled={!generationResult} />
          <Tab label="✅ Times Salvos" />
        </Tabs>

        {/* ── TAB 0: Configuração ── */}
        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Estrutura dos Times
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Quantidade de Times"
                    inputProps={{ min: 2, max: 20 }}
                    value={teamsCount}
                    onChange={(e) => handleTeamsCountChange(e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Jogadores por Time (opcional)"
                    inputProps={{ min: 1 }}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(e.target.value)}
                    helperText="Deixe vazio para automático"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Nomes dos Times
              </Typography>
              <Grid container spacing={1}>
                {teamNames.map((name, index) => (
                  <Grid item xs={6} key={index}>
                    <TextField
                      fullWidth
                      size="small"
                      label={`Time ${index + 1}`}
                      value={name}
                      onChange={(e) => updateTeamName(index, e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: getTeamColor(index),
                              mr: 1,
                              flexShrink: 0,
                            }}
                          />
                        ),
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Regras de Divisão
              </Typography>

              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                <AlertTitle>Regras automáticas já aplicadas</AlertTitle>
                ✅ Equilíbrio de sexo entre times<br />
                ✅ Equilíbrio de faixa etária<br />
                ✅ Pessoas da mesma compra no mesmo time<br />
                ✅ Times com tamanhos iguais
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={7}
                label="Regras adicionais (linguagem natural)"
                placeholder={`Exemplos:\n- Líderes distribuídos 1 por time\n- Crianças abaixo de 12 anos no Time A\n- Fulano e Ciclano não podem ser do mesmo time\n- Separar por cidade de origem`}
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                helperText="O LLM irá interpretar e aplicar respeitando os campos disponíveis nos inscritos."
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
                  {generating ? 'Dividindo com IA...' : 'Gerar Times com IA'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── TAB 1: Resultado gerado ── */}
        <TabPanel value={tab} index={1}>
          {generationResult && (
            <Grid container spacing={3}>
              {generationResult.warnings?.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="warning" icon={<WarningIcon />}>
                    <AlertTitle>Avisos da IA</AlertTitle>
                    {generationResult.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                  </Alert>
                </Grid>
              )}

              {generationResult.reasoning && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <AlertTitle>Raciocínio da IA</AlertTitle>
                    {generationResult.reasoning}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {generationResult.allocation?.length || 0} inscritos distribuídos em {teamsCount} times
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

                {renderTeamsCards(
                  generationResult.allocation || [],
                  generationResult.teamsSummary || []
                )}
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* ── TAB 2: Times salvos ── */}
        <TabPanel value={tab} index={2}>
          {savedAllocation.length === 0 ? (
            <Alert severity="info">
              Nenhuma divisão salva ainda. Configure os times e gere a divisão.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {savedAllocation.length} inscritos nos times
                  </Typography>
                  <Button variant="outlined" onClick={() => setTab(0)}>
                    Regenerar
                  </Button>
                </Box>
                {renderTeamsCards(savedAllocation)}
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}
