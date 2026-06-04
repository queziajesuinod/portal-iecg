import React from 'react';
import PropTypes from 'prop-types';
import {
  Card, CardContent, Typography, Box, Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const DeltaBadge = ({ delta }) => {
  if (delta == null) return null;
  const positivo = delta > 0;
  const neutro = delta === 0;
  const icon = neutro
    ? <TrendingFlatIcon sx={{ fontSize: 14 }} />
    : positivo
      ? <TrendingUpIcon sx={{ fontSize: 14 }} />
      : <TrendingDownIcon sx={{ fontSize: 14 }} />;
  const color = neutro ? 'default' : positivo ? 'success' : 'error';
  const label = `${positivo ? '+' : ''}${Number(delta).toFixed(1)}%`;
  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      size="small"
      sx={{ mt: 0.5, height: 20, fontSize: 11 }}
    />
  );
};

DeltaBadge.propTypes = {
  delta: PropTypes.number,
};
DeltaBadge.defaultProps = { delta: null };

const KpiCard = ({
  label, value, subtitle, color, delta, deltaLabel,
}) => (
  <Card variant="outlined" sx={{ height: '100%', borderLeft: color ? `4px solid ${color}` : undefined }}>
    <CardContent sx={{ pb: '12px !important' }}>
      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
        {subtitle && (
          <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
        )}
        <DeltaBadge delta={delta} />
      </Box>
      {deltaLabel && (
        <Typography variant="caption" color="textSecondary" display="block">{deltaLabel}</Typography>
      )}
    </CardContent>
  </Card>
);

KpiCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  color: PropTypes.string,
  delta: PropTypes.number,
  deltaLabel: PropTypes.string,
};

KpiCard.defaultProps = {
  subtitle: '',
  color: '',
  delta: null,
  deltaLabel: '',
};

export default KpiCard;
