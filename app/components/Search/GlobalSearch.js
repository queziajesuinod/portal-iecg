import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
import { useHistory } from 'react-router-dom';
import {
  Box, Chip, CircularProgress, ClickAwayListener,
  Divider, InputBase, Paper, Popper, Typography
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const CATEGORIES = [
  {
    key: 'members',
    label: 'Membros',
    icon: <PeopleAltIcon sx={{ fontSize: 14 }} />
  },
  {
    key: 'events',
    label: 'Eventos',
    icon: <EventIcon sx={{ fontSize: 14 }} />
  },
  {
    key: 'registrations',
    label: 'Inscrições',
    icon: <ConfirmationNumberIcon sx={{ fontSize: 14 }} />
  }
];

const BADGE_COLOR = {
  // membros
  MEMBRO: 'success',
  VISITANTE: 'default',
  INATIVO: 'error',
  CONGREGADO: 'info',
  // pagamentos
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  denied: 'error',
  authorized: 'info',
  partial: 'warning',
  refunded: 'default',
  // eventos
  Ativo: 'success',
  Encerrado: 'default'
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const anchorRef = useRef(null);
  const debounceRef = useRef(null);
  const history = useHistory();

  const token = () => localStorage.getItem('token');

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(true);
        setFocusedIdx(-1);
      }
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(q), 350);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
    setResults(null);
    setFocusedIdx(-1);
  };

  const handleSelect = (link) => {
    close();
    history.push(link);
  };

  // Flatten items para navegação por teclado
  const flatItems = results
    ? CATEGORIES.flatMap(({ key }) => results[key] || [])
    : [];

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      handleSelect(flatItems[focusedIdx].link);
    }
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const hasResults = results && CATEGORIES.some(({ key }) => (results[key] || []).length > 0);
  const isEmpty = results && !hasResults;

  let flatIdx = 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: '100%' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, width: '100%'
        }}>
          {loading && <CircularProgress size={14} sx={{ color: 'inherit', flexShrink: 0 }} />}
          <InputBase
            placeholder="Buscar membro, evento, inscrição…"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results) setOpen(true); }}
            onKeyDown={handleKeyDown}
            fullWidth
            sx={{ color: 'inherit', fontSize: '0.875rem', '& input::placeholder': { opacity: 0.7 } }}
          />
        </Box>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth || 400, minWidth: 340 }}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.5, maxHeight: 460, overflow: 'auto', borderRadius: 2
            }}
          >
            {isEmpty && (
              <Box px={2} py={1.5}>
                <Typography variant="body2" color="textSecondary">
                  Nenhum resultado para &ldquo;{query}&rdquo;
                </Typography>
              </Box>
            )}

            {hasResults && CATEGORIES.map(({ key, label, icon }) => {
              const items = results[key] || [];
              if (!items.length) return null;
              return (
                <Box key={key}>
                  {/* Cabeçalho da categoria */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={0.75}
                    px={2}
                    py={0.75}
                    sx={{ bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="textSecondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
                    >
                      {label}
                    </Typography>
                  </Box>

                  {items.map((item) => {
                    const currentIdx = flatIdx;
                    flatIdx += 1;
                    const isFocused = focusedIdx === currentIdx;
                    return (
                      <Box
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        onMouseEnter={() => setFocusedIdx(currentIdx)}
                        sx={{
                          px: 2,
                          py: 1,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          bgcolor: isFocused ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {item.label}
                          </Typography>
                          {item.sub && (
                            <Typography variant="caption" color="textSecondary" noWrap display="block">
                              {item.sub}
                            </Typography>
                          )}
                        </Box>
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            color={BADGE_COLOR[item.badge] || 'default'}
                            sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0 }}
                          />
                        )}
                      </Box>
                    );
                  })}

                  <Divider />
                </Box>
              );
            })}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
