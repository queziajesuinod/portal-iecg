import React from 'react';
import PropTypes from 'prop-types';
import {
  Box, Grid, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

/**
 * Skeleton para páginas com tabela (o tipo mais comum no portal).
 * Mostra barra de ferramentas + tabela com linhas animadas.
 */
export function TableSkeleton({ rows = 6, cols = 4, showToolbar = true }) {
  return (
    <Box>
      {showToolbar && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Skeleton variant="text" width={180} height={36} />
          <Box display="flex" gap={1}>
            <Skeleton variant="rounded" width={100} height={34} />
            <Skeleton variant="rounded" width={120} height={34} />
          </Box>
        </Box>
      )}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {Array.from({ length: cols }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton variant="text" width={i === 0 ? '60%' : '80%'} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((rowPlaceholder, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: cols }).map((colPlaceholder, colIdx) => (
                  <TableCell key={colIdx}>
                    <Skeleton
                      variant="text"
                      width={colIdx === 0 ? `${55 + (rowIdx % 3) * 15}%` : `${40 + (colIdx * 10)}%`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
  showToolbar: PropTypes.bool
};

/**
 * Skeleton para páginas com grade de cards.
 */
export function CardsSkeleton({
  count = 6, xs = 12, sm = 6, md = 4, height = 140, showToolbar = true
}) {
  return (
    <Box>
      {showToolbar && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Skeleton variant="text" width={200} height={36} />
          <Skeleton variant="rounded" width={120} height={34} />
        </Box>
      )}
      <Grid container spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Grid item xs={xs} sm={sm} md={md} key={i}>
            <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

CardsSkeleton.propTypes = {
  count: PropTypes.number,
  xs: PropTypes.number,
  sm: PropTypes.number,
  md: PropTypes.number,
  height: PropTypes.number,
  showToolbar: PropTypes.bool
};

/**
 * Skeleton para página de detalhe / formulário.
 */
export function DetailSkeleton({ fields = 6 }) {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Skeleton variant="text" width={240} height={40} />
      <Skeleton variant="rounded" height={56} />
      {Array.from({ length: fields }).map((_, i) => (
        <Box key={i} display="flex" gap={2}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          {i % 2 === 0 && <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />}
        </Box>
      ))}
      <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
        <Skeleton variant="rounded" width={90} height={36} />
        <Skeleton variant="rounded" width={110} height={36} />
      </Box>
    </Box>
  );
}

DetailSkeleton.propTypes = { fields: PropTypes.number };

/**
 * Skeleton genérico de linhas de texto (lista simples).
 */
export function ListSkeleton({ rows = 5, showToolbar = true }) {
  return (
    <Box>
      {showToolbar && (
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Skeleton variant="text" width={160} height={32} />
          <Skeleton variant="rounded" width={100} height={32} />
        </Box>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} display="flex" alignItems="center" gap={2} py={1} borderBottom="1px solid" borderColor="divider">
          <Skeleton variant="circular" width={36} height={36} />
          <Box flex={1}>
            <Skeleton variant="text" width={`${50 + (i % 4) * 10}%`} />
            <Skeleton variant="text" width={`${30 + (i % 3) * 8}%`} height={14} />
          </Box>
          <Skeleton variant="rounded" width={70} height={24} />
        </Box>
      ))}
    </Box>
  );
}

ListSkeleton.propTypes = {
  rows: PropTypes.number,
  showToolbar: PropTypes.bool
};
