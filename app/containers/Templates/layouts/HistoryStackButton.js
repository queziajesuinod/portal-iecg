import React, { useState } from 'react';
import PropTypes from 'prop-types';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import HistoryIcon from '@mui/icons-material/History';

function HistoryStackButton({ history, historyStack }) {
  const [open, setOpen] = useState(false);

  if (!historyStack || historyStack.length === 0) {
    return null;
  }

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('pt-BR');
  };

  const handleNavigate = (path) => {
    history.push(path);
    setOpen(false);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={() => setOpen(true)}
        aria-label="Histórico recente"
      >
        <HistoryIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Histórico recente</DialogTitle>
        <Divider />
        <List>
          {historyStack.map((item, index) => (
            <ListItemButton
              key={`${item.path}-${index}`}
              onClick={() => handleNavigate(item.path)}
            >
              <ListItemText
                primary={item.label || item.path}
              secondary={`${item.path}${item.timestamp ? ` • ${formatTimestamp(item.timestamp)}` : ''}`}
            />
            </ListItemButton>
          ))}
        </List>
      </Dialog>
    </>
  );
}

HistoryStackButton.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  historyStack: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    path: PropTypes.string.isRequired,
  })),
};

HistoryStackButton.defaultProps = {
  historyStack: [],
};

export default HistoryStackButton;
