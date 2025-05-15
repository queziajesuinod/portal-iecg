// Página completa de cadastro com todos os campos e suporte à edição, webcam e upload de foto
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton
} from '@mui/material';
import { AddCircle, RemoveCircle } from '@mui/icons-material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Webcam from 'react-webcam';
import { useLocation } from 'react-router-dom';
import { useHistory } from 'react-router-dom';


const MiaPage = () => {
  const title = 'Cadastro do MIA';
  const description = 'Formulário para registrar informações';
  const history = useHistory();
  const location = useLocation();
  const aposentadoEditando = location.state?.aposentado;
  const isEdit = Boolean(aposentadoEditando);
  const [aposentadoId, setAposentadoId] = useState(null);

  const formDataInicial = {
    id: '',
    name: '',
    email:'',
    data_nascimento: '',
    filhos: [],
    endereco: '',
    telefone: '',
    estado_civil: '',
    nome_esposo: '',
    profissao: '',
    rede_social: '',
    indicacao: '',
    frequenta_celula: false,
    batizado: false,
    encontro: false,
    escolas: '',
    patologia: '',
    plano_saude: '',
    hospital: '',
    remedios: [],
    habilidades: '',
    analfabeto: false,
    image: '',
    cpf:'',
    tipo_pessoa: ''
  };

  const [formData, setFormData] = useState(formDataInicial);
  const [notification, setNotification] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const webcamRef = useRef(null);

  useEffect(() => {
    if (isEdit && aposentadoEditando) {
      const userData = aposentadoEditando.user || {};
  
      const data = {
        ...formDataInicial,
        ...aposentadoEditando,
        ...userData,
        image: userData.image || aposentadoEditando.image || '',
        nome: userData.name || '',
        email: userData.email || '',
        cpf: userData.cpf || '',
        data_nascimento: userData.data_nascimento || '',
        endereco: userData.endereco || '',
        telefone: userData.telefone || '',
        estado_civil: userData.estado_civil || '',
        nome_esposo: userData.nome_esposo || '',
        profissao: userData.profissao || '',
        frequenta_celula: userData.frequenta_celula || false,
        batizado: userData.batizado || false,
        encontro: userData.encontro || false,
        escolas: userData.escolas || '',
      };
  
      setFormData(data);
      setCapturedImage(data.image);
      setAposentadoId(aposentadoEditando.id); // ← aqui é o pulo do gato
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

  const handleAddChild = () => {
    setFormData({ ...formData, filhos: [...formData.filhos, { nome: '', telefone: '' }] });
  };

  const handleRemoveChild = (index) => {
    const updatedFilhos = formData.filhos.filter((_, i) => i !== index);
    setFormData({ ...formData, filhos: updatedFilhos });
  };

  const handleChildChange = (index, e) => {
    const { name, value } = e.target;
    const updatedFilhos = [...formData.filhos];
    updatedFilhos[index][name] = value;
    setFormData({ ...formData, filhos: updatedFilhos });
  };

  const handleAddMedicine = () => {
    setFormData({ ...formData, remedios: [...formData.remedios, { nome: '', indicacao: '' }] });
  };

  const handleRemoveMedicine = (index) => {
    const updatedRemedios = formData.remedios.filter((_, i) => i !== index);
    setFormData({ ...formData, remedios: updatedRemedios });
  };

  const handleMedicineChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRemedios = [...formData.remedios];
    updatedRemedios[index][name] = value;
    setFormData({ ...formData, remedios: updatedRemedios });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/mia/${aposentadoId}` : `${API_URL}/mia`;

    // Remove o ID se for cadastro (para evitar erro do UUID)
    const dadosParaEnviar = { ...formData };
    if (!isEdit) {
      delete dadosParaEnviar.id;
    }

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
        }else
        {
            history.push({
      pathname: `/app/mia`,
      state: { pageTitle: 'Listagem Mia' }
    });
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
            {/* FOTO */}
            <Grid item xs={12}>
              <Typography variant="h6">Foto do Mia</Typography>
              <div style={{ width: 150, height: 150, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showWebcam ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Foto Capturada"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <AccountCircleIcon style={{ width: '80%', height: '80%', color: '#ccc' }} />
                )}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {!showWebcam && (
                  <Button variant="outlined" onClick={() => setShowWebcam(true)}>
                    Habilitar Webcam
                  </Button>
                )}
                {showWebcam && (
                  <Button variant="contained" color="primary" onClick={capturePhoto}>
                    Capturar Foto
                  </Button>
                )}
                <Button variant="outlined" component="label">
                  Upload da Foto
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>
                {capturedImage && (
                  <Button variant="outlined" color="error" onClick={resetPhoto}>
                    Remover Foto
                  </Button>
                )}
              </div>
            </Grid>


            {/* Nome Completo */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Data de Nascimento */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data de Nascimento"
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

             {/* CPF */}
             <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="CPF"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tipo de Pessoa"
                name="tipo_pessoa"
                select
                value={formData.tipo_pessoa}
                onChange={handleChange}
              >
                {['Coordenadora', 'Coordenador', 'Líder', 'Pastor', 'Pastora', 'Apoio', 'Idoso'].map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {/* Endereço */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required/>
            </Grid>
            {/* Telefones */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
            </Grid>

            {/* Estado Civil */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Estado Civil"
                name="estado_civil"
                value={formData.estado_civil}
                onChange={handleChange}
              >
                <MenuItem value="Solteiro">Solteiro</MenuItem>
                <MenuItem value="Casado">Casado</MenuItem>
                <MenuItem value="Viúvo">Viúvo</MenuItem>
                <MenuItem value="Divorciado">Divorciado</MenuItem>
              </TextField>
            </Grid>

            {/* Nome do Esposo(a) (aparece se casado) */}
            {formData.estado_civil === 'Casado' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome do Esposo(a)"
                  name="nome_esposo"
                  value={formData.nome_esposo}
                  onChange={handleChange}
                />
              </Grid>
            )}

            {/* Profissão */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Profissão"
                name="profissao"
                value={formData.profissao}
                onChange={handleChange}
              />
            </Grid>

            {/* Rede Social */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Rede Social"
                name="rede_social"
                value={formData.rede_social}
                onChange={handleChange}
              />
            </Grid>

            {/* Indicação */}
            <Grid item xs={12}>
              <TextField fullWidth label="Indicação" name="indicacao" value={formData.indicacao} onChange={handleChange} />
            </Grid>

            {/* Checkboxes */}
            <Grid item xs={12} container spacing={2}>
              <Grid item>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.frequenta_celula}
                      onChange={handleChange}
                      name="frequenta_celula"
                    />
                  }
                  label="Frequenta Célula?"
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Checkbox checked={formData.batizado} onChange={handleChange} name="batizado" />}
                  label="Já foi batizado?"
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Checkbox checked={formData.encontro} onChange={handleChange} name="encontro" />}
                  label="Participou de um Encontro?"
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Checkbox checked={formData.analfabeto} onChange={handleChange} name="analfabeto" />}
                  label="É analfabeto?"
                />
              </Grid>
            </Grid>

            {/* Escolas */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Escolas (separados por vírgula)"
                name="escolas"
                value={formData.escolas}
                onChange={handleChange}
              />
            </Grid>

            {/* Habilidades */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Habilidades (separados por vírgula)"
                name="habilidades"
                value={formData.habilidades}
                onChange={handleChange}
              />
            </Grid>

            {/* Patologia */}
            <Grid item xs={12}>
              <TextField fullWidth label="Patologia" name="patologia" value={formData.patologia} onChange={handleChange} />
            </Grid>

            {/* Plano de Saúde */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plano de Saúde"
                name="plano_saude"
                value={formData.plano_saude}
                onChange={handleChange}
              />
            </Grid>

            {/* Hospital de Referência */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hospital de Referência"
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
              />
            </Grid>

            {/* Filhos */}
            <Grid item xs={12}>
              <Typography variant="h6">Filhos</Typography>
              <Button onClick={handleAddChild} variant="contained" color="primary" startIcon={<AddCircle />}>
                Adicionar Filho(a)
              </Button>
              {formData.filhos.map((filho, index) => (
                <Grid container spacing={2} alignItems="center" key={index} style={{ marginTop: 8 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label="Nome do Filho(a)"
                      name="nome"
                      value={filho.nome}
                      onChange={(e) => handleChildChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      name="telefone"
                      value={filho.telefone}
                      onChange={(e) => handleChildChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton onClick={() => handleRemoveChild(index)} color="error">
                      <RemoveCircle fontSize="large" />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Grid>

            {/* Remédios */}
            <Grid item xs={12}>
              <Typography variant="h6">Remédios</Typography>
              <Button onClick={handleAddMedicine} variant="contained" color="primary" startIcon={<AddCircle />}>
                Adicionar Remédio
              </Button>
              {formData.remedios.map((medicine, index) => (
                <Grid container spacing={2} alignItems="center" key={index} style={{ marginTop: 8 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label="Nome do Remédio"
                      name="nome"
                      value={medicine.nome}
                      onChange={(e) => handleMedicineChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label="Indicação"
                      name="indicacao"
                      value={medicine.indicacao}
                      onChange={(e) => handleMedicineChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton onClick={() => handleRemoveMedicine(index)} color="error">
                      <RemoveCircle fontSize="large" />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Grid>

            {/* Botão de envio */}
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" fullWidth>
                {isEdit ? 'Atualizar Mia' : 'Cadastrar Mia'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default MiaPage;