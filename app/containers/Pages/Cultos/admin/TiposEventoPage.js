import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { listarTiposEvento, criarTipoEvento, atualizarTipoEvento, alternarAtivoTipoEvento } from '../../../../api/cultosApi';

const TiposEventoPage = () => {
  const [tipos, setTipos] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [nome, setNome] = useState('');

  const loadData = () => {
    listarTiposEvento()
      .then(setTipos)
      .catch(() => setNotification('Erro ao carregar tipos de evento'));
  };

  useEffect(() => { loadData(); }, []);

  const abrirNovo = () => { setNome(''); setDialog({ open: true, editando: null }); };
  const abrirEditar = (t) => { setNome(t.nome); setDialog({ open: true, editando: t }); };
  const fecharDialog = () => setDialog({ open: false, editando: null });

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      if (dialog.editando) {
        await atualizarTipoEvento(dialog.editando.id, { nome });
        setNotification('Tipo de evento atualizado');
      } else {
        await criarTipoEvento({ nome, ativo: true });
        setNotification('Tipo de evento criado');
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    }
  };

  const handleAlternarAtivo = async (t) => {
    try {
      await alternarAtivoTipoEvento(t.id);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao alterar status');
    }
  };

  return (
    <div>
      <Helmet><title>Tipos de Evento</title></Helmet>
      <PapperBlock title="Tipos de Evento" icon="ion-ios-pricetag-outline" desc="Gerencie os tipos de evento disponíveis no formulário">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>Novo Tipo</Button>
        </Box>

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
              {tipos.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.nome}</TableCell>
                  <TableCell align="center">
                    <Chip label={t.ativo ? 'Ativo' : 'Inativo'} size="small" color={t.ativo ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(t)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={t.ativo ? 'Desativar' : 'Ativar'}>
                      <Switch size="small" checked={t.ativo} onChange={() => handleAlternarAtivo(t)} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth required label="Nome" value={nome}
              onChange={(e) => setNome(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
          </DialogActions>
        </Dialog>

        {notification && <Notification message={notification} onClose={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default TiposEventoPage;
