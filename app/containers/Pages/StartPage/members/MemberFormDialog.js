import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  Typography,
  Box,
  Avatar,
  Button,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Chip
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import Webcam from 'react-webcam';
import {
  ESCOLARIDADE_OPTIONS,
  ESCOLAS_CONCLUIDAS_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  formatPhone,
  formatCPF
} from './membersHelpers';

const MemberFormDialog = ({
  open,
  onClose,
  isEditing,
  form,
  onFormChange,
  campi,
  spouseOptions,
  onSpouseChange,
  showWebcam,
  setShowWebcam,
  onFileUpload,
  onCapturePhoto,
  geoLoading,
  onCompleteAddressFromCep,
  submitting,
  onSave
}) => {
  const webcamRef = useRef(null);

  const capturePhoto = () => {
    if (webcamRef.current) onCapturePhoto(webcamRef.current);
  };

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle>{isEditing ? 'Editar membro' : 'Cadastrar membro'}</DialogTitle>
      <DialogContent>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="textSecondary">Foto</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper'
                }}
              >
                {showWebcam ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/webp"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    videoConstraints={{ facingMode: 'user' }}
                  />
                ) : (
                  <Avatar src={form.photoUrl || ''} alt={form.name || 'Membro'} sx={{ width: 96, height: 96 }} />
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<PhotoCameraIcon />} component="label">
                  Upload
                  <input type="file" hidden accept="image/*" onChange={onFileUpload} />
                </Button>
                {!showWebcam && (
                  <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => setShowWebcam(true)}>
                    Webcam
                  </Button>
                )}
                {showWebcam && (
                  <Button variant="contained" onClick={capturePhoto}>
                    Capturar
                  </Button>
                )}
                {showWebcam && (
                  <Button variant="text" onClick={() => setShowWebcam(false)}>
                    Fechar camera
                  </Button>
                )}
                {!!form.photoUrl && (
                  <Button variant="text" color="error" onClick={() => onFormChange('photoUrl', '')}>
                    Remover
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="textSecondary">Dados pessoais</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><TextField label="Nome" value={form.name} required onChange={(event) => onFormChange('name', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Nome preferido" value={form.preferredName} onChange={(event) => onFormChange('preferredName', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Email" type="email" value={form.email} onChange={(event) => onFormChange('email', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Telefone" value={form.telefone} onChange={(event) => onFormChange('telefone', formatPhone(event.target.value))} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="WhatsApp" value={form.whatsapp} onChange={(event) => onFormChange('whatsapp', formatPhone(event.target.value))} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="CPF" value={form.cpf} onChange={(event) => onFormChange('cpf', formatCPF(event.target.value))} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="RG" value={form.rg} onChange={(event) => onFormChange('rg', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Data de nascimento" type="date" value={form.data_nascimento} onChange={(event) => onFormChange('data_nascimento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>

              <Grid item xs={12} md={4}>
                <TextField select label="Genero" value={form.gender} onChange={(event) => onFormChange('gender', event.target.value)} fullWidth>
                  <MenuItem value="">Nao informado</MenuItem>
                  {GENDER_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select label="Estado civil" value={form.estado_civil} onChange={(event) => onFormChange('estado_civil', event.target.value)} fullWidth>
                  {ESTADO_CIVIL_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select label="Status" value={form.status} onChange={(event) => onFormChange('status', event.target.value)} fullWidth>
                  {STATUS_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Campus"
                  value={form.campusId}
                  onChange={(event) => onFormChange('campusId', event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {campi.map((campus) => (
                    <MenuItem key={campus.id} value={campus.id}>{campus.nome}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {form.estado_civil === 'Casado' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Conjuge (membro)"
                    value={form.spouseMemberId}
                    onChange={(event) => onSpouseChange(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {spouseOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>{option.fullName}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              {form.estado_civil === 'Casado' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Nome do conjuge"
                    value={form.nome_esposo}
                    onChange={(event) => onFormChange('nome_esposo', event.target.value)}
                    helperText="Preencha manualmente quando o conjuge nao e membro"
                    fullWidth
                  />
                </Grid>
              )}
              <Grid item xs={12} md={4}><TextField label="Profissao" value={form.profissao} onChange={(event) => onFormChange('profissao', event.target.value)} fullWidth /></Grid>

              <Grid item xs={12} md={4}>
                <TextField select label="Escolaridade" value={form.escolaridade} onChange={(event) => onFormChange('escolaridade', event.target.value)} fullWidth>
                  <MenuItem value="">Nao informado</MenuItem>
                  {ESCOLARIDADE_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={8}>
                <Autocomplete
                  multiple
                  options={ESCOLAS_CONCLUIDAS_OPTIONS}
                  value={form.escolas}
                  onChange={(_, value) => onFormChange('escolas', value)}
                  renderTags={(value, getTagProps) => value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
                  ))}
                  renderInput={(params) => <TextField {...params} label="Escolas concluidas" placeholder="Selecionar" />}
                />
              </Grid>

              <Grid item xs={12} md={4}><TextField label="Data de membresia" type="date" value={form.membershipDate} onChange={(event) => onFormChange('membershipDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Data de batismo" type="date" value={form.baptismDate} onChange={(event) => onFormChange('baptismDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Local de batismo" value={form.baptismPlace} onChange={(event) => onFormChange('baptismPlace', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Data de conversao" type="date" value={form.conversionDate} onChange={(event) => onFormChange('conversionDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>

              <Grid item xs={12} md={4}><TextField select label="Frequenta celula" value={form.frequenta_celula ? 'true' : 'false'} onChange={(event) => onFormChange('frequenta_celula', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
              <Grid item xs={12} md={4}><TextField select label="Batizado" value={form.batizado ? 'true' : 'false'} onChange={(event) => onFormChange('batizado', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
              <Grid item xs={12} md={4}><TextField select label="Encontro" value={form.encontro ? 'true' : 'false'} onChange={(event) => onFormChange('encontro', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
            </Grid>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="textSecondary">Endereco</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField label="CEP" value={form.cep} onChange={(event) => onFormChange('cep', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={3}>
                <Button variant="outlined" color="primary" onClick={onCompleteAddressFromCep} disabled={geoLoading} fullWidth sx={{ height: '100%' }}>
                  {geoLoading ? 'Buscando CEP...' : 'Completar pelo CEP'}
                </Button>
              </Grid>
              <Grid item xs={12} md={3}><TextField label="Bairro" value={form.bairro} onChange={(event) => onFormChange('bairro', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={3}><TextField label="Numero" value={form.numero} onChange={(event) => onFormChange('numero', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={6}><TextField label="Endereco" value={form.endereco} onChange={(event) => onFormChange('endereco', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={3}><TextField label="Complemento" value={form.complemento} onChange={(event) => onFormChange('complemento', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={3}><TextField label="Cidade" value={form.cidade} onChange={(event) => onFormChange('cidade', event.target.value)} fullWidth /></Grid>
              <Grid item xs={12} md={2}><TextField label="UF" value={form.estado} onChange={(event) => onFormChange('estado', event.target.value.toUpperCase())} inputProps={{ maxLength: 2 }} fullWidth /></Grid>
              <Grid item xs={12} md={4}><TextField label="Pais" value={form.country} onChange={(event) => onFormChange('country', event.target.value)} fullWidth /></Grid>
            </Grid>
          </Stack>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={onSave} disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MemberFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  form: PropTypes.shape({
    name: PropTypes.string,
    preferredName: PropTypes.string,
    email: PropTypes.string,
    telefone: PropTypes.string,
    whatsapp: PropTypes.string,
    cpf: PropTypes.string,
    rg: PropTypes.string,
    data_nascimento: PropTypes.string,
    gender: PropTypes.string,
    estado_civil: PropTypes.string,
    status: PropTypes.string,
    campusId: PropTypes.string,
    spouseMemberId: PropTypes.string,
    nome_esposo: PropTypes.string,
    profissao: PropTypes.string,
    escolaridade: PropTypes.string,
    escolas: PropTypes.arrayOf(PropTypes.string),
    membershipDate: PropTypes.string,
    baptismDate: PropTypes.string,
    baptismPlace: PropTypes.string,
    conversionDate: PropTypes.string,
    frequenta_celula: PropTypes.bool,
    batizado: PropTypes.bool,
    encontro: PropTypes.bool,
    photoUrl: PropTypes.string,
    cep: PropTypes.string,
    bairro: PropTypes.string,
    numero: PropTypes.string,
    endereco: PropTypes.string,
    complemento: PropTypes.string,
    cidade: PropTypes.string,
    estado: PropTypes.string,
    country: PropTypes.string,
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  campi: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    nome: PropTypes.string,
  })),
  spouseOptions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    fullName: PropTypes.string,
  })),
  onSpouseChange: PropTypes.func.isRequired,
  showWebcam: PropTypes.bool,
  setShowWebcam: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  onCapturePhoto: PropTypes.func.isRequired,
  geoLoading: PropTypes.bool,
  onCompleteAddressFromCep: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
};

MemberFormDialog.defaultProps = {
  isEditing: false,
  campi: [],
  spouseOptions: [],
  showWebcam: false,
  geoLoading: false,
  submitting: false,
};

export default MemberFormDialog;
