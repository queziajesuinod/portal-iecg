/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Chip, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PapperBlock } from 'dan-components';
import * as api from '../../../api/cfmApi';

const EMPTY_ESCOLA = { nome: '', descricao: '', temModulos: false };
const EMPTY_MODULO = { nome: '', descricao: '', ordem: 0 };
const EMPTY_MATERIA = { nome: '', descricao: '', ordem: 0 };

export default function CfmConfigPage() {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [escolaDialog, setEscolaDialog] = useState({ open: false, data: EMPTY_ESCOLA, editing: null });
  const [moduloDialog, setModuloDialog] = useState({
    open: false, data: EMPTY_MODULO, editing: null, escolaId: null
  });
  const [materiaDialog, setMateriaDialog] = useState({
    open: false, data: EMPTY_MATERIA, editing: null, escolaId: null, moduloId: null
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setEscolas(await api.listEscolas());
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Escola ───────────────────────────────────────────────────────────────
  const openEscolaCreate = () => setEscolaDialog({ open: true, data: { ...EMPTY_ESCOLA }, editing: null });
  const openEscolaEdit = (e) => setEscolaDialog({ open: true, data: { nome: e.nome, descricao: e.descricao || '', temModulos: e.temModulos }, editing: e.id });
  const closeEscola = () => setEscolaDialog({ open: false, data: EMPTY_ESCOLA, editing: null });

  const saveEscola = async () => {
    setSaving(true);
    try {
      if (escolaDialog.editing) await api.updateEscola(escolaDialog.editing, escolaDialog.data);
      else await api.createEscola(escolaDialog.data);
      closeEscola();
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setSaving(false); }
  };

  const removeEscola = async (id) => {
    if (!window.confirm('Excluir esta escola?')) return;
    try { await api.deleteEscola(id); await load(); } catch (e) { setError(e.response?.data?.erro || e.message); }
  };

  // ─── Módulo ───────────────────────────────────────────────────────────────
  const openModuloCreate = (escolaId) => setModuloDialog({
    open: true, data: { ...EMPTY_MODULO }, editing: null, escolaId
  });
  const openModuloEdit = (m, escolaId) => setModuloDialog({
    open: true, data: { nome: m.nome, descricao: m.descricao || '', ordem: m.ordem }, editing: m.id, escolaId
  });
  const closeModulo = () => setModuloDialog({
    open: false, data: EMPTY_MODULO, editing: null, escolaId: null
  });

  const saveModulo = async () => {
    setSaving(true);
    try {
      if (moduloDialog.editing) await api.updateModulo(moduloDialog.editing, moduloDialog.data);
      else await api.createModulo(moduloDialog.escolaId, moduloDialog.data);
      closeModulo();
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setSaving(false); }
  };

  const removeModulo = async (id) => {
    if (!window.confirm('Excluir este módulo?')) return;
    try { await api.deleteModulo(id); await load(); } catch (e) { setError(e.response?.data?.erro || e.message); }
  };

  // ─── Matéria ──────────────────────────────────────────────────────────────
  const openMateriaCreate = (escolaId, moduloId = null) => setMateriaDialog({
    open: true, data: { ...EMPTY_MATERIA }, editing: null, escolaId, moduloId
  });
  const openMateriaEdit = (m, escolaId, moduloId = null) => setMateriaDialog({
    open: true, data: { nome: m.nome, descricao: m.descricao || '', ordem: m.ordem }, editing: m.id, escolaId, moduloId
  });
  const closeMateria = () => setMateriaDialog({
    open: false, data: EMPTY_MATERIA, editing: null, escolaId: null, moduloId: null
  });

  const saveMateria = async () => {
    setSaving(true);
    try {
      if (materiaDialog.editing) await api.updateMateria(materiaDialog.editing, materiaDialog.data);
      else await api.createMateria({ ...materiaDialog.data, escolaId: materiaDialog.escolaId, moduloId: materiaDialog.moduloId });
      closeMateria();
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setSaving(false); }
  };

  const removeMateria = async (id) => {
    if (!window.confirm('Excluir esta matéria?')) return;
    try { await api.deleteMateria(id); await load(); } catch (e) { setError(e.response?.data?.erro || e.message); }
  };

  return (
    <PapperBlock title="Escolas & Matérias" desc="Configure as escolas, módulos e matérias do CFM" icon="ion-ios-settings-outline">
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <>
          <Box display="flex" justifyContent="flex-end" mb={3}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openEscolaCreate}>Nova Escola</Button>
          </Box>

          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

          {escolas.length === 0 && (
            <Alert severity="info">Nenhuma escola cadastrada. Crie a primeira escola para começar.</Alert>
          )}

          {escolas.map((escola) => (
            <Accordion key={escola.id} defaultExpanded sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} flex={1} pr={2}>
                  <Typography fontWeight={600}>{escola.nome}</Typography>
                  <Chip size="small" label={escola.temModulos ? 'Com módulos' : 'Sem módulos'} color={escola.temModulos ? 'primary' : 'default'} />
                  {!escola.ativo && <Chip size="small" label="Inativa" color="warning" />}
                  <Box flex={1} />
                  <Tooltip title="Editar escola">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEscolaEdit(escola); }}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir escola">
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); removeEscola(escola.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                {escola.temModulos ? (
                // Escola com módulos → lista módulos, cada um com suas matérias
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" color="text.secondary">Módulos</Typography>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => openModuloCreate(escola.id)}>Novo Módulo</Button>
                    </Box>
                    {(escola.modulos || []).map((modulo) => (
                      <Box key={modulo.id} border={1} borderColor="divider" borderRadius={1} p={2} mb={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography fontWeight={500}>{modulo.nome}</Typography>
                          <Box display="flex" gap={1}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => openMateriaCreate(escola.id, modulo.id)}>Matéria</Button>
                            <IconButton size="small" onClick={() => openModuloEdit(modulo, escola.id)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => removeModulo(modulo.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Box>
                        </Box>
                        <MateriasList
                          materias={modulo.materias || []}
                          onEdit={(m) => openMateriaEdit(m, escola.id, modulo.id)}
                          onDelete={removeMateria}
                        />
                      </Box>
                    ))}
                    {(escola.modulos || []).length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Nenhum módulo cadastrado.</Typography>
                    )}
                  </Box>
                ) : (
                // Escola sem módulos → matérias diretamente
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" color="text.secondary">Matérias</Typography>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => openMateriaCreate(escola.id)}>Nova Matéria</Button>
                    </Box>
                    <MateriasList
                      materias={escola.materias || []}
                      onEdit={(m) => openMateriaEdit(m, escola.id)}
                      onDelete={removeMateria}
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Dialog Escola */}
          <Dialog open={escolaDialog.open} onClose={closeEscola} maxWidth="sm" fullWidth>
            <DialogTitle>{escolaDialog.editing ? 'Editar Escola' : 'Nova Escola'}</DialogTitle>
            <DialogContent sx={{
              display: 'flex', flexDirection: 'column', gap: 2, pt: 2
            }}>
              <TextField label="Nome da Escola" fullWidth value={escolaDialog.data.nome} onChange={(e) => setEscolaDialog(d => ({ ...d, data: { ...d.data, nome: e.target.value } }))} />
              <TextField label="Descrição" fullWidth multiline rows={2} value={escolaDialog.data.descricao} onChange={(e) => setEscolaDialog(d => ({ ...d, data: { ...d.data, descricao: e.target.value } }))} />
              <FormControlLabel
                control={<Switch checked={escolaDialog.data.temModulos} onChange={(e) => setEscolaDialog(d => ({ ...d, data: { ...d.data, temModulos: e.target.checked } }))} />}
                label="Esta escola tem módulos (ex: Liderança Avançada)"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeEscola}>Cancelar</Button>
              <Button variant="contained" onClick={saveEscola} disabled={saving || !escolaDialog.data.nome}>
                {saving ? <CircularProgress size={20} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog Módulo */}
          <Dialog open={moduloDialog.open} onClose={closeModulo} maxWidth="sm" fullWidth>
            <DialogTitle>{moduloDialog.editing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
            <DialogContent sx={{
              display: 'flex', flexDirection: 'column', gap: 2, pt: 2
            }}>
              <TextField label="Nome do Módulo" fullWidth value={moduloDialog.data.nome} onChange={(e) => setModuloDialog(d => ({ ...d, data: { ...d.data, nome: e.target.value } }))} />
              <TextField label="Descrição" fullWidth multiline rows={2} value={moduloDialog.data.descricao} onChange={(e) => setModuloDialog(d => ({ ...d, data: { ...d.data, descricao: e.target.value } }))} />
              <TextField label="Ordem" type="number" value={moduloDialog.data.ordem} onChange={(e) => setModuloDialog(d => ({ ...d, data: { ...d.data, ordem: Number(e.target.value) } }))} />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeModulo}>Cancelar</Button>
              <Button variant="contained" onClick={saveModulo} disabled={saving || !moduloDialog.data.nome}>
                {saving ? <CircularProgress size={20} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog Matéria */}
          <Dialog open={materiaDialog.open} onClose={closeMateria} maxWidth="sm" fullWidth>
            <DialogTitle>{materiaDialog.editing ? 'Editar Matéria' : 'Nova Matéria'}</DialogTitle>
            <DialogContent sx={{
              display: 'flex', flexDirection: 'column', gap: 2, pt: 2
            }}>
              <TextField label="Nome da Matéria" fullWidth value={materiaDialog.data.nome} onChange={(e) => setMateriaDialog(d => ({ ...d, data: { ...d.data, nome: e.target.value } }))} />
              <TextField label="Descrição" fullWidth multiline rows={2} value={materiaDialog.data.descricao} onChange={(e) => setMateriaDialog(d => ({ ...d, data: { ...d.data, descricao: e.target.value } }))} />
              <TextField label="Ordem" type="number" value={materiaDialog.data.ordem} onChange={(e) => setMateriaDialog(d => ({ ...d, data: { ...d.data, ordem: Number(e.target.value) } }))} />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeMateria}>Cancelar</Button>
              <Button variant="contained" onClick={saveMateria} disabled={saving || !materiaDialog.data.nome}>
                {saving ? <CircularProgress size={20} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </PapperBlock>
  );
}

function MateriasList({ materias, onEdit, onDelete }) {
  if (!materias.length) return <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Nenhuma matéria cadastrada.</Typography>;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Ordem</TableCell>
          <TableCell>Matéria</TableCell>
          <TableCell align="right">Ações</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {materias.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{m.ordem}</TableCell>
            <TableCell>{m.nome}</TableCell>
            <TableCell align="right">
              <IconButton size="small" onClick={() => onEdit(m)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => onDelete(m.id)}><DeleteIcon fontSize="small" /></IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
