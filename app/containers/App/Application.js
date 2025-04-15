import React, { useContext, useState, useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Dashboard from '../Templates/Dashboard';
import { ThemeContext } from './ThemeWrapper';

import MiaPage from '../Pages/MiaPage';
import BlankPage from '../Pages/BlankPage';
import ListagemCelulasPage from '../Pages/StartPage/celulasPage';
import CadastrarCelula from '../Pages/StartPage/cadastrarCelulasPage';
import ProfilePage from '../Pages/Users/Profile';
import MiaListPage from '../Pages/MiaPage/MiaListPage';
import MiaDetailsPage from '../Pages/MiaPage/MiaDetailsPage';
import Login from '../Pages/Users/Login';
import ProtectedRoute from "../../routes/ProtectedRoute";

import dummyContents from 'dan-api/dummy/dummyContents';

function Application(props) {
  const { history } = props;
  const changeMode = useContext(ThemeContext);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    return storedAuth === "true";
  });

  // Restaurar usuário salvo, se existir
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    dummyContents.user = JSON.parse(storedUser);
  }

  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Dashboard history={history} changeMode={changeMode}>
      <Switch>
        {/* Rota de login */}
        <Route
          exact
          path="/login"
          render={(props) => <Login {...props} setIsAuthenticated={setIsAuthenticated} />}
        />

        {/* Rotas protegidas */}
        <ProtectedRoute exact path="/app" component={MiaListPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia/cadastrar" component={MiaPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia" component={MiaListPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/mia/detalhes" component={MiaDetailsPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/profile" component={ProfilePage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas" component={ListagemCelulasPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas/cadastrar" component={CadastrarCelula} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas/detalhes" component={BlankPage} isAuthenticated={isAuthenticated} />

        {/* Fallback para login se rota não for encontrada */}
        <Redirect to="/login" />
      </Switch>
    </Dashboard>
  );
}

export default Application;
