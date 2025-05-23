import React, { useEffect, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import { Helmet } from "react-helmet";
import imageCompression from 'browser-image-compression';
import dummyContents from 'dan-api/dummy/dummyContents'; // Importação correta
import { PapperBlock, Notification } from 'dan-components';
import {
  Paper,
  Typography,
  Avatar,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Button
} from "@mui/material";
import {
  Email,
  AccountCircle,
  VerifiedUser,
  CalendarToday,
  CameraAlt,
  Delete as DeleteIcon
} from "@mui/icons-material";
import Webcam from "react-webcam";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const webcamRef = useRef(null);
  const history = useHistory();

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const userStorage = JSON.parse(localStorage.getItem("user"));
  const id = userStorage?.id;
  const token = localStorage.getItem('token');
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Erro ao carregar os detalhes do usuário");
      const data = await response.json();
      setUser(data);
      setCapturedImage(data.image || '');
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
    }
  };

  const formatCPF = (cpf) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  };
  

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.3, // máximo 300KB
      maxWidthOrHeight: 500, // redimensiona se passar disso
      useWebWorker: true
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
      console.error("Erro ao comprimir imagem:", error);
      return null;
    }
  };


  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        updateImage(imageSrc);
        setCapturedImage(imageSrc);
        setShowWebcam(false);
      }
    }
  };

  const resetPhoto = () => {
    updateImage('');
    setCapturedImage('');
    setShowWebcam(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedBase64 = await compressImage(file);
      if (compressedBase64) {
        setCapturedImage(compressedBase64);
        updateImage(compressedBase64);
      }
    }
  };


  const updateImage = async (base64Image) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (response.ok) {
        setNotification('Imagem atualizada com sucesso!');
        setUser(prev => ({ ...prev, image: base64Image }));
        // ✅ Atualiza também o avatar local
        const userStorage = JSON.parse(localStorage.getItem("user"));
        const updatedUser = {
          ...userStorage,
          avatar: base64Image
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        dummyContents.user = updatedUser;
      } else {
        setNotification(`Erro: ${data.message || 'Não foi possível atualizar a imagem'}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  if (!user) {
    return <Typography color="error">Erro ao carregar os dados. Verifique a conexão.</Typography>;
  }

  return (
    <div>
      <Helmet>
        <title>Detalhes de {user.name}</title>
      </Helmet>

      <PapperBlock title="Detalhes do Usuário" desc="Informações completas">
        <Paper style={{ padding: 20, marginTop: 20 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '2px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    alt="Foto do usuário"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <AccountCircle style={{ width: '80%', height: '80%', color: '#ccc' }} />
                )}
              </div>
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {!showWebcam && (
                  <Button variant="outlined" size="small" onClick={() => setShowWebcam(true)}>
                    Webcam
                  </Button>
                )}
                {showWebcam && (
                  <Button variant="contained" size="small" onClick={capturePhoto}>
                    Capturar
                  </Button>
                )}
                <Button variant="outlined" size="small" component="label">
                  Upload
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>
                {capturedImage && (
                  <IconButton onClick={resetPhoto} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </div>

            <Box>
              <Typography variant="h5" fontWeight="bold">{user.name}</Typography>
              <Typography variant="body2" color="textSecondary">{user.username}</Typography>
            </Box>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon><AccountCircle /></ListItemIcon>
              <ListItemText primary="Nome completo" secondary={user.name || 'Não informado'} />
            </ListItem>

            <ListItem>
              <ListItemIcon><CalendarToday /></ListItemIcon>
              <ListItemText primary="Data de nascimento" secondary={formatDate(user.data_nascimento)} />
            </ListItem>

            <ListItem>
              <ListItemIcon><VerifiedUser /></ListItemIcon>
              <ListItemText primary="CPF" secondary={formatCPF(user.cpf)} />
            </ListItem>

            <ListItem>
              <ListItemIcon><Email /></ListItemIcon>
              <ListItemText primary="Email" secondary={user.email || 'Não informado'} />
            </ListItem>

            <ListItem>
              <ListItemIcon><VerifiedUser /></ListItemIcon>
              <ListItemText primary="Ativo" secondary={user.active ? "Sim" : "Não"} />
            </ListItem>

            <ListItem>
              <ListItemIcon><AccountCircle /></ListItemIcon>
              <ListItemText primary="Perfil" secondary={user.Perfil?.descricao || 'N/A'} />
            </ListItem>
          </List>

        </Paper>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ProfilePage;
