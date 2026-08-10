import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  Chip,
  Button,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import { STATUS_OPTIONS, CARGO_OPTIONS, RECENT_MEMBER_DAYS } from './membersHelpers';

const MembersFiltersBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isLiderFilter,
  onToggleLiderFilter,
  cargoFilter,
  onCargoFilterChange,
  minCelulasFilter,
  onMinCelulasFilterChange,
  novosFilter,
  onToggleNovosFilter,
  onCreate
}) => (
  <Box
    sx={{
      p: 2,
      mb: 2,
      borderRadius: 2,
      border: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper'
    }}
  >
    {/* Linha 1: busca + ação principal */}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Pesquisar por nome ou e-mail"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          )
        }}
      />
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={onCreate}
        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        Cadastrar membro
      </Button>
    </Stack>

    {/* Linha 2: filtros */}
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      useFlexGap
      flexWrap="wrap"
      sx={{ mt: 1.5 }}
    >
      <TextField
        select
        size="small"
        label="Status"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">Todos</MenuItem>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Cargo"
        value={cargoFilter}
        onChange={(event) => onCargoFilterChange(event.target.value)}
        SelectProps={{
          multiple: true,
          displayEmpty: true,
          renderValue: (selected) => (selected.length
            ? CARGO_OPTIONS.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
            : 'Todos')
        }}
        sx={{ minWidth: 220 }}
      >
        {CARGO_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Nº de células (líder)"
        value={minCelulasFilter}
        onChange={(event) => onMinCelulasFilterChange(event.target.value)}
        sx={{ minWidth: 190 }}
      >
        <MenuItem value="">Qualquer</MenuItem>
        <MenuItem value="1">1 ou mais</MenuItem>
        <MenuItem value="2">2 ou mais</MenuItem>
        <MenuItem value="3">3 ou mais</MenuItem>
      </TextField>
      <Chip
        icon={<GroupsIcon />}
        label="Líder de célula"
        clickable
        color={isLiderFilter ? 'primary' : 'default'}
        variant={isLiderFilter ? 'filled' : 'outlined'}
        onClick={onToggleLiderFilter}
        sx={{
          height: 40, borderRadius: 1, fontWeight: 600, px: 0.5
        }}
      />
      <Chip
        icon={<FiberNewIcon />}
        label={`Novos (${RECENT_MEMBER_DAYS} dias)`}
        clickable
        color={novosFilter ? 'success' : 'default'}
        variant={novosFilter ? 'filled' : 'outlined'}
        onClick={onToggleNovosFilter}
        sx={{
          height: 40, borderRadius: 1, fontWeight: 600, px: 0.5
        }}
      />
    </Stack>
  </Box>
);

MembersFiltersBar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
  isLiderFilter: PropTypes.bool.isRequired,
  onToggleLiderFilter: PropTypes.func.isRequired,
  cargoFilter: PropTypes.arrayOf(PropTypes.string),
  onCargoFilterChange: PropTypes.func.isRequired,
  minCelulasFilter: PropTypes.string,
  onMinCelulasFilterChange: PropTypes.func.isRequired,
  novosFilter: PropTypes.bool,
  onToggleNovosFilter: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

MembersFiltersBar.defaultProps = {
  cargoFilter: [],
  minCelulasFilter: '',
  novosFilter: false,
};

export default MembersFiltersBar;
