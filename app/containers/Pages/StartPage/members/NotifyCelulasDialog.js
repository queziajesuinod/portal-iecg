import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  CircularProgress
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import GroupsIcon from '@mui/icons-material/Groups';

const NotifyCelulasDialog = ({
  open, member, sending, onClose, onConfirm
}) => {
  const celulas = (member && member.liderancaCelulas) || [];
  const qtd = (member && member.qtdCelulasLideradas) || celulas.length;
  const varias = qtd > 1;

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WhatsAppIcon color="success" />
        Notificar líder sobre as células
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" gutterBottom>
          {varias ? (
            <>
              <strong>{member?.fullName}</strong>
              {' '}
              está cadastrado(a) como líder de
              {' '}
              <strong>{qtd}</strong>
              {' '}
              células:
            </>
          ) : (
            <>
              Enviar uma mensagem no WhatsApp para
              {' '}
              <strong>{member?.fullName}</strong>
              {' '}
              conferir e atualizar os dados da célula abaixo?
            </>
          )}
        </Typography>

        <List dense sx={{ py: 0.5 }}>
          {celulas.map((c) => (
            <ListItem key={c.id} sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <GroupsIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={c.celula}
                secondary={[c.rede, c.bairro, [c.dia, c.horario].filter(Boolean).join(' ')]
                  .filter(Boolean).join(' · ') || null}
              />
            </ListItem>
          ))}
        </List>

        <Box
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start'
          }}
        >
          <Chip size="small" color={varias ? 'warning' : 'info'} label="WhatsApp" />
          <Typography variant="caption" color="text.secondary">
            {varias
              ? 'Ele(a) receberá um link para confirmar quais células são realmente dele(a) e inativar as que não lidera mais.'
              : 'Ele(a) receberá um link para conferir e manter os dados da célula atualizados.'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending} color="inherit">Cancelar</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="success"
          disabled={sending}
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
        >
          {sending ? 'Enviando…' : 'Enviar notificação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

NotifyCelulasDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  member: PropTypes.object,
  sending: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

NotifyCelulasDialog.defaultProps = {
  member: null,
  sending: false,
};

export default NotifyCelulasDialog;
