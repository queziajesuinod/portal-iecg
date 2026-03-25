import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, Paper, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { listarMinisterios, criarMinisterio, atualizarMinisterio, alternarAtivoMinisterio } from '../../../../api/cultosApi';

const FORM_VAZIO = {
  nome: '',
  exibeCriancas: true,
  exibeBebes: true,
  apeloDefault: false,
  exibeOnline: true,
};

const MinisteriosPage = () => {
  const [ministerios, setMinisterios] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [form, setForm] = useState(FORM_VAZIO);

  const loadData = () => {
    listarMinisterios()
      .then(setMinisterios)
      .catch(() => setNotification('Erro ao carregar ministérios'));
  };

  useEffect(() => { loadData(); }, []);

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setDialog({ open: true, editando: null });
  };

  const abrirEditar = (m) => {
    setForm({
      nome: m.nome,
      exibeCriancas: m.exibeCriancas,
      exibeBebes: m.exibeBebes,
      apeloDefault: m.apeloDefault,
      exibeOnline: m.exibeOnline,
    });
    setDialog({ open: true, editando: m });
  };

  const fecharDialog = () => setDialog({ open: false, editando: null });

  const handleSwitch = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.checked }));

  const handleSalvar = async () => {
    if (!form.nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      if (dialog.editando) {
        await atualizarMinisterio(dialog.editando.id, form);
        setNotification('Ministério atualizado');
      } else {
        await criarMinisterio({ ...form, ativo: true });
        setNotification('Ministério criado');
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    }
  };

  const handleAlternarAtivo = async (m) => {
    try {
      await alternarAtivoMinisterio(m.id);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao alterar status');
    }
  };

  return (
    <div>
      <Helmet><title>Ministérios</title></Helmet>
      <PapperBlock title="Ministérios" icon="ion-ios-people-outline" desc="Gerencie os ministérios e suas configurações">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>Novo Ministério</Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell align="center">Crianças</TableCell>
                <TableCell align="center">Bebês</TableCell>
                <TableCell align="center">Apelo padrão</TableCell>
                <TableCell align="center">Online</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ministerios.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>{m.nome}</TableCell>
                  <TableCell align="center">
                    <Chip label={m.exibeCriancas ? 'Sim' : 'Não'} size="small"
                      color={m.exibeCriancas ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={m.exibeBebes ? 'Sim' : 'Não'} size="small"
                      color={m.exibeBebes ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={m.apeloDefault ? 'Sim' : 'Não'} size="small"
                      color={m.apeloDefault ? 'warning' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={m.exibeOnline ? 'Sim' : 'Não'} size="small"
                      color={m.exibeOnline ? 'info' : 'default'} variant="outlined" />
                  </TableCell>
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
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Ministério' : 'Novo Ministério'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Nome" value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Campos exibidos no formulário</Typography>
                <FormControlLabel
                  control={<Switch checked={form.exibeCriancas} onChange={handleSwitch('exibeCriancas')} />}
                  label="Exibir campo Crianças"
                />
                <FormControlLabel
                  control={<Switch checked={form.exibeBebes} onChange={handleSwitch('exibeBebes')} />}
                  label="Exibir campo Bebês"
                />
                <FormControlLabel
                  control={<Switch checked={form.apeloDefault} onChange={handleSwitch('apeloDefault')} />}
                  label="Apelo marcado por padrão"
                />
                <FormControlLabel
                  control={<Switch checked={form.exibeOnline} onChange={handleSwitch('exibeOnline')} />}
                  label="Exibir campo Online (quando campus transmite)"
                />
              </Grid>
            </Grid>
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

export default MinisteriosPage;
