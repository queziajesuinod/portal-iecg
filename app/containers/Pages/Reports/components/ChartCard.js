import React from 'react';
import PropTypes from 'prop-types';
import {
  Card, CardContent, Typography, Box,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const PALETTE = [
  '#16548e', '#1e8449', '#c97a16', '#b43030', '#6a5acd',
  '#0f9bb0', '#8e44ad', '#2e86de', '#e67e22', '#27ae60',
];

const EmptyState = () => (
  <Box display="flex" alignItems="center" justifyContent="center" height={260}>
    <Typography variant="body2" color="textSecondary">Sem dados para exibir.</Typography>
  </Box>
);

const ChartCard = ({
  title, type, data, series, valueFormatter, height,
}) => {
  const hasData = Array.isArray(data) && data.length > 0;
  const fmt = valueFormatter || ((v) => v);

  const renderChart = () => {
    if (type === 'pie') {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95} label>
            {data.map((entry, index) => <Cell key={entry.key || entry.label} fill={PALETTE[index % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={fmt} />
          <Legend />
        </PieChart>
      );
    }

    if (type === 'line') {
      return (
        <LineChart data={data} margin={{
          top: 8, right: 16, left: 0, bottom: 0
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={fmt} />
          <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      );
    }

    if (type === 'composed') {
      return (
        <ComposedChart data={data} margin={{
          top: 8, right: 16, left: 0, bottom: 0
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={fmt} />
          <Legend />
          {(series || []).map((s, i) => (
            s.type === 'line'
              ? <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || PALETTE[i % PALETTE.length]} strokeWidth={2} />
              : <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color || PALETTE[i % PALETTE.length]} />
          ))}
        </ComposedChart>
      );
    }

    // bar (default)
    return (
      <BarChart data={data} margin={{
        top: 8, right: 16, left: 0, bottom: 0
      }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
        <XAxis dataKey="label" fontSize={12} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 60 : 30} />
        <YAxis fontSize={12} />
        <Tooltip formatter={fmt} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => <Cell key={entry.key || entry.label} fill={PALETTE[index % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    );
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
        {hasData ? (
          <ResponsiveContainer width="100%" height={height || 280}>
            {renderChart()}
          </ResponsiveContainer>
        ) : <EmptyState />}
      </CardContent>
    </Card>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['bar', 'pie', 'line', 'composed']),
  data: PropTypes.arrayOf(PropTypes.object),
  series: PropTypes.arrayOf(PropTypes.object),
  valueFormatter: PropTypes.func,
  height: PropTypes.number,
};

ChartCard.defaultProps = {
  type: 'bar',
  data: [],
  series: null,
  valueFormatter: null,
  height: 280,
};

export default ChartCard;
