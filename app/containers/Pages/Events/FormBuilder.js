import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Backdrop,
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownIcon from '@mui/icons-material/ArrowDownward';
import SaveIcon from '@mui/icons-material/Save';
import BackIcon from '@mui/icons-material/ArrowBack';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useHistory, useParams } from 'react-router-dom';
import {
  listarCamposPorEvento,
  criarCampo,
  criarCamposEmLote,
  atualizarCampo,
  deletarCampo,
  buscarEvento
} from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

const TIPOS_CAMPO = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'select', label: 'Seleção (dropdown)' },
  { value: 'radio', label: 'Múltipla Escolha (radio)' },
  { value: 'checkbox', label: 'Caixas de Seleção' },
  { value: 'file', label: 'Arquivo' }
];

function FormBuilder() {
  const history = useHistory();
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [campoAtual, setCampoAtual] = useState(null);
  const [formCampo, setFormCampo] = useState({
    fieldType: 'text',
    fieldLabel: '',
    fieldName: '',
    placeholder: '',
    isRequired: false,
    section: 'attendee',
    options: []
  });
  const [opcaoTemp, setOpcaoTemp] = useState('');

  useEffect(() => {
    carregarDados();
  }, [id]);

  const normalizeOrderBySection = (items) => {
    const bySection = items.reduce((acc, item) => {
      const key = item.section || 'attendee';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    const normalized = [];
    Object.keys(bySection).forEach((sectionKey) => {
      const list = bySection[sectionKey];
      list
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((item, idx) => {
          normalized.push({ ...item, order: idx });
        });
    });
    return normalized;
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [eventoRes, camposRes] = await Promise.all([
        buscarEvento(id),
        listarCamposPorEvento(id)
      ]);
      setEvento(eventoRes);
      setCampos(normalizeOrderBySection(camposRes || []));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialog = (campo = null) => {
    if (campo) {
      setCampoAtual(campo);
      setFormCampo({
        fieldType: campo.fieldType,
        fieldLabel: campo.fieldLabel,
        fieldName: campo.fieldName,
        placeholder: campo.placeholder || '',
        isRequired: campo.isRequired,
        section: campo.section,
        options: campo.options || []
      });
    } else {
      setCampoAtual(null);
      setFormCampo({
        fieldType: 'text',
        fieldLabel: '',
        fieldName: '',
        placeholder: '',
        isRequired: false,
        section: 'attendee',
        options: []
      });
    }
    setOpcaoTemp('');
    setDialogAberto(true);
  };

  const handleFecharDialog = () => {
    setDialogAberto(false);
    setCampoAtual(null);
    setOpcaoTemp('');
  };

  const handleChangeCampo = (e) => {
    const { name, value, checked, type } = e.target;
    setFormCampo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-gerar fieldName a partir do fieldLabel
    if (name === 'fieldLabel' && !campoAtual) {
      const fieldName = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFormCampo(prev => ({ ...prev, fieldName }));
    }
  };

  const handleAdicionarOpcao = () => {
    if (opcaoTemp.trim()) {
      setFormCampo(prev => ({
        ...prev,
        options: [...prev.options, opcaoTemp.trim()]
      }));
      setOpcaoTemp('');
    }
  };

  const handleRemoverOpcao = (index) => {
    setFormCampo(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleSalvarCampo = () => {
    if (!formCampo.fieldLabel || !formCampo.fieldName) {
      setNotification('Label e nome do campo são obrigatórios');
      return;
    }

    const tiposComOpcoes = ['select', 'radio', 'checkbox'];
    if (tiposComOpcoes.includes(formCampo.fieldType) && formCampo.options.length === 0) {
      setNotification('Adicione pelo menos uma opção para este tipo de campo');
      return;
    }

    if (campoAtual) {
      // Editar campo existente
      setCampos(prev => prev.map(c => 
        c.id === campoAtual.id 
          ? { ...c, ...formCampo }
          : c
      ));
    } else {
      // Adicionar novo campo
      const novoCampo = {
        id: `temp_${Date.now()}`,
        ...formCampo,
        order: campos.length
      };
      setCampos(prev => [...prev, novoCampo]);
    }

    handleFecharDialog();
  };

  const handleDeletarCampo = async (campo) => {
    if (window.confirm(`Tem certeza que deseja deletar o campo "${campo.fieldLabel}"?`)) {
      if (campo.id.toString().startsWith('temp_')) {
        // Campo temporário (não salvo ainda)
        setCampos(prev => prev.filter(c => c.id !== campo.id));
      } else {
        // Campo já salvo no banco
        try {
          await deletarCampo(campo.id);
          setCampos(prev => prev.filter(c => c.id !== campo.id));
          setNotification('Campo deletado com sucesso!');
        } catch (error) {
          console.error('Erro ao deletar campo:', error);
          setNotification('Erro ao deletar campo');
        }
      }
    }
  };

  const reorderSection = useCallback((section, fromIndex, toIndex) => {
    setCampos((prev) => {
      const sectionItems = prev
        .filter((c) => c.section === section)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (fromIndex < 0 || fromIndex >= sectionItems.length) return prev;
      if (toIndex < 0 || toIndex >= sectionItems.length) return prev;
      const updated = [...sectionItems];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const updatedIds = new Set(updated.map((c) => c.id));
      const next = prev.map((item) => {
        if (!updatedIds.has(item.id)) return item;
        const newIndex = updated.findIndex((u) => u.id === item.id);
        return { ...item, order: newIndex };
      });
      return next;
    });
  }, []);

  const handleMoverCampo = useCallback((section, index, direcao) => {
    const novoIndex = direcao === 'up' ? index - 1 : index + 1;
    reorderSection(section, index, novoIndex);
  }, [reorderSection]);

  const handleDragEnd = useCallback((result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId !== source.droppableId) return;
    const section = destination.droppableId;
    reorderSection(section, source.index, destination.index);
  }, [reorderSection]);

  const handleSalvarFormulario = async () => {
    if (campos.length === 0) {
      setNotification('Adicione pelo menos um campo ao formulário');
      return;
    }

    try {
      setLoading(true);

      const camposExistentes = campos.filter(c => !c.id.toString().startsWith('temp_'));
      // Separar campos novos (temp_) dos existentes
      const camposNovos = campos.filter(c => c.id.toString().startsWith('temp_'));
      
      if (camposNovos.length > 0) {
        const camposParaSalvar = camposNovos.map((campo, index) => ({
          eventId: id,
          fieldType: campo.fieldType,
          fieldLabel: campo.fieldLabel,
          fieldName: campo.fieldName,
          placeholder: campo.placeholder,
          isRequired: campo.isRequired,
          section: campo.section,
          options: campo.options,
          order: typeof campo.order === 'number' ? campo.order : index
        }));

        const resultados = await Promise.allSettled(
          camposParaSalvar.map((payload) => criarCampo(payload))
        );
        const falhas = resultados.filter((r) => r.status === 'rejected');
        if (falhas.length) {
          const mensagens = falhas
            .map((f) => f.reason?.message)
            .filter(Boolean);
          setNotification(
            mensagens.length
              ? `Alguns campos não foram criados: ${mensagens.join(' | ')}`
              : 'Alguns campos não foram criados.'
          );
        }
      }

      if (camposExistentes.length > 0) {
        await Promise.all(
          camposExistentes.map((campo) => atualizarCampo(campo.id, {
            fieldType: campo.fieldType,
            fieldLabel: campo.fieldLabel,
            fieldName: campo.fieldName,
            placeholder: campo.placeholder,
            isRequired: campo.isRequired,
            section: campo.section,
            options: campo.options,
            order: typeof campo.order === 'number' ? campo.order : 0
          }))
        );
      }

      setNotification('Formulário salvo com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      setNotification(error.message || 'Erro ao salvar formulário');
    } finally {
      setLoading(false);
    }
  };

  const camposComprador = useMemo(
    () => campos.filter(c => c.section === 'buyer').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [campos]
  );
  const camposInscritos = useMemo(
    () => campos.filter(c => c.section === 'attendee').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [campos]
  );

  const FieldListItem = React.memo(({ campo, index, listLength, section }) => (
    <Draggable draggableId={String(campo.id)} index={index}>
      {(provided) => (
        <ListItem
          ref={provided.innerRef}
          {...provided.draggableProps}
          divider
        >
          <span {...provided.dragHandleProps} style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
            <DragIndicatorIcon fontSize="small" />
          </span>
      <ListItemText
        primary={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography variant="subtitle2">{campo.fieldLabel}</Typography>
            {campo.isRequired && <Chip label="Obrigatório" size="small" color="secondary" />}
          </div>
        }
        secondary={`Tipo: ${TIPOS_CAMPO.find(t => t.value === campo.fieldType)?.label} | Nome: ${campo.fieldName}`}
      />
      <ListItemSecondaryAction>
        <IconButton
          size="small"
          disabled={index === 0}
          onClick={() => handleMoverCampo(section, index, 'up')}
        >
          <ArrowUpIcon />
        </IconButton>
        <IconButton
          size="small"
          disabled={index === listLength - 1}
          onClick={() => handleMoverCampo(section, index, 'down')}
        >
          <ArrowDownIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleAbrirDialog(campo)}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDeletarCampo(campo)}
        >
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
        </ListItem>
      )}
    </Draggable>
  ));

  const skeletonListItems = Array.from({ length: 3 }).map((_, idx) => (
    <ListItem key={`field-skeleton-${idx}`}>
      <ListItemContentSkeleton />
    </ListItem>
  ));

  function ListItemContentSkeleton() {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="60%" />
        <Skeleton width="40%" />
      </div>
    );
  }

  const headerSkeleton = loading && !evento;

  const title = brand.name + ' - Configurar Formulário';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <Backdrop open={loading} style={{ zIndex: 1300, color: '#fff' }}>
        <img src="/images/spinner.gif" alt="Carregando" style={{ width: 64, height: 64 }} />
      </Backdrop>

      <PapperBlock
        title={`Formulário de Inscrição - ${evento?.title}`}
        icon="ion-ios-list-outline"
        desc="Configure os campos que serão preenchidos na inscrição"
      >
        <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {/* Campos do Comprador */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Typography variant="h6">
                    Dados do Comprador
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={headerSkeleton}
                    onClick={() => {
                      setFormCampo(prev => ({ ...prev, section: 'buyer' }));
                      handleAbrirDialog();
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Preenchido 1 vez por inscrição
                </Typography>
                <Divider style={{ margin: '16px 0' }} />
                {headerSkeleton ? (
                  <List>
                    {skeletonListItems}
                  </List>
                ) : camposComprador.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum campo adicionado
                  </Typography>
                ) : (
                  <Droppable droppableId="buyer">
                    {(provided) => (
                      <List ref={provided.innerRef} {...provided.droppableProps}>
                        {camposComprador.map((campo, index) => (
                          <FieldListItem
                            key={campo.id}
                            campo={campo}
                            index={index}
                            listLength={camposComprador.length}
                            section="buyer"
                          />
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Campos dos Inscritos */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Typography variant="h6">
                    Dados dos Inscritos
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={headerSkeleton}
                    onClick={() => {
                      setFormCampo(prev => ({ ...prev, section: 'attendee' }));
                      handleAbrirDialog();
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Repetido para cada inscrito
                </Typography>
                <Divider style={{ margin: '16px 0' }} />
                {headerSkeleton ? (
                  <List>
                    {skeletonListItems}
                  </List>
                ) : camposInscritos.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum campo adicionado
                  </Typography>
                ) : (
                  <Droppable droppableId="attendee">
                    {(provided) => (
                      <List ref={provided.innerRef} {...provided.droppableProps}>
                        {camposInscritos.map((campo, index) => (
                          <FieldListItem
                            key={campo.id}
                            campo={campo}
                            index={index}
                            listLength={camposInscritos.length}
                            section="attendee"
                          />
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Botões de Ação */}
          <Grid item xs={12}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSalvarFormulario}
                disabled={loading || campos.length === 0}
              >
                {loading ? 'Salvando...' : 'Salvar Formulário'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => history.push(`/app/events/${id}`)}
              >
                Voltar
              </Button>
            </div>
          </Grid>
        </Grid>
        </DragDropContext>
      </PapperBlock>

      {/* Dialog de Adicionar/Editar Campo */}
      <Dialog open={dialogAberto} onClose={handleFecharDialog} maxWidth="md" fullWidth>
        <DialogTitle>{campoAtual ? 'Editar Campo' : 'Novo Campo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Campo</InputLabel>
                <Select
                  name="fieldType"
                  value={formCampo.fieldType}
                  onChange={handleChangeCampo}
                >
                  {TIPOS_CAMPO.map(tipo => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Seção</InputLabel>
                <Select
                  name="section"
                  value={formCampo.section}
                  onChange={handleChangeCampo}
                >
                  <MenuItem value="buyer">Dados do Comprador</MenuItem>
                  <MenuItem value="attendee">Dados dos Inscritos</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Label do Campo"
                name="fieldLabel"
                value={formCampo.fieldLabel}
                onChange={handleChangeCampo}
                helperText="Texto que aparece para o usuário"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Nome do Campo"
                name="fieldName"
                value={formCampo.fieldName}
                onChange={handleChangeCampo}
                helperText="Nome técnico (sem espaços ou caracteres especiais)"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Placeholder"
                name="placeholder"
                value={formCampo.placeholder}
                onChange={handleChangeCampo}
                helperText="Texto de exemplo dentro do campo"
              />
            </Grid>

            {/* Opções para select, radio, checkbox */}
            {['select', 'radio', 'checkbox'].includes(formCampo.fieldType) && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Opções
                </Typography>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nova opção"
                    value={opcaoTemp}
                    onChange={(e) => setOpcaoTemp(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdicionarOpcao();
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAdicionarOpcao}
                  >
                    Adicionar
                  </Button>
                </div>
                {formCampo.options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {formCampo.options.map((opcao, index) => (
                      <Chip
                        key={index}
                        label={opcao}
                        onDelete={() => handleRemoverOpcao(index)}
                      />
                    ))}
                  </div>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formCampo.isRequired}
                    onChange={handleChangeCampo}
                    name="isRequired"
                    color="primary"
                  />
                }
                label="Campo Obrigatório"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialog}>Cancelar</Button>
          <Button onClick={handleSalvarCampo} color="primary" variant="contained">
            {campoAtual ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default FormBuilder;
