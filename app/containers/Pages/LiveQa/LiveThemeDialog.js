import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Grid, IconButton, MenuItem, Slider, Stack, Switch, TextField, Typography,
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import UploadIcon from '@mui/icons-material/Upload';
import ClearIcon from '@mui/icons-material/Clear';
import { uploadBackground } from '../../../api/liveQaApi';
import {
  DEFAULT_LIVE_THEME, LIVE_THEME_PRESETS, resolveLiveTheme, buildLiveBackground, logoCornerStyle,
} from '../../../utils/liveQaTheme';

const ColorField = ({ label, value, onChange }) => (
  <Stack direction="row" alignItems="center" spacing={1}>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer',
      }}
    />
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
    />
  </Stack>
);

ColorField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const LiveThemeDialog = ({
  open, initialTheme, onClose, onSave, saving,
}) => {
  const [theme, setTheme] = useState(() => resolveLiveTheme(initialTheme));
  const [uploadingKey, setUploadingKey] = useState(''); // 'bgImageUrl' | 'logoUrl'
  const [uploadErro, setUploadErro] = useState('');

  // Reinicia o estado quando reabre com tema diferente
  React.useEffect(() => {
    if (open) setTheme(resolveLiveTheme(initialTheme));
  }, [open, initialTheme]);

  const set = (key, val) => setTheme((t) => ({ ...t, [key]: val }));

  const handleUpload = (targetKey) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;
    setUploadingKey(targetKey);
    setUploadErro('');
    try {
      const url = await uploadBackground(file);
      set(targetKey, url);
    } catch (err) {
      setUploadErro(err?.response?.data?.erro || 'Falha ao enviar imagem');
    } finally {
      setUploadingKey('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Personalizar tela ao vivo</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Controles */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Temas prontos</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {LIVE_THEME_PRESETS.map((p) => (
                <Chip key={p.name} label={p.name} onClick={() => setTheme(resolveLiveTheme(p.theme))} variant="outlined" />
              ))}
            </Stack>

            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={theme.useGradient} onChange={(e) => set('useGradient', e.target.checked)} disabled={!!theme.bgImageUrl} />}
                label="Fundo em degradê"
              />
              <ColorField label="Cor de fundo" value={theme.bgColor} onChange={(v) => set('bgColor', v)} />
              {theme.useGradient && !theme.bgImageUrl && (
                <ColorField label="Cor de fundo (degradê)" value={theme.bgColor2} onChange={(v) => set('bgColor2', v)} />
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Imagem de fundo (opcional)</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    disabled={uploadingKey === 'bgImageUrl'}
                    size="small"
                  >
                    {uploadingKey === 'bgImageUrl' ? 'Enviando...' : 'Enviar imagem'}
                    <input type="file" accept="image/*" hidden onChange={handleUpload('bgImageUrl')} />
                  </Button>
                  {theme.bgImageUrl && (
                    <IconButton size="small" color="error" onClick={() => set('bgImageUrl', '')} title="Remover imagem">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <TextField
                  placeholder="ou cole uma URL: https://..."
                  value={theme.bgImageUrl}
                  onChange={(e) => set('bgImageUrl', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  helperText={uploadErro || 'Se preenchida, substitui as cores de fundo. Máx. 8 MB.'}
                  error={!!uploadErro}
                />

                {/* Ajustes da imagem de fundo */}
                {theme.bgImageUrl && (
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField
                      select
                      size="small"
                      label="Ajuste da imagem"
                      value={theme.bgFit}
                      onChange={(e) => set('bgFit', e.target.value)}
                    >
                      <MenuItem value="cover">Cobrir (preenche a tela)</MenuItem>
                      <MenuItem value="contain">Conter (imagem inteira)</MenuItem>
                      <MenuItem value="repeat">Repetir (mosaico)</MenuItem>
                    </TextField>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Escurecimento do fundo ({Math.round(theme.overlayOpacity * 100)}%)
                      </Typography>
                      <Slider
                        value={theme.overlayOpacity}
                        onChange={(e, v) => set('overlayOpacity', v)}
                        min={0}
                        max={0.85}
                        step={0.05}
                        size="small"
                      />
                    </Box>
                  </Stack>
                )}
              </Box>

              <ColorField label="Cor do texto" value={theme.textColor} onChange={(v) => set('textColor', v)} />
              <ColorField label="Cor de destaque (curtidas/etiqueta)" value={theme.accentColor} onChange={(v) => set('accentColor', v)} />

              {/* Logo no canto */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Logo no canto (opcional)</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    disabled={uploadingKey === 'logoUrl'}
                    size="small"
                  >
                    {uploadingKey === 'logoUrl' ? 'Enviando...' : 'Enviar logo'}
                    <input type="file" accept="image/*" hidden onChange={handleUpload('logoUrl')} />
                  </Button>
                  {theme.logoUrl && (
                    <>
                      <Box component="img" src={theme.logoUrl} alt="logo" sx={{ height: 32, maxWidth: 100, objectFit: 'contain' }} />
                      <IconButton size="small" color="error" onClick={() => set('logoUrl', '')} title="Remover logo">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
                {theme.logoUrl && (
                  <TextField
                    select
                    size="small"
                    label="Posição do logo"
                    value={theme.logoPosition}
                    onChange={(e) => set('logoPosition', e.target.value)}
                    sx={{ mt: 1.5 }}
                    fullWidth
                  >
                    <MenuItem value="top-right">Canto superior direito</MenuItem>
                    <MenuItem value="top-left">Canto superior esquerdo</MenuItem>
                    <MenuItem value="bottom-right">Canto inferior direito</MenuItem>
                    <MenuItem value="bottom-left">Canto inferior esquerdo</MenuItem>
                  </TextField>
                )}
              </Box>
            </Stack>
          </Grid>

          {/* Pré-visualização */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Pré-visualização</Typography>
            <Box
              sx={{
                ...buildLiveBackground(theme),
                color: theme.textColor,
                borderRadius: 2,
                minHeight: 280,
                p: 3,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {theme.logoUrl && (
                <Box
                  component="img"
                  src={theme.logoUrl}
                  alt="logo"
                  sx={{
                    position: 'absolute',
                    maxHeight: 32,
                    maxWidth: 80,
                    objectFit: 'contain',
                    ...logoCornerStyle(theme.logoPosition, 10),
                  }}
                />
              )}
              <Chip
                icon={<LiveTvIcon sx={{ color: '#fff !important' }} />}
                label="Respondendo agora"
                sx={{ mb: 2, color: '#fff', bgcolor: theme.accentColor }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.2 }}>
                Qual é o propósito da igreja?
              </Typography>
              <Box sx={{
                mt: 2, display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9,
              }}
              >
                <Typography>Maria</Typography>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5, color: theme.accentColor
                }}>
                  <LiveTvIcon sx={{ display: 'none' }} />
                  <Typography fontWeight={700}>👍 12</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTheme({ ...DEFAULT_LIVE_THEME })}>Restaurar padrão</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(theme)} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

LiveThemeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  initialTheme: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

LiveThemeDialog.defaultProps = {
  initialTheme: null,
  saving: false,
};

export default LiveThemeDialog;
