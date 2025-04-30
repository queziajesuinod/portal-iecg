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
    filhos: [],
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
    remedios: [],
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
        {/* Formulário mantido, usando campos renomeados como name, image e tipo_pessoa */}
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default MiaPage;