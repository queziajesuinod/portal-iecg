import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

function MetricTile({ value, label, color }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      <Typography
        variant="h5"
        component="span"
        sx={{ fontWeight: 700, color: `${color}.main`, lineHeight: 1.1 }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

MetricTile.propTypes = {
  value: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  color: PropTypes.string
};

MetricTile.defaultProps = {
  color: 'primary'
};

export default MetricTile;
