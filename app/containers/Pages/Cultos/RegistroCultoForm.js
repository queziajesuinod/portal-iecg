import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  Autocomplete, Box, Button, Chip, CircularProgress, Collapse,
  FormControl, FormControlLabel, FormLabel, Grid, InputLabel,
  MenuItem, Radio, RadioGroup, Select, TextField, Typography,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import {
  listarMinisteriosPorCampus, listarTiposEvento,
  criarRegistro, buscarRegistro, atualizarRegistro,
  listarMinistros, criarMinistro,
} from '../../../api/cultosApi';
import { listarVoluntariados } from '../../../api/voluntariadoApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const filter = createFilterOptions();

const hoje = () => new Date().toISOString().slice(0, 10);

const FORM_INICIAL = {
  data: hoje(),
  horario: '',
  campusId: '',
  ministerioId: '',
  tipoEventoId: '',
  tituloMensagem: '',
  eSerie: false,
  nomeSerie: '',
  qtdHomens: 0,
  qtdMulheres: 0,
  qtdCriancas: 0,
  qtdBebes: 0,
  qtdVoluntarios: 0,
  qtdOnline: 0,
  teveApelo: false,
  qtdApelo: 0,
  comentarios: '',
};

const RegistroCultoForm = () => {
  const history = useHistory();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(FORM_INICIAL);
  const [campi, setCampi] = useState([]);
  const [ministerios, setMinisters] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [ministerioSelecionado, setMinisterioSelecionado] = useState(null);
  const [campusSelecionado, setCampusSelecionado] = useState(null);

  // Ministros (pregadores)
  const [ministrosOptions, setMinistrosOptions] = useState([]);
  const [ministrosSelecionados, setMinistrosSelecionados] = useState([]);
  const [loadingMinistro, setLoadingMinistro] = useState(false);

  const [voluntariosAprovados, setVoluntariosAprovados] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [notification, setNotification] = useState('');
  const [notificationType, setNotificationType] = useState('error');

  const notificar = (msg, tipo = 'error') => {
    setNotificationType(tipo);
    setNotification(msg);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const init = async () => {
      try {
        const [campiRes, tipos, ministros] = await Promise.all([
          fetch(`${API_URL}/start/campus`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          listarTiposEvento(true),
          listarMinistros(true),
        ]);
        setCampi(Array.isArray(campiRes) ? campiRes : []);
        setTiposEvento(tipos);
        setMinistrosOptions(ministros);
      } catch {
        notificar('Erro ao carregar dados iniciais');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isEditing) { setLoadingInit(false); return; }
    buscarRegistro(id)
      .then(async (registro) => {
        setForm({
          data: registro.data || hoje(),
          horario: registro.horario || '',
          campusId: registro.campusId || '',
          ministerioId: registro.ministerioId || '',
          tipoEventoId: registro.tipoEventoId || '',
          tituloMensagem: registro.tituloMensagem || '',
          eSerie: registro.eSerie || false,
          nomeSerie: registro.nomeSerie || '',
          qtdHomens: registro.qtdHomens ?? 0,
          qtdMulheres: registro.qtdMulheres ?? 0,
          qtdCriancas: registro.qtdCriancas ?? 0,
          qtdBebes: registro.qtdBebes ?? 0,
          qtdVoluntarios: registro.qtdVoluntarios ?? 0,
          qtdOnline: registro.qtdOnline ?? 0,
          teveApelo: registro.teveApelo || false,
          qtdApelo: registro.qtdApelo ?? 0,
          comentarios: registro.comentarios || '',
        });
        if (registro.ministros) {
          setMinistrosSelecionados(registro.ministros);
        }
        if (registro.campusId) {
          const mins = await listarMinisteriosPorCampus(registro.campusId);
          setMinisters(mins);
          setCampusSelecionado(registro.campus || null);
          const min = mins.find((m) => m.id === registro.ministerioId) || null;
          setMinisterioSelecionado(min);
        }
      })
      .catch(() => notificar('Erro ao carregar registro'))
      .finally(() => setLoadingInit(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCampusChange = async (e) => {
    const campusId = e.target.value;
    const campus = campi.find((c) => c.id === campusId) || null;
    setCampusSelecionado(campus);
    setForm((prev) => ({ ...prev, campusId, ministerioId: '', qtdOnline: 0 }));
    setMinisterioSelecionado(null);
    if (!campusId) { setMinisters([]); return; }
    try {
      const mins = await listarMinisteriosPorCampus(campusId);
      setMinisters(mins);
    } catch {
      notificar('Erro ao carregar ministérios do campus');
      setMinisters([]);
    }
  };

  const handleMinisterioChange = (e) => {
    const ministerioId = e.target.value;
    const min = ministerios.find((m) => m.id === ministerioId) || null;
    setMinisterioSelecionado(min);
    setForm((prev) => ({
      ...prev,
      ministerioId,
      teveApelo: min ? min.apeloDefault : false,
      qtdApelo: min && !min.apeloDefault ? 0 : prev.qtdApelo,
    }));
  };

  const handleRadio = (name) => (e) => {
    const val = e.target.value === 'true';
    setForm((prev) => ({
      ...prev,
      [name]: val,
      ...(name === 'teveApelo' && !val ? { qtdApelo: 0 } : {}),
      ...(name === 'eSerie' && !val ? { nomeSerie: '' } : {}),
    }));
  };

  // Cria um novo ministro na API e o adiciona à seleção
  const handleMinistrosChange = async (event, newValue) => {
    const novoItem = newValue.find((v) => v._novo);
    if (!novoItem) {
      setMinistrosSelecionados(newValue);
      return;
    }

    setLoadingMinistro(true);
    try {
      const criado = await criarMinistro({ nome: novoItem.nome.trim(), ativo: true });
      setMinistrosOptions((prev) => [...prev, criado]);
      setMinistrosSelecionados([
        ...newValue.filter((v) => !v._novo),
        criado,
      ]);
    } catch (err) {
      notificar(err.message || 'Erro ao criar ministro');
      setMinistrosSelecionados(newValue.filter((v) => !v._novo));
    } finally {
      setLoadingMinistro(false);
    }
  };

  // Busca contagem de voluntários aprovados para o campus + ministério selecionados
  useEffect(() => {
    if (!form.campusId || !form.ministerioId) { setVoluntariosAprovados(null); return; }
    listarVoluntariados({ campusId: form.campusId, ministerioId: form.ministerioId, status: 'APROVADO' })
      .then((data) => setVoluntariosAprovados(Array.isArray(data) ? data.length : null))
      .catch(() => setVoluntariosAprovados(null));
  }, [form.campusId, form.ministerioId]);

  const exibeCriancas = ministerioSelecionado ? ministerioSelecionado.exibeCriancas : true;
  const exibeBebes = ministerioSelecionado ? ministerioSelecionado.exibeBebes : true;
  const exibeOnline = (campusSelecionado?.transmiteOnline === true) && (ministerioSelecionado?.exibeOnline !== false);

  const montarPayload = () => {
    const payload = { ...form };
    if (!exibeCriancas) payload.qtdCriancas = null;
    if (!exibeBebes) payload.qtdBebes = null;
    if (!exibeOnline) payload.qtdOnline = null;
    if (!form.teveApelo) payload.qtdApelo = null;
    if (!form.eSerie) payload.nomeSerie = null;
    ['qtdHomens', 'qtdMulheres', 'qtdCriancas', 'qtdBebes', 'qtdVoluntarios', 'qtdOnline', 'qtdApelo']
      .forEach((k) => { if (payload[k] != null) payload[k] = parseInt(payload[k], 10) || 0; });
    payload.ministroIds = ministrosSelecionados.map((m) => m.id);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (ministrosSelecionados.length === 0) {
      notificar('Selecione ao menos um ministro');
      return;
    }
    setLoading(true);
    try {
      const payload = montarPayload();
      if (isEditing) {
        await atualizarRegistro(id, payload);
        notificar('Registro atualizado com sucesso!', 'success');
      } else {
        await criarRegistro(payload);
        notificar('Registro salvo com sucesso!', 'success');
        setTimeout(() => history.push('/app/cultos/registros'), 1200);
      }
    } catch (err) {
      notificar(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInit) {
    return (
      <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
    );
  }

  return (
    <div>
      <Helmet><title>{isEditing ? 'Editar Registro de Culto' : 'Novo Registro de Culto'}</title></Helmet>
      <PapperBlock
        title={isEditing ? 'Editar Registro de Culto' : 'Novo Registro de Culto'}
        icon="ion-ios-create-outline"
        desc="Preencha os dados do culto"
      >
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>

            {/* 1. Data */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth required type="date" label="Data" name="data"
                value={form.data} onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* 2. Horário */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth required type="time" label="Horário" name="horario"
                value={form.horario} onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* 3. Campus */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Campus</InputLabel>
                <Select name="campusId" value={form.campusId} label="Campus" onChange={handleCampusChange}>
                  {campi.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 4. Ministério */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required disabled={!form.campusId}>
                <InputLabel>Ministério</InputLabel>
                <Select name="ministerioId" value={form.ministerioId} label="Ministério" onChange={handleMinisterioChange}>
                  {ministerios.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 5. Tipo de Evento */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Evento</InputLabel>
                <Select name="tipoEventoId" value={form.tipoEventoId} label="Tipo de Evento" onChange={handleChange}>
                  {tiposEvento.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 6. Quem ministrou — multi-select com criação */}
            <Grid item xs={12} md={8}>
              <Autocomplete
                multiple
                options={ministrosOptions}
                value={ministrosSelecionados}
                loading={loadingMinistro}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.nome)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterSelectedOptions
                filterOptions={(options, params) => {
                  const filtered = filter(options, params);
                  const { inputValue } = params;
                  const jaExiste = options.some(
                    (o) => o.nome.toLowerCase() === inputValue.trim().toLowerCase()
                  );
                  if (inputValue.trim() !== '' && !jaExiste) {
                    filtered.push({ id: null, nome: inputValue.trim(), _novo: true });
                  }
                  return filtered;
                }}
                onChange={handleMinistrosChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.id || option.nome} label={option.nome} size="small" {...getTagProps({ index })} />
                  ))
                }
                renderOption={(props, option) => (
                  <li {...props} key={option.id || `_novo_${option.nome}`}>
                    {option._novo ? `+ Criar "${option.nome}"` : option.nome}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Quem ministrou"
                    required={ministrosSelecionados.length === 0}
                    helperText="Selecione um ou mais ministros. Digite para buscar ou criar novo."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingMinistro ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* 7. Título da mensagem */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth required label="Título da mensagem" name="tituloMensagem"
                value={form.tituloMensagem} onChange={handleChange}
              />
            </Grid>

            {/* 8. Foi série? */}
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <FormLabel component="legend">O culto foi de uma série?</FormLabel>
                <RadioGroup row value={String(form.eSerie)} onChange={handleRadio('eSerie')}>
                  <FormControlLabel value="false" control={<Radio />} label="Não" />
                  <FormControlLabel value="true" control={<Radio />} label="Sim" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* 9. Nome da série (condicional) */}
            <Grid item xs={12} sm={6}>
              <Collapse in={form.eSerie} unmountOnExit>
                <TextField
                  fullWidth required={form.eSerie} label="Nome da série" name="nomeSerie"
                  value={form.nomeSerie} onChange={handleChange}
                />
              </Collapse>
            </Grid>

            {/* Divider visual */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="textSecondary" sx={{ mt: 1, mb: 0, fontWeight: 600 }}>
                Presença
              </Typography>
            </Grid>

            {/* 10. Homens */}
            <Grid item xs={6} sm={4} md={3}>
              <TextField
                fullWidth required type="number" label="Homens" name="qtdHomens"
                value={form.qtdHomens} onChange={handleChange} inputProps={{ min: 0 }}
              />
            </Grid>

            {/* 11. Mulheres */}
            <Grid item xs={6} sm={4} md={3}>
              <TextField
                fullWidth required type="number" label="Mulheres" name="qtdMulheres"
                value={form.qtdMulheres} onChange={handleChange} inputProps={{ min: 0 }}
              />
            </Grid>

            {/* 12. Crianças (condicional) */}
            {exibeCriancas && (
              <Grid item xs={6} sm={4} md={3}>
                <TextField
                  fullWidth required type="number" label="Crianças" name="qtdCriancas"
                  value={form.qtdCriancas} onChange={handleChange} inputProps={{ min: 0 }}
                />
              </Grid>
            )}

            {/* 13. Bebês (condicional) */}
            {exibeBebes && (
              <Grid item xs={6} sm={4} md={3}>
                <TextField
                  fullWidth required type="number" label="Bebês" name="qtdBebes"
                  value={form.qtdBebes} onChange={handleChange} inputProps={{ min: 0 }}
                />
              </Grid>
            )}

            {/* 14. Voluntários */}
            <Grid item xs={6} sm={4} md={3}>
              <TextField
                fullWidth required type="number" label="Voluntários" name="qtdVoluntarios"
                value={form.qtdVoluntarios} onChange={handleChange} inputProps={{ min: 0 }}
                helperText={voluntariosAprovados !== null ? `${voluntariosAprovados} aprovado(s) cadastrado(s)` : ''}
              />
            </Grid>

            {/* 15. Online (condicional) */}
            {exibeOnline && (
              <Grid item xs={6} sm={4} md={3}>
                <TextField
                  fullWidth required type="number" label="Online" name="qtdOnline"
                  value={form.qtdOnline} onChange={handleChange} inputProps={{ min: 0 }}
                />
              </Grid>
            )}

            {/* 16. Teve apelo? */}
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Teve apelo?</FormLabel>
                <RadioGroup row value={String(form.teveApelo)} onChange={handleRadio('teveApelo')}>
                  <FormControlLabel value="false" control={<Radio />} label="Não" />
                  <FormControlLabel value="true" control={<Radio />} label="Sim" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* 17. Qtd apelo (condicional) */}
            <Grid item xs={6} sm={4} md={3}>
              <Collapse in={form.teveApelo} unmountOnExit>
                <TextField
                  fullWidth required={form.teveApelo} type="number"
                  label="Pessoas no apelo" name="qtdApelo"
                  value={form.qtdApelo} onChange={handleChange} inputProps={{ min: 0 }}
                />
              </Collapse>
            </Grid>

            {/* 18. Comentários */}
            <Grid item xs={12}>
              <TextField
                fullWidth multiline minRows={3} label="Comentários adicionais" name="comentarios"
                value={form.comentarios} onChange={handleChange}
              />
            </Grid>

            {/* Ações */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} mt={1}>
                <Button variant="outlined" onClick={() => history.push('/app/cultos/registros')}>
                  Cancelar
                </Button>
                <Button variant="contained" type="submit" disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : (isEditing ? 'Salvar alterações' : 'Registrar culto')}
                </Button>
              </Box>
            </Grid>

          </Grid>
        </form>

        {notification && (
          <Notification
            message={notification}
            variant={notificationType === 'success' ? 'success' : 'error'}
            onClose={() => setNotification('')}
          />
        )}
      </PapperBlock>
    </div>
  );
};

export default RegistroCultoForm;
