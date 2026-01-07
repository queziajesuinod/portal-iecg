import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect } from 'react-router-dom';
import Dashboard from '../Templates/Dashboard';
import { ThemeContext } from './ThemeWrapper';
import MiaPage from '../Pages/MiaPage';
import WelcomePage from '../Pages/StartPage/WelcomePage';
import BlankPage from '../Pages/BlankPage';
import ListagemCelulasPage from '../Pages/StartPage/celulasPage';
import CadastrarCelula from '../Pages/StartPage/cadastrarCelulasPage';
import CampusPage from '../Pages/StartPage/campusPage';
import ApelosDirecionadosPage from '../Pages/StartPage/ApelosDirecionadosPage';
import FilaApelosPage from '../Pages/StartPage/FilaApelosPage';
import ChatwootPage from '../Pages/StartPage/ChatwootPage';
import ApeloPublicPage from '../Pages/Public/ApeloPublicPage';
import ProfilePage from '../Pages/Users/Profile';
import WebhooksPage from '../Pages/Webhooks/WebhooksPage';
import MiaListPage from '../Pages/MiaPage/MiaListPage';
import MiaDetailsPage from '../Pages/MiaPage/MiaDetailsPage';
import AttendanceListPage from '../Pages/MiaPage/AttendanceListPage';
import AttendanceDetailPage from '../Pages/MiaPage/AttendanceDetailPage';
import Login from '../Pages/Users/Login';
import ProtectedRoute from '../../routes/ProtectedRoute';
import PerfilPermissaoPage from '../Pages/Admin/PerfilPermissaoPage';
import UserCreatePage from '../Pages/Admin/UserCreatePage';
import UsersListPage from '../Pages/Admin/UsersListPage';
import dummyContents from 'dan-api/dummy/dummyContents';

function Application({ history }) {
  const changeMode = useContext(ThemeContext);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    return storedAuth === 'true';
  });

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    dummyContents.user = JSON.parse(storedUser);
  }

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Switch>
      {/* Rotas publicas */}
      <Route exact path="/login" render={(routeProps) => <Login {...routeProps} setIsAuthenticated={setIsAuthenticated} />} />
      <Route exact path="/apelo" component={ApeloPublicPage} />
      <Route exact path="/public/apelo" component={ApeloPublicPage} />

      {/* Rotas privadas com dashboard */}
      <Route path="/app">
        <Dashboard history={history} changeMode={changeMode}>
          <Switch>
            <ProtectedRoute exact path="/app" component={WelcomePage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/mia/cadastrar" component={MiaPage} isAuthenticated={isAuthenticated} requiredPermission="MIA_CADASTRAR" />
            <ProtectedRoute exact path="/app/mia" component={MiaListPage} isAuthenticated={isAuthenticated} requiredPermission="MIA_LISTAR" />
            <ProtectedRoute exact path="/app/mia/detalhes" component={MiaDetailsPage} isAuthenticated={isAuthenticated} requiredPermission="MIA_LISTAR" />
            <ProtectedRoute exact path="/app/mia/listas-presenca" component={AttendanceListPage} isAuthenticated={isAuthenticated} requiredPermission="MIA_LISTAR" />
            <ProtectedRoute exact path="/app/mia/listas-presenca/:id" component={AttendanceDetailPage} isAuthenticated={isAuthenticated} requiredPermission="MIA_LISTAR" />
            <ProtectedRoute exact path="/app/profile" component={ProfilePage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/start/celulas" component={ListagemCelulasPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/celulas/cadastrar" component={CadastrarCelula} isAuthenticated={isAuthenticated} requiredPermission="CELULA_CADASTRAR" />
            <ProtectedRoute exact path="/app/start/celulas/detalhes" component={BlankPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/campus" component={CampusPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/direcionamentos" component={ApelosDirecionadosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/fila-apelos" component={FilaApelosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/chatwoot" component={ChatwootPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/admin/perfis" component={PerfilPermissaoPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_PERFIS" />
            <ProtectedRoute exact path="/app/admin/usuarios/novo" component={UserCreatePage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/usuarios" component={UsersListPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/webhooks" component={WebhooksPage} isAuthenticated={isAuthenticated} requiredPermission="WEBHOOKS_VIEW" />
          </Switch>
        </Dashboard>
      </Route>

      {/* Redireciona tudo para login se nada bater */}
      <Redirect to="/login" />
    </Switch>
  );
}

export default Application;

Application.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
};
