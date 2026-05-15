import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { CircularProgress, Typography, Box } from '@mui/material';
import { minhacelula } from '../../../api/celulaPresencaApi';

export default function MinhaCelulaPage() {
  const [celulaId, setCelulaId] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    minhacelula()
      .then(data => setCelulaId(data.id))
      .catch(err => setErro(err.message || 'Nenhuma célula vinculada ao seu usuário.'));
  }, []);

  if (celulaId) {
    return <Redirect to={`/app/celulas/${celulaId}/presenca`} />;
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
      {erro ? (
        <Typography color="textSecondary">{erro}</Typography>
      ) : (
        <CircularProgress />
      )}
    </Box>
  );
}
