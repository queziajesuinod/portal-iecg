import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect } from 'react-router-dom';
import dummyContents from 'dan-api/dummy/dummyContents';
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
import MembrosPage from '../Pages/StartPage/membrosPage';
import MembroDetailsPage from '../Pages/StartPage/MembroDetailsPage';
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
import EventList from '../Pages/Events/EventList';
import EventForm from '../Pages/Events/EventForm';
import EventDetails from '../Pages/Events/EventDetails';
import CheckInManagement from '../Pages/Events/CheckInManagement';
import NotificationsManagement from '../Pages/Events/NotificationsManagement';
import CouponsPage from '../Pages/Events/CouponsPage';
import FormBuilder from '../Pages/Events/FormBuilder';
import RegistrationDetails from '../Pages/Events/RegistrationDetails';
import EventHousing from '../Pages/Events/EventHousing';
import EventTeams from '../Pages/Events/EventTeams';
import FinancialPage from '../Pages/Financial/FinancialPage';

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
            <ProtectedRoute exact path="/app/start/membros" component={MembrosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/membros/detalhes" component={MembroDetailsPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/admin/perfis" component={PerfilPermissaoPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_PERFIS" />
            <ProtectedRoute exact path="/app/admin/usuarios/novo" component={UserCreatePage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/usuarios" component={UsersListPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/webhooks" component={WebhooksPage} isAuthenticated={isAuthenticated} requiredPermission="WEBHOOKS_VIEW" />
            <ProtectedRoute exact path="/app/events" component={EventList} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/novo" component={EventForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id" component={EventDetails} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/editar" component={EventForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/checkin" component={CheckInManagement} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/events/:id/notificacoes" component={NotificationsManagement} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/cupons" component={CouponsPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/financeiro" component={FinancialPage} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/events/:id/formulario" component={FormBuilder} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/registrations/:id" component={RegistrationDetails} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/housing" component={EventHousing} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/teams" component={EventTeams} isAuthenticated={isAuthenticated} />
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
