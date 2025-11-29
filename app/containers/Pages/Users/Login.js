import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erro ao decodificar JWT:', e);
    return null;
  }
}

function Login({ setIsAuthenticated = () => {} }) {
  const [valueForm, setValueForm] = useState(null); // Mantido para compatibilidade
  const { classes } = useStyles();
  const history = useHistory();
  const fallbackHost = `${window.location.protocol}//${window.location.host}`;
  const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'http://localhost:3005';

  const submitForm = async (values) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Falha na autenticacao');
      }

      const data = await response.json();
      const token = data.accessToken;
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);

      const decodedToken = decodeJwt(token);
      if (!decodedToken) throw new Error('Token invalido');

      const userId = decodedToken.userId;
      let userDetails = {};
      let permissions = data?.permissoes || [];

      if (userId) {
        try {
          const userResponse = await fetch(`${API_URL}/users/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (userResponse.ok) {
            userDetails = await userResponse.json();
          } else {
            console.warn('Falha ao buscar dados do usuario, seguindo com token somente');
          }
        } catch (err) {
          console.warn('Erro ao buscar usuario, seguindo com token somente', err);
        }
      }

      if (!permissions.length) {
        permissions =
          userDetails?.Perfil?.permissoes?.map((p) => p.nome) ||
          userDetails?.perfil?.permissoes?.map((p) => p.nome) ||
          [];
      }

      const userData = {
        name: userDetails.name || decodedToken?.nome || 'Usuario',
        id: userDetails.id || userId || 'user',
        perfilId: userDetails.perfilId || decodedToken?.perfilId,
        title: 'Usuario Autenticado',
        avatar: userDetails.image || 'default-avatar.png',
        status: 'online',
        permissions,
      };

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('permissions', JSON.stringify(permissions));
      dummyContents.user = userData;

      history.push('/app');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      // Mesmo em erro, garanta que flag de auth volte para falso
      setIsAuthenticated(false);
    }
  };

  const title = brand.name + ' - Login';
  const description = brand.desc;

  return (
    <div className={classes.root}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className={classes.container}>
        <div className={classes.userFormWrap}>
          <LoginForm onSubmit={(values) => submitForm(values)} />
        </div>
      </div>
    </div>
  );
}

export default Login;
