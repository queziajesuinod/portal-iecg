import React from 'react';
import PropTypes from 'prop-types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

function Notification(props) {
  const {
    message, close, open, type, autoHideDuration
  } = props;

  const isOpen = open !== undefined ? open : message !== '';

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    close();
  };

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      sx={{ top: { xs: 72, sm: 80 } }}
    >
      <Alert
        onClose={handleClose}
        severity={type || 'success'}
        variant="filled"
        elevation={6}
        sx={{
          minWidth: 300,
          maxWidth: 520,
          borderRadius: 2,
          fontSize: '0.875rem',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

Notification.defaultProps = {
  open: undefined,
  type: 'success',
  autoHideDuration: 4000,
};

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
  open: PropTypes.bool,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  autoHideDuration: PropTypes.number,
};

export default Notification;
