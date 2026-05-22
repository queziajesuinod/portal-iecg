import React from 'react';
import PropTypes from 'prop-types';
import {
  Stack,
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Grid,
  Button
} from '@mui/material';

const DuplicatesPanel = ({
  suggestions,
  loading,
  onReload,
  onMerge,
  onDismiss,
  mergingPairKey,
  dismissingPairKey
}) => (
  <>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={2} spacing={2}>
      <Box>
        <Typography variant="h6">Possiveis dados duplicados</Typography>
        <Typography variant="body2" color="textSecondary">
          Comparacao por nome parecido, e-mail, documento e telefone. A fusao mantem o cadastro mais antigo.
        </Typography>
      </Box>
      <Button variant="outlined" onClick={onReload} disabled={loading}>
        {loading ? 'Analisando duplicados...' : 'Atualizar duplicados'}
      </Button>
    </Stack>

    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1.5}
        mb={suggestions.length ? 2 : 0}
      >
        <Typography variant="body2" color="textSecondary">
          Revise cada sugestao antes de fundir. Se desconsiderar, esse par nao volta a aparecer.
        </Typography>
        <Chip
          color={suggestions.length ? 'warning' : 'success'}
          label={suggestions.length ? `${suggestions.length} sugestoes` : 'Nenhuma sugestao'}
        />
      </Stack>

      {loading && (
        <Box py={2} display="flex" justifyContent="center">
          <CircularProgress size={22} />
        </Box>
      )}

      {!loading && !suggestions.length && (
        <Typography color="textSecondary">Nenhum possivel duplicado encontrado no momento.</Typography>
      )}

      {!loading && suggestions.length > 0 && (
        <Stack spacing={1.5}>
          {suggestions.map((suggestion) => {
            const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
            const merging = mergingPairKey === pairKey;
            const dismissing = dismissingPairKey === pairKey;
            return (
              <Paper key={pairKey} variant="outlined" sx={{ p: 1.5 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="textSecondary">Manter cadastro antigo</Typography>
                    <Stack direction="row" spacing={1.25} alignItems="center" mt={0.5}>
                      <Avatar src={suggestion.olderMember.photoUrl || ''} alt={suggestion.olderMember.fullName} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{suggestion.olderMember.fullName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {suggestion.olderMember.email || suggestion.olderMember.phone || suggestion.olderMember.whatsapp || '-'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="textSecondary">Excluir cadastro mais recente</Typography>
                    <Stack direction="row" spacing={1.25} alignItems="center" mt={0.5}>
                      <Avatar src={suggestion.newerMember.photoUrl || ''} alt={suggestion.newerMember.fullName} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{suggestion.newerMember.fullName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {suggestion.newerMember.email || suggestion.newerMember.phone || suggestion.newerMember.whatsapp || '-'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {suggestion.reasons.map((reason) => (
                        <Chip key={`${pairKey}-${reason.type}`} size="small" variant="outlined" label={reason.label} />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Stack spacing={1}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        onClick={() => onMerge(suggestion)}
                        disabled={merging || dismissing}
                      >
                        {merging ? 'Fundindo...' : 'Fundir'}
                      </Button>
                      <Button
                        fullWidth
                        variant="text"
                        color="inherit"
                        onClick={() => onDismiss(suggestion)}
                        disabled={merging || dismissing}
                      >
                        {dismissing ? 'Desconsiderando...' : 'Desconsiderar'}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Paper>
  </>
);

DuplicatesPanel.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onReload: PropTypes.func.isRequired,
  onMerge: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  mergingPairKey: PropTypes.string,
  dismissingPairKey: PropTypes.string,
};

DuplicatesPanel.defaultProps = {
  loading: false,
  mergingPairKey: '',
  dismissingPairKey: '',
};

export default DuplicatesPanel;
