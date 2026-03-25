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
import { listarMinistros, criarMinistro, atualizarMinistro, alternarAtivoMinistro } from '../../../../api/cultosApi';

const MinistrosPage = () => {
  const [ministros, setMinistros] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [nome, setNome] = useState('');

  const loadData = () => {
    listarMinistros()
      .then(setMinistros)
      .catch(() => setNotification('Erro ao carregar ministros'));
  };

  useEffect(() => { loadData(); }, []);

  const abrirNovo = () => {
    setNome('');
    setDialog({ open: true, editando: null });
  };

  const abrirEditar = (m) => {
    setNome(m.nome);
    setDialog({ open: true, editando: m });
  };

  const fecharDialog = () => setDialog({ open: false, editando: null });

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      if (dialog.editando) {
        await atualizarMinistro(dialog.editando.id, { nome: nome.trim() });
        setNotification('Ministro atualizado');
      } else {
        await criarMinistro({ nome: nome.trim(), ativo: true });
        setNotification('Ministro criado');
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    }
  };

  const handleAlternarAtivo = async (m) => {
    try {
      await alternarAtivoMinistro(m.id);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao alterar status');
    }
  };

  return (
    <div>
      <Helmet><title>Ministros</title></Helmet>
      <PapperBlock title="Ministros" icon="ion-ios-mic-outline" desc="Cadastre os pastores, pregadores e ministros">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>Novo Ministro</Button>
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
              {ministros.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>{m.nome}</TableCell>
                  <TableCell align="center">
                    <Chip label={m.ativo ? 'Ativo' : 'Inativo'} size="small"
                      color={m.ativo ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(m)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={m.ativo ? 'Desativar' : 'Ativar'}>
                      <Switch size="small" checked={m.ativo} onChange={() => handleAlternarAtivo(m)} />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {ministros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">Nenhum ministro cadastrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Ministro' : 'Novo Ministro'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth required label="Nome" value={nome} autoFocus
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
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

export default MinistrosPage;
