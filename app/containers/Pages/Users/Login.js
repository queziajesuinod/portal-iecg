import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents'; // Importação correta

function Login({ setIsAuthenticated = () => { } }) {
  const [valueForm, setValueForm] = useState(null);
  const { classes } = useStyles();
  const history = useHistory();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://62.72.63.137:3001/';
    
  const submitForm = async (values) => {
    try {
      const response = await fetch(`${API_URL}auth/login`, {
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

      // 🔥 Extrair dados do usuário do token JWT
      const base64Url = token.split(".")[1]; // Pega a parte do payload
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decodedToken = JSON.parse(atob(base64));
      // 🔹 Criar objeto do usuário
      const userData = {
        name: decodedToken.nome || "Usuário",
        title: "Usuário Autenticado",
        avatar: decodedToken.avatar || "default-avatar.png",
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
