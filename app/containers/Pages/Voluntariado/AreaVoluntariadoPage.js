import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { listarAreas, criarArea, atualizarArea, alternarAtivoArea } from '../../../api/voluntariadoApi';

const FORM_VAZIO = { nome: '' };

const AreaVoluntariadoPage = () => {
  const [areas, setAreas] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [form, setForm] = useState(FORM_VAZIO);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    listarAreas()
      .then(setAreas)
      .catch(() => setNotification('Erro ao carregar áreas de voluntariado'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setDialog({ open: true, editando: null });
  };

  const abrirEditar = (area) => {
    setForm({ nome: area.nome });
    setDialog({ open: true, editando: area });
  };

  const fecharDialog = () => setDialog({ open: false, editando: null });

  const handleSalvar = async () => {
    if (!form.nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      if (dialog.editando) {
        await atualizarArea(dialog.editando.id, { nome: form.nome.trim() });
        setNotification('Área atualizada com sucesso');
      } else {
        await criarArea({ nome: form.nome.trim(), ativo: true });
        setNotification('Área criada com sucesso');
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    }
  };

  const handleAlternarAtivo = async (area) => {
    try {
      await alternarAtivoArea(area.id);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao alterar status');
    }
  };

  return (
    <div>
      <Helmet><title>Áreas de Voluntariado</title></Helmet>
      <PapperBlock title="Áreas de Voluntariado" icon="ion-ios-people-outline" desc="Cadastre e gerencie as áreas de atuação dos voluntários">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>
            Nova Área
          </Button>
        </Box>

        {loading && <Typography variant="body2" color="text.secondary" mb={2}>Carregando...</Typography>}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {areas.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center">Nenhuma área cadastrada</TableCell>
                </TableRow>
              )}
              {areas.map((area) => (
                <TableRow key={area.id} hover>
                  <TableCell>{area.nome}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={area.ativo ? 'Ativa' : 'Inativa'}
                      size="small"
                      color={area.ativo ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(area)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={area.ativo ? 'Desativar' : 'Ativar'}>
                      <Switch size="small" checked={area.ativo} onChange={() => handleAlternarAtivo(area)} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Área' : 'Nova Área de Voluntariado'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              required
              label="Nome da área"
              value={form.nome}
              onChange={(e) => setForm({ nome: e.target.value })}
              margin="normal"
              placeholder="Ex.: BACKSTAGE, LOUVOR, RECEPÇÃO..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
          </DialogActions>
        </Dialog>

        <Notification message={notification} close={() => setNotification('')} />
      </PapperBlock>
    </div>
  );
};

export default AreaVoluntariadoPage;
