// Página completa de cadastro com todos os campos e suporte à edição, webcam e upload de foto
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import Webcam from 'react-webcam';
import { useLocation, useHistory } from 'react-router-dom';

const MiaPage = () => {
  const title = 'Cadastro do MIA';
  const description = 'Formulário para registrar informações';
  const history = useHistory();
  const location = useLocation();
  const aposentadoEditando = location.state?.aposentado;
  const isEdit = Boolean(aposentadoEditando);

  const formDataInicial = {
    id: '',
    name: '',
    data_nascimento: '',
    filhos: [''],
    endereco: '',
    telefones: '',
    estado_civil: '',
    nome_esposo: '',
    profissao: '',
    indicacao: '',
    frequenta_celula: false,
    batizado: false,
    encontro: false,
    escolas: '',
    patologia: '',
    plano_saude: '',
    hospital: '',
    remedios: [''],
    habilidades: '',
    analfabeto: false,
    image: '',
    cpf: '',
    tipo_pessoa: ''
  };

  const [formData, setFormData] = useState(formDataInicial);
  const [notification, setNotification] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const webcamRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      const data = {
        ...formDataInicial,
        ...aposentadoEditando,
        ...aposentadoEditando.user,
        image: aposentadoEditando.user?.image || ''
      };
      setFormData(data);
      setCapturedImage(data.image);
    }
  }, [isEdit, aposentadoEditando]);

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        setFormData({ ...formData, image: imageSrc });
        setShowWebcam(false);
      }
    }
  };

  const resetPhoto = () => {
    setCapturedImage('');
    setFormData({ ...formData, image: '' });
    setShowWebcam(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/mia/${formData.id}` : `${API_URL}/mia`;

    const dadosParaEnviar = { ...formData };
    if (!isEdit) delete dadosParaEnviar.id;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      const data = await response.json();

      if (response.ok) {
        setNotification(isEdit ? 'Atualização realizada com sucesso!' : 'Cadastro realizado com sucesso!');
        if (!isEdit) {
          setFormData({ ...formDataInicial });
          setCapturedImage('');
          setShowWebcam(false);
        } else {
          history.push('/app/mia');
        }
      } else {
        setNotification(`Erro: ${data.erro || data.message || 'Falha ao processar'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'Editar Mia' : title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title={isEdit ? 'Editar Mia' : 'Cadastro Mia'} desc="Preencha os dados abaixo">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nome Completo" name="name" value={formData.name} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Data de Nascimento" type="date" name="data_nascimento" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Tipo de Pessoa" name="tipo_pessoa" select value={formData.tipo_pessoa} onChange={handleChange}>
                {[ 'Coordenadora', 'Coordenador', 'Líder', 'Pastor', 'Pastora', 'Apoio', 'Idoso' ].map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Telefones" name="telefones" value={formData.telefones} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Estado Civil" name="estado_civil" value={formData.estado_civil} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Nome do Cônjuge" name="nome_esposo" value={formData.nome_esposo} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Profissão" name="profissao" value={formData.profissao} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Indicação" name="indicacao" value={formData.indicacao} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Escolas" name="escolas" value={formData.escolas} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Patologia" name="patologia" value={formData.patologia} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Plano de Saúde" name="plano_saude" value={formData.plano_saude} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Hospital Preferencial" name="hospital" value={formData.hospital} onChange={handleChange} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Habilidades" name="habilidades" value={formData.habilidades} onChange={handleChange} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.analfabeto} onChange={handleChange} name="analfabeto" />} label="É analfabeto?" /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.frequenta_celula} onChange={handleChange} name="frequenta_celula" />} label="Frequenta célula" /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.batizado} onChange={handleChange} name="batizado" />} label="É batizado" /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.encontro} onChange={handleChange} name="encontro" />} label="Já participou de Encontro?" /></Grid>

            {/* Lista de filhos */}
            <Grid item xs={12}>
              <Typography variant="h6">Filhos</Typography>
              {formData.filhos.map((filho, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  <TextField fullWidth label={`Filho ${index + 1}`} value={filho} onChange={(e) => {
                    const novos = [...formData.filhos]; novos[index] = e.target.value;
                    setFormData({ ...formData, filhos: novos });
                  }} />
                  <IconButton onClick={() => {
                    const novos = [...formData.filhos]; novos.splice(index, 1);
                    setFormData({ ...formData, filhos: novos });
                  }}><RemoveCircle /></IconButton>
                </Box>
              ))}
              <Button startIcon={<AddCircle />} onClick={() => setFormData({ ...formData, filhos: [...formData.filhos, ''] })} variant="outlined">Adicionar Filho</Button>
            </Grid>

            {/* Lista de remédios */}
            <Grid item xs={12}>
              <Typography variant="h6">Remédios de uso contínuo</Typography>
              {formData.remedios.map((remedio, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  <TextField fullWidth label={`Remédio ${index + 1}`} value={remedio} onChange={(e) => {
                    const novos = [...formData.remedios]; novos[index] = e.target.value;
                    setFormData({ ...formData, remedios: novos });
                  }} />
                  <IconButton onClick={() => {
                    const novos = [...formData.remedios]; novos.splice(index, 1);
                    setFormData({ ...formData, remedios: novos });
                  }}><RemoveCircle /></IconButton>
                </Box>
              ))}
              <Button startIcon={<AddCircle />} onClick={() => setFormData({ ...formData, remedios: [...formData.remedios, ''] })} variant="outlined">Adicionar Remédio</Button>
            </Grid>
          </Grid>

          <Box mt={3}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              {isEdit ? 'Atualizar Mia' : 'Cadastrar Mia'}
            </Button>
          </Box>
        </form>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default MiaPage;