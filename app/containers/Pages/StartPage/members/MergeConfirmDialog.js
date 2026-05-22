import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Paper,
  Typography,
  Avatar,
  Box,
  Chip,
  Divider,
  Button
} from '@mui/material';
import MergeIcon from '@mui/icons-material/MergeType';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const MergeConfirmDialog = ({
  open, suggestion, onClose, onConfirm
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <MergeIcon color="warning" />
      Confirmar fusão de cadastros
    </DialogTitle>
    <DialogContent>
      {suggestion && (
        <Stack spacing={2}>
          <DialogContentText variant="body2">
            O cadastro mais recente será excluído e seus dados serão incorporados ao mais antigo.
          </DialogContentText>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: 'success.main' }}>
              <Typography variant="caption" color="success.main" fontWeight={600}>MANTER</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <Avatar src={suggestion.olderMember.photoUrl || ''} sx={{ width: 36, height: 36 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>{suggestion.olderMember.fullName}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {suggestion.olderMember.email || suggestion.olderMember.phone || '-'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <ArrowForwardIcon color="action" />

            <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: 'error.main' }}>
              <Typography variant="caption" color="error.main" fontWeight={600}>EXCLUIR</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <Avatar src={suggestion.newerMember.photoUrl || ''} sx={{ width: 36, height: 36 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>{suggestion.newerMember.fullName}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {suggestion.newerMember.email || suggestion.newerMember.phone || '-'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>

          {suggestion.reasons?.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="textSecondary" mb={0.5} display="block">Motivos da sugestão</Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {suggestion.reasons.map((r) => (
                    <Chip key={r.type} size="small" label={r.label} variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" color="warning" startIcon={<MergeIcon />} onClick={onConfirm}>
        Confirmar fusão
      </Button>
    </DialogActions>
  </Dialog>
);

MergeConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  suggestion: PropTypes.shape({
    olderMember: PropTypes.shape({
      photoUrl: PropTypes.string,
      fullName: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
    }),
    newerMember: PropTypes.shape({
      photoUrl: PropTypes.string,
      fullName: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
    }),
    reasons: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string,
      label: PropTypes.string,
    })),
  }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

MergeConfirmDialog.defaultProps = {
  suggestion: null,
};

export default MergeConfirmDialog;
