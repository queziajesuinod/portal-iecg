import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents';
import { isStoredTokenValid } from '../../../utils/authSession';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erro ao decodificar JWT:', e);
    return null;
  }
}

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));

const resolveUserName = (...candidates) => {
  const normalized = candidates.map(normalizeText).filter(Boolean);
  const nonEmailName = normalized.find((candidate) => !isEmailLike(candidate));
  return nonEmailName || normalized[0] || 'Usuario';
};

function Login({ setIsAuthenticated = () => {} }) {
  const { classes } = useStyles();
  const history = useHistory();
  const fallbackHost = `${window.location.protocol}//${window.location.host}`;
  const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';

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
      const { accessToken: token, permissoes: loginPermissions = [] } = data;
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);

      const decodedToken = decodeJwt(token);
      if (!decodedToken) throw new Error('Token invalido');

      const { userId, perfis: tokenPerfis, nome } = decodedToken;
      let userDetails = {};
      let permissions = loginPermissions;

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
        const inheritedPermissions = (
          userDetails?.Perfil?.permissoes?.map((perm) => perm.nome)
          || userDetails?.perfil?.permissoes?.map((perm) => perm.nome)
          || []
        );
        const directPermissions = userDetails?.permissoesDiretas?.map((perm) => perm.nome) || [];
        permissions = Array.from(new Set([
          ...inheritedPermissions,
          ...directPermissions,
        ].filter(Boolean)));
      }

      const userData = {
        name: resolveUserName(nome, userDetails.name, userDetails.username, values?.email),
        id: userId || userDetails.id || 'user',
        perfis: Array.isArray(userDetails.perfis) && userDetails.perfis.length
          ? userDetails.perfis.map((p) => p.descricao).filter(Boolean)
          : (tokenPerfis || []),
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
      const isOfflineError = !navigator.onLine
        || /failed to fetch|networkerror|load failed/i.test(String(error?.message || ''));

      if (isOfflineError && isStoredTokenValid()) {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            dummyContents.user = JSON.parse(storedUser);
          }
        } catch (e) {
          console.warn('Falha ao carregar usuario salvo para login offline', e);
        }

        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        history.push('/app');
        return;
      }

      localStorage.setItem('isAuthenticated', 'false');
      setIsAuthenticated(false);
    }
  };

  const title = `${brand.name} - Login`;
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

Login.propTypes = {
  setIsAuthenticated: PropTypes.func,
};

export default Login;
