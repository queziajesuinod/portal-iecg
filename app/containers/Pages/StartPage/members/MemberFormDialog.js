import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Box,
  Avatar,
  Button,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import ChurchIcon from '@mui/icons-material/Church';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Webcam from 'react-webcam';
import SectionCard from '../../../../components/Jornada/SectionCard';
import {
  ESCOLARIDADE_OPTIONS,
  ESCOLAS_CONCLUIDAS_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  formatPhone,
  formatCPF
} from './membersHelpers';

const stringToInitials = (text = '') => text
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || '?';

const stringToColor = (text = '') => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (text.charCodeAt(i) + hash * 31) % 360000;
  }
  return `hsl(${hash % 360}, 55%, 45%)`;
};

const BoolField = ({ label, value, onChange }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    <ToggleButtonGroup
      exclusive
      size="small"
      color="primary"
      value={value ? 'true' : 'false'}
      onChange={(_evt, v) => v !== null && onChange(v === 'true')}
      sx={{ '& .MuiToggleButton-root': { px: 2, borderRadius: 2 } }}
    >
      <ToggleButton value="true">Sim</ToggleButton>
      <ToggleButton value="false">Não</ToggleButton>
    </ToggleButtonGroup>
  </Box>
);

BoolField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.bool,
  onChange: PropTypes.func.isRequired
};

BoolField.defaultProps = { value: false };

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

  const selectedSpouse = useMemo(
    () => spouseOptions.find((opt) => opt.id === form.spouseMemberId) || null,
    [spouseOptions, form.spouseMemberId]
  );

  const initials = stringToInitials(form.preferredName || form.name);
  const avatarColor = stringToColor(form.name || 'membro');

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle sx={{ pr: 6 }}>
        {isEditing ? 'Editar membro' : 'Cadastrar membro'}
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          disabled={submitting}
          sx={{
            position: 'absolute', right: 8, top: 8, color: 'text.secondary'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {(submitting || geoLoading) && <LinearProgress />}
      <DialogContent dividers sx={{ bgcolor: 'action.hover' }}>
        <Stack spacing={2.5}>

          <SectionCard title="Foto" icon={<PhotoCameraIcon color="primary" fontSize="small" />}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="center">
              <Box
                sx={{
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: 2,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  flexShrink: 0
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
                ) : form.photoUrl ? (
                  <Avatar src={form.photoUrl} alt={form.name || 'Membro'} sx={{ width: 110, height: 110 }} />
                ) : (
                  <Avatar
                    sx={{
                      width: 110, height: 110, bgcolor: avatarColor, fontSize: '2rem', fontWeight: 700
                    }}
                  >
                    {initials}
                  </Avatar>
                )}
              </Box>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ flex: 1 }}
              >
                <Button variant="outlined" startIcon={<PhotoCameraIcon />} component="label" size="small">
                  Upload
                  <input type="file" hidden accept="image/*" onChange={onFileUpload} />
                </Button>
                {!showWebcam ? (
                  <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => setShowWebcam(true)} size="small">
                    Webcam
                  </Button>
                ) : (
                  <>
                    <Button variant="contained" onClick={capturePhoto} size="small">
                      Capturar
                    </Button>
                    <Button variant="text" onClick={() => setShowWebcam(false)} size="small">
                      Fechar câmera
                    </Button>
                  </>
                )}
                {!!form.photoUrl && !showWebcam && (
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => onFormChange('photoUrl', '')}
                    startIcon={<DeleteOutlineIcon />}
                    size="small"
                  >
                    Remover
                  </Button>
                )}
              </Stack>
            </Stack>
          </SectionCard>

          <SectionCard title="Dados pessoais" icon={<PersonIcon color="primary" fontSize="small" />}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Nome *"
                  value={form.name}
                  required
                  onChange={(event) => onFormChange('name', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Nome preferido"
                  value={form.preferredName}
                  onChange={(event) => onFormChange('preferredName', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(event) => onFormChange('email', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Telefone"
                  value={form.telefone}
                  onChange={(event) => onFormChange('telefone', formatPhone(event.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(event) => onFormChange('whatsapp', formatPhone(event.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="CPF"
                  value={form.cpf}
                  onChange={(event) => onFormChange('cpf', formatCPF(event.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="RG"
                  value={form.rg}
                  onChange={(event) => onFormChange('rg', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Data de nascimento"
                  type="date"
                  value={form.data_nascimento}
                  onChange={(event) => onFormChange('data_nascimento', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  select
                  label="Gênero"
                  value={form.gender}
                  onChange={(event) => onFormChange('gender', event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">Não informado</MenuItem>
                  {GENDER_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  select
                  label="Estado civil"
                  value={form.estado_civil}
                  onChange={(event) => onFormChange('estado_civil', event.target.value)}
                  fullWidth
                >
                  {ESTADO_CIVIL_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  select
                  label="Status"
                  value={form.status}
                  onChange={(event) => onFormChange('status', event.target.value)}
                  fullWidth
                >
                  {STATUS_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
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
                <>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      size="small"
                      options={spouseOptions}
                      getOptionLabel={(option) => option?.fullName || ''}
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      value={selectedSpouse}
                      onChange={(_evt, value) => onSpouseChange(value ? value.id : '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cônjuge (membro)"
                          helperText="Selecione o cônjuge se ele já é membro cadastrado"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      size="small"
                      label="Nome do cônjuge (texto livre)"
                      value={form.nome_esposo}
                      onChange={(event) => onFormChange('nome_esposo', event.target.value)}
                      helperText="Preencha manualmente se o cônjuge não é membro"
                      fullWidth
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Profissão"
                  value={form.profissao}
                  onChange={(event) => onFormChange('profissao', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  size="small"
                  select
                  label="Escolaridade"
                  value={form.escolaridade}
                  onChange={(event) => onFormChange('escolaridade', event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">Não informado</MenuItem>
                  {ESCOLARIDADE_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                </TextField>
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Endereço" icon={<HomeIcon color="primary" fontSize="small" />}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small"
                  label="CEP"
                  value={form.cep}
                  onChange={(event) => onFormChange('cep', event.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Completar endereço pelo CEP">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={onCompleteAddressFromCep}
                              disabled={geoLoading || !form.cep}
                              edge="end"
                            >
                              <SearchIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }}
                  helperText={geoLoading ? 'Buscando CEP…' : ' '}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={8}>
                <TextField
                  size="small"
                  label="Endereço"
                  value={form.endereco}
                  onChange={(event) => onFormChange('endereco', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  size="small"
                  label="Número"
                  value={form.numero}
                  onChange={(event) => onFormChange('numero', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={8} md={4}>
                <TextField
                  size="small"
                  label="Complemento"
                  value={form.complemento}
                  onChange={(event) => onFormChange('complemento', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  size="small"
                  label="Bairro"
                  value={form.bairro}
                  onChange={(event) => onFormChange('bairro', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={8} sm={4} md={2}>
                <TextField
                  size="small"
                  label="Cidade"
                  value={form.cidade}
                  onChange={(event) => onFormChange('cidade', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4} sm={2} md={1}>
                <TextField
                  size="small"
                  label="UF"
                  value={form.estado}
                  onChange={(event) => onFormChange('estado', event.target.value.toUpperCase())}
                  inputProps={{ maxLength: 2 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small"
                  label="País"
                  value={form.country}
                  onChange={(event) => onFormChange('country', event.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Caminhada espiritual" icon={<ChurchIcon color="primary" fontSize="small" />}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Data de membresia"
                  type="date"
                  value={form.membershipDate}
                  onChange={(event) => onFormChange('membershipDate', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Data de batismo"
                  type="date"
                  value={form.baptismDate}
                  onChange={(event) => onFormChange('baptismDate', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Local de batismo"
                  value={form.baptismPlace}
                  onChange={(event) => onFormChange('baptismPlace', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Data de conversão"
                  type="date"
                  value={form.conversionDate}
                  onChange={(event) => onFormChange('conversionDate', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <BoolField
                  label="Frequenta célula"
                  value={Boolean(form.frequenta_celula)}
                  onChange={(v) => onFormChange('frequenta_celula', v)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <BoolField
                  label="Batizado"
                  value={Boolean(form.batizado)}
                  onChange={(v) => onFormChange('batizado', v)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <BoolField
                  label="Encontro"
                  value={Boolean(form.encontro)}
                  onChange={(v) => onFormChange('encontro', v)}
                />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Formação" icon={<SchoolIcon color="primary" fontSize="small" />}>
            <Autocomplete
              multiple
              size="small"
              options={ESCOLAS_CONCLUIDAS_OPTIONS}
              value={form.escolas}
              onChange={(_, value) => onFormChange('escolas', value)}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip
                  variant="filled"
                  color="primary"
                  size="small"
                  label={option}
                  {...getTagProps({ index })}
                  key={`${option}-${index}`}
                />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Escolas concluídas"
                  placeholder="Selecione as escolas concluídas"
                  helperText="Marque todas que se aplicam"
                />
              )}
            />
          </SectionCard>

        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onSave}
          disabled={submitting}
          startIcon={<SaveRoundedIcon />}
          sx={{ minWidth: 180 }}
        >
          {submitting ? 'Salvando…' : (isEditing ? 'Atualizar' : 'Cadastrar')}
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
