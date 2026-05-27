import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Link,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  fetchChannelCookiesStatus,
  saveChannelCookies,
  deleteChannelCookies,
} from '../../../utils/youtubeClient';

const ChannelCookiesDialog = ({ open, channel, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!open || !channel) return;
    setContent('');
    setFeedback(null);
    setLoading(true);
    fetchChannelCookiesStatus(channel.id)
      .then(setStatus)
      .catch((err) => setFeedback({ severity: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }, [open, channel?.id]);

  const handleSave = async () => {
    if (!content.trim()) {
      setFeedback({ severity: 'warning', message: 'Cole o conteúdo dos cookies.' });
      return;
    }
    try {
      setSaving(true);
      const updated = await saveChannelCookies(channel.id, content);
      setStatus(updated);
      setContent('');
      setFeedback({
        severity: 'success',
        message: `Cookies salvos: ${updated.cookieCount} entradas, domínios: ${updated.domains.join(', ')}`,
      });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remover os cookies deste canal? O yt-dlp voltará a usar o método padrão.')) return;
    try {
      setSaving(true);
      await deleteChannelCookies(channel.id);
      setStatus({ configured: false, updatedAt: null });
      setFeedback({ severity: 'success', message: 'Cookies removidos.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Cookies do yt-dlp — {channel?.channelName}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Use uma conta Google dedicada ao bot</strong>, NÃO a conta pessoal do dono do canal.
          Esses cookies dão acesso de leitura ao YouTube da conta — use uma conta criada só para isso.
        </Alert>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && status?.configured && (
          <Alert severity="success" sx={{ mb: 2 }} action={(
            <Button color="inherit" size="small" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={saving}>
              Remover
            </Button>
          )}
          >
            <strong>Cookies configurados</strong>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" component="div">
                Atualizado em: {new Date(status.updatedAt).toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="caption" component="div">
                {status.cookieCount} entradas · domínios: {(status.domains || []).join(', ')}
              </Typography>
            </Box>
          </Alert>
        )}

        {!loading && !status?.configured && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sem cookies configurados. O yt-dlp vai tentar baixar sem autenticação (pode falhar com erro &quot;Sign in to confirm you&apos;re not a bot&quot;).
          </Alert>
        )}

        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Como obter os cookies (passo a passo):
        </Typography>
        <Box component="ol" sx={{ pl: 3, mb: 2 }}>
          <li>
            <Typography variant="body2">
              Crie uma conta Google dedicada (ex: <code>iecg-bot@gmail.com</code>).
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Em uma janela <strong>anônima</strong> do Chrome, faça login no YouTube com essa conta.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Instale a extensão{' '}
              <Link href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener">
                Get cookies.txt LOCALLY
              </Link>
              {' '}(roda 100% local, não envia nada).
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Em <code>youtube.com</code>, clique no ícone da extensão → <strong>Export As → Netscape</strong>.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Abra o arquivo <code>cookies.txt</code> baixado, copie todo o conteúdo e cole abaixo.
            </Typography>
          </li>
        </Box>

        <TextField
          label="Conteúdo dos cookies (JSON ou Netscape)"
          multiline
          fullWidth
          minRows={8}
          maxRows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1234567890\tVISITOR_INFO1_LIVE\t...\n\n--- OU ---\n\n[{"domain":".youtube.com","name":"VISITOR_INFO1_LIVE","value":"..."}]'}
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Aceita formato Netscape (cookies.txt) ou JSON (extensões tipo &quot;EditThisCookie&quot;). É detectado automaticamente.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip size="small" label="Armazenado criptografado (AES-256-GCM)" />
          <Chip size="small" label="Usado só na hora de baixar áudio" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Fechar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !content.trim()}
        >
          {saving ? 'Salvando...' : 'Salvar cookies'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ChannelCookiesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  channel: PropTypes.shape({
    id: PropTypes.string,
    channelName: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};

ChannelCookiesDialog.defaultProps = {
  channel: null,
};

export default ChannelCookiesDialog;
