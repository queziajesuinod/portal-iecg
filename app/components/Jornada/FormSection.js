import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

function FormSection({
  title, description, dense, children
}) {
  return (
    <Box sx={{ mb: dense ? 2 : 3 }}>
      <Typography variant="subtitle2" component="h3" sx={{
        fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.78rem'
      }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 1.5 }}>
          {description}
        </Typography>
      )}
      {!description && <Box sx={{ mb: 1.25 }} />}
      {children}
    </Box>
  );
}

FormSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  dense: PropTypes.bool,
  children: PropTypes.node.isRequired
};

FormSection.defaultProps = {
  description: '',
  dense: false
};

export default FormSection;
