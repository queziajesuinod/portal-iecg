import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import {
  listarTemplates,
  enviarNotificacao,
  enviarNotificacaoParaGrupo,
  listarGrupos
} from '../../../../api/notificationsApi';
import { listarInscricoesPorEvento } from '../../../../api/eventsApi';
import { NOTIFICATION_VARIABLES, NOTIFICATION_VARIABLES_DYNAMIC } from './notificationVariables';

const normalizeBuyerPhone = (buyerData) => {
  if (!buyerData) return null;
  const phoneCandidates = [
    'whatsapp',
    'phone',
    'telefone',
    'celular',
    'buyer_phone',
    'buyerPhone',
    'buyer_whatsapp',
    'buyerPhoneNumber'
  ];
  const rawPhone = phoneCandidates
    .map((key) => buyerData[key])
    .find((value) => Boolean(value));
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const getBuyerDisplayName = (buyerData) => {
  return (
    buyerData?.buyer_name ||
    buyerData?.name ||
    buyerData?.nome ||
    buyerData?.nome_completo ||
    'Comprador'
  );
};

function NotificationSender({ eventId }) {
  const messageRef = useRef(null);
  const formatErrorMessage = (err) => {
    const data = err?.response?.data;
    const raw = data?.erro || data?.message || err?.message || 'Erro ao enviar notifica??o';
    if (Array.isArray(raw)) {
      return raw.join(' | ');
    }
    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw.message)) {
        return raw.message.join(' | ');
      }
      if (raw.message) return String(raw.message);
      return JSON.stringify(raw);
    }
    return String(raw);
  };

  const appendVariableToMessage = (variable) => {
    setFormData((prev) => {
      const current = prev.customMessage || '';
      const el = messageRef.current;
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = `${current.slice(0, start)}${variable}${current.slice(end)}`;
      const nextCursor = start + variable.length;
      setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.focus();
          messageRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
      return { ...prev, customMessage: next };
    });
  };

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  const [formData, setFormData] = useState({
    tipoEnvio: 'individual', // 'individual' ou 'grupo'
    registrationId: '',
    groupId: '',
    templateId: '',
    channel: 'whatsapp',
    customMessage: '',
    customSubject: '',
    customMediaUrl: ''
  });

  useEffect(() => {
    carregarDados();
  }, [eventId]);

  const registrationsWithPhone = registrations.filter((registration) =>
    Boolean(normalizeBuyerPhone(registration.buyerData))
  );

  const carregarDados = async () => {
    setRegistrationsLoading(true);
    setRegistrations([]);
    try {
      const [templatesData, gruposData] = await Promise.all([
        listarTemplates(eventId),
        listarGrupos(eventId)
      ]);
      setTemplates(templatesData);
      setGrupos(gruposData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }

    try {
      const registrationsResponse = await listarInscricoesPorEvento(eventId, {
        paymentStatus: 'confirmed',
        perPage: 100,
        page: 1
      });
      const fetchedRegistrations = registrationsResponse?.records ?? registrationsResponse ?? [];
      setRegistrations(fetchedRegistrations);
    } catch (error) {
      console.error('Erro ao carregar inscrições confirmadas:', error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (formData.tipoEnvio === 'individual' && !formData.registrationId) {
      setErro('Selecione uma inscrição confirmada com telefone válido');
      setSucesso('');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setSucesso('');

      if (formData.tipoEnvio === 'individual') {
        if (!formData.registrationId) {
          setErro('Informe o ID da inscrição');
          return;
        }

        await enviarNotificacao({
          eventId,
          registrationId: formData.registrationId,
          templateId: formData.templateId || null,
          channel: formData.channel,
          customMessage: formData.customMessage || null,
          customSubject: formData.customSubject || null,
          customMediaUrl: formData.customMediaUrl || null
        });

        setSucesso('Notificação enviada com sucesso!');
      } else {
        if (!formData.groupId) {
          setErro('Selecione um grupo');
          return;
        }

        const resultado = await enviarNotificacaoParaGrupo(formData.groupId, {
          eventId,
          templateId: formData.templateId || null,
          channel: formData.channel,
          customMessage: formData.customMessage || null,
          customSubject: formData.customSubject || null,
          customMediaUrl: formData.customMediaUrl || null
        });

        setSucesso(`Notificações enviadas: ${resultado.enviados}/${resultado.total}`);
        if (resultado.falhas > 0) {
          setErro(`${resultado.falhas} falhas no envio`);
        }
      }

      // Limpar formulário após 3 segundos
      setTimeout(() => {
        setFormData({
          ...formData,
          registrationId: '',
          customMessage: '',
          customSubject: '',
          customMediaUrl: ''
        });
        setSucesso('');
        setErro('');
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      setErro(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const templateSelecionado = templates.find(t => t.id === formData.templateId);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configurações de Envio
            </Typography>

            <Box mt={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Envio</InputLabel>
                <Select
                  value={formData.tipoEnvio}
                  onChange={(e) => setFormData({ ...formData, tipoEnvio: e.target.value })}
                >
                  <MenuItem value="individual">Individual</MenuItem>
                  <MenuItem value="grupo">Para Grupo</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {formData.tipoEnvio === 'individual' ? (
              <Box mt={2}>
                <FormControl fullWidth disabled={registrationsLoading}>
                  <InputLabel id="registration-select-label">Inscrição confirmada</InputLabel>
                  <Select
                    labelId="registration-select-label"
                    value={formData.registrationId}
                    label="Inscrição confirmada"
                    onChange={(event) =>
                      setFormData({ ...formData, registrationId: event.target.value })
                    }
                  >
                    <MenuItem value="">
                      <em>Selecione uma inscrição</em>
                    </MenuItem>
                    {registrationsWithPhone.map((registration) => (
                      <MenuItem key={registration.id} value={registration.id}>
                        <Box>
                          <Typography variant="body2">
                            {registration.orderCode} — {getBuyerDisplayName(registration.buyerData)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                            WhatsApp +{normalizeBuyerPhone(registration.buyerData)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {registrationsLoading && (
                    <FormHelperText>Carregando inscrições confirmadas...</FormHelperText>
                  )}
                  {!registrationsLoading && registrationsWithPhone.length === 0 && (
                    <FormHelperText>
                      Nenhuma inscrição confirmada com WhatsApp disponivel para este evento.
                    </FormHelperText>
                  )}
                </FormControl>
                {!registrationsLoading && (
                  <Typography variant="caption" color="textSecondary">
                    Somente inscritos confirmados com número de WhatsApp são listados aqui.
                  </Typography>
                )}
              </Box>
            ) : (
              <Box mt={2}>
                <FormControl fullWidth>
                  <InputLabel>Grupo</InputLabel>
                  <Select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  >
                    <MenuItem value="">Selecione um grupo</MenuItem>
                    {grupos.map((grupo) => (
                      <MenuItem key={grupo.id} value={grupo.id}>
                        {grupo.name} ({grupo.members?.length || 0} membros)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box mt={2}>
              <FormControl fullWidth>
                <InputLabel>Canal</InputLabel>
                <Select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box mt={2}>
              <FormControl fullWidth>
                <InputLabel>Template (opcional)</InputLabel>
                <Select
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                >
                  <MenuItem value="">Sem template</MenuItem>
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {!formData.templateId && (
              <>
                <Box mt={2}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Mensagem Personalizada"
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  placeholder="Digite a mensagem..."
                  inputRef={messageRef}
                />
                </Box>
                <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                  {NOTIFICATION_VARIABLES.map((variable) => (
                    <Chip
                      key={variable}
                      label={variable}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => appendVariableToMessage(variable)}
                    />
                  ))}
                  {NOTIFICATION_VARIABLES_DYNAMIC.map((variable) => (
                    <Chip
                      key={variable}
                      label={variable}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      clickable
                      onClick={() => appendVariableToMessage(variable.split(' ')[0])}
                    />
                  ))}
                </Box>

                <Box mt={2}>
                  <TextField
                    fullWidth
                    label="URL da Mídia (opcional)"
                    value={formData.customMediaUrl}
                    onChange={(e) => setFormData({ ...formData, customMediaUrl: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </Box>
              </>
            )}

            <Box mt={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                onClick={handleEnviar}
                disabled={
                  loading ||
                  (formData.tipoEnvio === 'individual' && !formData.registrationId)
                }
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {loading ? 'Enviando...' : 'Enviar Notificação'}
              </Button>
            </Box>

            {sucesso && (
              <Box mt={2}>
                <Alert severity="success">{sucesso}</Alert>
              </Box>
            )}

            {erro && (
              <Box mt={2}>
                <Alert severity="error">{erro}</Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Preview do Template */}
      {templateSelecionado && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preview do Template
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Nome
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {templateSelecionado.name}
                </Typography>

                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Tipo
                </Typography>
                <Chip
                  label={templateSelecionado.type}
                  size="small"
                  style={{ marginBottom: 16 }}
                />

                <Typography variant="body2" color="textSecondary">
                  Mensagem
                </Typography>
                <Box
                  p={2}
                  bgcolor="grey.100"
                  borderRadius={4}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {templateSelecionado.message}
                </Box>

                {templateSelecionado.mediaUrl && (
                  <>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                      Mídia
                    </Typography>
                    <Box mt={1}>
                      <Chip
                        icon={<ImageIcon />}
                        label="Imagem anexada"
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}

export default NotificationSender;
