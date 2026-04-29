import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ICONS = {
  error: <DeleteOutlineIcon sx={{ fontSize: 36, color: 'error.main' }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 36, color: 'warning.main' }} />,
  info: <HelpOutlineIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
};

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    resolve: null,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    confirmColor: 'primary',
    severity: 'warning',
  });

  const confirm = useCallback((options) => new Promise((resolve) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    setState({
      open: true,
      resolve,
      title: opts.title || 'Confirmar ação',
      message: opts.message || '',
      confirmText: opts.confirmText || 'Confirmar',
      cancelText: opts.cancelText || 'Cancelar',
      confirmColor: opts.confirmColor || 'primary',
      severity: opts.severity || 'warning',
    });
  }), []);

  const handleClose = (result) => {
    setState((prev) => {
      if (prev.resolve) prev.resolve(result);
      return { ...prev, open: false, resolve: null };
    });
  };

  const ConfirmDialog = (
    <Dialog
      open={state.open}
      onClose={() => handleClose(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {ICONS[state.severity] || ICONS.warning}
          <Box>{state.title}</Box>
        </Box>
      </DialogTitle>
      {state.message && (
        <DialogContent sx={{ pt: 0 }}>
          <DialogContentText>{state.message}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={() => handleClose(false)}>
          {state.cancelText}
        </Button>
        <Button
          variant="contained"
          color={state.confirmColor}
          onClick={() => handleClose(true)}
        >
          {state.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
