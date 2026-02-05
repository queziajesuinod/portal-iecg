import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Chip
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Send as SendIcon,
  Image as ImageIcon
} from '@material-ui/icons';
import {
  listarTemplates,
  enviarNotificacao,
  enviarNotificacaoParaGrupo,
  listarGrupos
} from '../../../../api/notificationsApi';

function NotificationSender({ eventId }) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [grupos, setGrupos] = useState([]);
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

  const carregarDados = async () => {
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
  };

  const handleEnviar = async () => {
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
      setErro(error.response?.data?.erro || 'Erro ao enviar notificação');
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
                <TextField
                  fullWidth
                  label="ID da Inscrição"
                  value={formData.registrationId}
                  onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
                  placeholder="UUID da inscrição"
                />
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
                  <MenuItem value="sms">SMS</MenuItem>
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
                  helperText="Variáveis: {{nome}}, {{evento}}, {{data}}, {{codigo}}"
                />
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
                disabled={loading}
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
