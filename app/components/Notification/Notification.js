import React from 'react';
import PropTypes from 'prop-types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Slide from '@mui/material/Slide';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

const ERROR_RX = /(erro|falha|inválid|invalid|nao foi possivel|não foi possível|denied|forbidden|recusad|negad|conflito|expirad|incorret)/i;
const WARN_RX = /(aviso|atenção|atencao|pendente|pendência|pendencia|cuidado|expirando)/i;
const INFO_RX = /(carregando|aguarde|processando|iniciando)/i;

function detectType(message) {
  if (!message) return 'info';
  const msg = String(message);
  if (ERROR_RX.test(msg)) return 'error';
  if (WARN_RX.test(msg)) return 'warning';
  if (INFO_RX.test(msg)) return 'info';
  return 'success';
}

const TITLE_BY_TYPE = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação'
};

const ICON_BY_TYPE = {
  success: <CheckCircleRoundedIcon fontSize="inherit" />,
  error: <ErrorRoundedIcon fontSize="inherit" />,
  warning: <WarningRoundedIcon fontSize="inherit" />,
  info: <InfoRoundedIcon fontSize="inherit" />
};

const GLOW_BY_TYPE = {
  success: '0 12px 32px -8px rgba(34, 139, 34, 0.55)',
  error: '0 12px 32px -8px rgba(211, 47, 47, 0.6)',
  warning: '0 12px 32px -8px rgba(237, 108, 2, 0.55)',
  info: '0 12px 32px -8px rgba(2, 136, 209, 0.55)'
};

const GRADIENT_BY_TYPE = {
  success: 'linear-gradient(135deg, #2e7d32 0%, #43a047 60%, #66bb6a 100%)',
  error: 'linear-gradient(135deg, #c62828 0%, #e53935 55%, #ef5350 100%)',
  warning: 'linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffa726 100%)',
  info: 'linear-gradient(135deg, #01579b 0%, #0277bd 55%, #29b6f6 100%)'
};

function SlideDown(props) {
  return <Slide {...props} direction="down" />;
}

function Notification(props) {
  const {
    message, close, open, type, autoHideDuration
  } = props;

  const isOpen = open !== undefined ? open : message !== '';
  const resolvedType = type || detectType(message);
  const resolvedDuration = autoHideDuration ?? (resolvedType === 'error' ? 6000 : 4000);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    close();
  };

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={isOpen}
      autoHideDuration={resolvedDuration}
      onClose={handleClose}
      TransitionComponent={SlideDown}
      sx={{ top: { xs: 72, sm: 88 } }}
    >
      <Alert
        onClose={handleClose}
        severity={resolvedType}
        variant="filled"
        elevation={0}
        icon={ICON_BY_TYPE[resolvedType]}
        sx={{
          minWidth: { xs: 280, sm: 360 },
          maxWidth: 560,
          borderRadius: 2.5,
          py: 1.25,
          pl: 2,
          pr: 1.5,
          alignItems: 'flex-start',
          color: '#fff',
          background: GRADIENT_BY_TYPE[resolvedType],
          boxShadow: GLOW_BY_TYPE[resolvedType],
          backdropFilter: 'saturate(140%)',
          border: '1px solid rgba(255,255,255,0.18)',
          '& .MuiAlert-icon': {
            fontSize: 26,
            mt: 0.25,
            opacity: 1,
            color: '#fff',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
          },
          '& .MuiAlert-message': {
            py: 0,
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: 0.1,
            textShadow: '0 1px 1px rgba(0,0,0,0.18)',
          },
          '& .MuiAlertTitle-root': {
            fontWeight: 700,
            fontSize: '0.95rem',
            mb: 0.25,
            letterSpacing: 0.2,
            textShadow: '0 1px 1px rgba(0,0,0,0.2)',
          },
          '& .MuiAlert-action': {
            pt: 0,
            mr: -0.5,
            '& .MuiSvgIcon-root': {
              color: 'rgba(255,255,255,0.92)',
              fontSize: 20,
            },
            '& .MuiIconButton-root:hover': {
              backgroundColor: 'rgba(255,255,255,0.18)',
            }
          },
        }}
      >
        <AlertTitle>{TITLE_BY_TYPE[resolvedType]}</AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  );
}

Notification.defaultProps = {
  open: undefined,
  type: undefined,
  autoHideDuration: undefined,
};

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
  open: PropTypes.bool,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  autoHideDuration: PropTypes.number,
};

export default Notification;
