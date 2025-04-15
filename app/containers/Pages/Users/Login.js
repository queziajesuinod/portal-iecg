import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents'; // Importação correta


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
    console.error("Erro ao decodificar JWT:", e);
    return null;
  }
}




function Login({ setIsAuthenticated = () => { } }) {
  const [valueForm, setValueForm] = useState(null);
  const { classes } = useStyles();
  const history = useHistory();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const submitForm = async (values) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error("Falha na autenticação");
      }

      const data = await response.json();
      const token = data.accessToken;
      localStorage.setItem("token", token);
      localStorage.setItem("isAuthenticated", "true");
      setIsAuthenticated(true);



      const decodedToken = decodeJwt(token);
      if (!decodedToken) throw new Error("Token inválido");

      // 🔄 Buscar dados completos do usuário
      const userId = decodedToken.userId;

      const userResponse = await fetch(`${API_URL}/users/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error("Erro ao buscar dados do usuário");
      }

      const userDetails = await userResponse.json();

      const userData = {
        name: userDetails.name || "Usuário",
        id: userDetails.id || "user",
        title: "Usuário Autenticado",
        avatar: userDetails.image || "default-avatar.png",
        status: "online"
      };

      // 🔥 Salvar usuário no `localStorage`
      localStorage.setItem("user", JSON.stringify(userData));
      dummyContents.user = userData;
      console.log("Usuário autenticado:", dummyContents.user);

      // 🔄 Redirecionar após login bem-sucedido
      history.push("/app");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
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
