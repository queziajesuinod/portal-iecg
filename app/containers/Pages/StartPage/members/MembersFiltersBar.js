import React from 'react';
import PropTypes from 'prop-types';
import {
  Stack,
  TextField,
  MenuItem,
  Chip,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { STATUS_OPTIONS } from './membersHelpers';

const MembersFiltersBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isLiderFilter,
  onToggleLiderFilter,
  onCreate
}) => (
  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={2} spacing={2}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1 }}>
      <TextField
        fullWidth
        label="Pesquisar por nome ou e-mail"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <TextField
        select
        label="Status"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        sx={{ minWidth: { xs: '100%', md: 220 } }}
      >
        <MenuItem value="">Todos</MenuItem>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
      <Chip
        label="Lider de celula"
        clickable
        color={isLiderFilter ? 'primary' : 'default'}
        variant={isLiderFilter ? 'filled' : 'outlined'}
        onClick={onToggleLiderFilter}
        sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
      />
    </Stack>
    <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={onCreate}>
      Cadastrar membro
    </Button>
  </Stack>
);

MembersFiltersBar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
  isLiderFilter: PropTypes.bool.isRequired,
  onToggleLiderFilter: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

export default MembersFiltersBar;
