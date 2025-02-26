import React, { useContext, useState, useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Dashboard from '../Templates/Dashboard';
import { ThemeContext } from './ThemeWrapper';
import MiaPage from '../Pages/MiaPage';
import MiaListPage from '../Pages/MiaPage/MiaListPage';
import MiaDetailsPage from '../Pages/MiaPage/MiaDetailsPage';
import Login from '../Pages/Users/Login'; // Sua página de login
import ProtectedRoute from "../../routes/ProtectedRoute";

import dummyContents from 'dan-api/dummy/dummyContents';



function Application(props) {
  const { history } = props;
  const changeMode = useContext(ThemeContext);

  // 🔐 Verifica se o usuário está autenticado no localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    return storedAuth === "true"; // Garante que retorna um booleano
  });

  console.log("isAuthenticated:", isAuthenticated);
  console.log("setIsAuthenticated:", setIsAuthenticated);

  // 🔥 Verifica se há um usuário salvo no localStorage ao iniciar a aplicação
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    dummyContents.user = JSON.parse(storedUser);
  }

  console.log("Usuário restaurado ao iniciar a aplicação:", dummyContents.user);
  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Dashboard history={history} changeMode={changeMode}>
      <Switch>
        {/* Página de Login - Passa `setIsAuthenticated` para Login */}
        <Route exact path="/login" render={(props) => <Login {...props} setIsAuthenticated={setIsAuthenticated} />} />

        {/* 📌 Páginas protegidas */}
        <ProtectedRoute exact path="/app" component={MiaListPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia/cadastrar" component={MiaPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia" component={MiaListPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia/detalhes" component={MiaDetailsPage} isAuthenticated={isAuthenticated} />

        {/* Redireciona para Login se nenhuma rota for encontrada */}
        <Redirect to="/login" />
      </Switch>
    </Dashboard>
  );
}

export default Application;