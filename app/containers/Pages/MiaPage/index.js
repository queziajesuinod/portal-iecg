import React, { useState, useRef } from 'react';
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

const MiaPage = () => {
  const title = 'Cadastro do MIA';
  const description = 'Formulário para registrar informações';

  const [formData, setFormData] = useState({
    nome: '',
    data_nascimento: '',
    filhos: [],
    endereco: '',
    telefones: '',
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
    foto: ''
  });

  const [notification, setNotification] = useState('');
  const [showWebcam, setShowWebcam] = useState(false); // controla se a webcam está ativa
  const [capturedImage, setCapturedImage] = useState(''); // armazena a foto capturada
  const webcamRef = useRef(null);

  // Função para capturar a foto da webcam
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        setFormData({ ...formData, foto: imageSrc });
        setShowWebcam(false);
      }
    }
  };

  // Função para resetar a foto
  const resetPhoto = () => {
    setCapturedImage('');
    setFormData({ ...formData, foto: '' });
    setShowWebcam(true);
  };

  // Atualiza os valores do formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // Filhos
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

  // Remédios
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

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://portal.iecg.com.br/';
    
    try {
      const response = await fetch(`${API_URL}mia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setNotification('Cadastro realizado com sucesso!');
        console.log('Resposta da API:', data);

        // Resetando o formulário
        setFormData({
          nome: '',
          data_nascimento: '',
          filhos: [],
          endereco: '',
          telefones: '',
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
          foto: ''
        });
        setCapturedImage('');
        setShowWebcam(false);
      } else {
        setNotification(`Erro: ${data.message || 'Falha ao cadastrar'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Cadastro De Aposentados" desc="Preencha os dados abaixo">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* FOTO/WEBCAM */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Foto do Usuário
              </Typography>

              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showWebcam ? (
                  // Exibe a Webcam dentro do container circular
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : capturedImage ? (
                  // Exibe a foto capturada
                  <img
                    src={capturedImage}
                    alt="Foto Capturada"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  // Ícone de pessoa (quando não há webcam ativa nem foto)
                  <AccountCircleIcon style={{ width: '80%', height: '80%', color: '#ccc' }} />
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                {!showWebcam && !capturedImage && (
                  <Button variant="contained" color="secondary" onClick={() => setShowWebcam(true)}>
                    Habilitar Webcam
                  </Button>
                )}

                {showWebcam && (
                  <Button variant="contained" color="primary" onClick={capturePhoto} style={{ marginRight: 10 }}>
                    Capturar Foto
                  </Button>
                )}

                {capturedImage && (
                  <Button variant="contained" color="secondary" onClick={resetPhoto}>
                    Resetar Foto
                  </Button>
                )}
              </div>
            </Grid>

            {/* Nome Completo */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Data de Nascimento */}
            <Grid item xs={12} md={6}>
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

            {/* Endereço */}
            <Grid item xs={12}>
              <TextField fullWidth label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} />
            </Grid>

            {/* Telefones */}
            <Grid item xs={12}>
              <TextField fullWidth label="Telefones" name="telefones" value={formData.telefones} onChange={handleChange} />
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

            {/* Botão de Envio */}
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Cadastrar Aposentado
              </Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>

      {/* Notificação de sucesso/erro */}
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default MiaPage;
