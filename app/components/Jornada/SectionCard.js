import React from 'react';
import PropTypes from 'prop-types';
import {
  Box, Divider, Paper, Stack, Typography
} from '@mui/material';

function SectionCard({
  icon, title, action, divider, children, sx
}) {
  const hasHeader = title || icon || action;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, ...sx }}>
      {hasHeader && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: divider ? 1.5 : 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            {icon}
            {title && (
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                {title}
              </Typography>
            )}
          </Stack>
          {action}
        </Stack>
      )}
      {hasHeader && divider && <Divider sx={{ mb: 2, opacity: 0.4 }} />}
      <Box>{children}</Box>
    </Paper>
  );
}

SectionCard.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node,
  action: PropTypes.node,
  divider: PropTypes.bool,
  children: PropTypes.node,
  // eslint-disable-next-line react/forbid-prop-types
  sx: PropTypes.object
};

SectionCard.defaultProps = {
  icon: null,
  title: null,
  action: null,
  divider: true,
  children: null,
  sx: {}
};

export default SectionCard;
