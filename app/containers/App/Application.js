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
import MigrarHierarquiaCelulasPage from '../Pages/StartPage/MigrarHierarquiaCelulasPage';
import CampusPage from '../Pages/StartPage/campusPage';
import ApelosDirecionadosPage from '../Pages/StartPage/ApelosDirecionadosPage';
import FilaApelosPage from '../Pages/StartPage/FilaApelosPage';
import MembrosPage from '../Pages/StartPage/membrosPage';
import MembroDetailsPage from '../Pages/StartPage/MembroDetailsPage';
import MinhaJornadaPage from '../Pages/StartPage/MinhaJornadaPage';
import ApeloPublicPage from '../Pages/Public/ApeloPublicPage';
import LiveQaSessionsPage from '../Pages/LiveQa/LiveQaSessionsPage';
import LiveQaModerationPage from '../Pages/LiveQa/LiveQaModerationPage';
import BibleSearchPage from '../Pages/Bible/BibleSearchPage';
import ProfilePage from '../Pages/Users/Profile';
import WebhooksPage from '../Pages/Webhooks/WebhooksPage';
import VideosChannelsPage from '../Pages/Videos/ChannelsPage';
import VideosListPage from '../Pages/Videos/VideosPage';
import TranscriptsListPage from '../Pages/Videos/TranscriptsListPage';
import TranscriptDetailPage from '../Pages/Videos/TranscriptDetailPage';
import VideoLibraryPage from '../Pages/Videos/VideoLibraryPage';
import VideoDetailPage from '../Pages/Videos/VideoDetailPage';
import MiaListPage from '../Pages/MiaPage/MiaListPage';
import MiaDetailsPage from '../Pages/MiaPage/MiaDetailsPage';
import AttendanceListPage from '../Pages/MiaPage/AttendanceListPage';
import AttendanceDetailPage from '../Pages/MiaPage/AttendanceDetailPage';
import Login from '../Pages/Users/Login';
import ProtectedRoute from '../../routes/ProtectedRoute';
// MÓDULO INATIVO: Diário de Bordo
// import BoardJournalAdminPage from '../Pages/Admin/BoardJournalAdminPage';
// import BoardJournalPage from '../Pages/Admin/BoardJournalPage';
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
import EventImportPage from '../Pages/Events/EventImportPage';
import EventHousing from '../Pages/Events/EventHousing';
import EventTeams from '../Pages/Events/EventTeams';
import RegistrationRules from '../Pages/Events/RegistrationRules';
import FinancialPage from '../Pages/Financial/FinancialPage';
import NotificacoesGruposPage from '../Pages/Notificacoes/NotificacoesGruposPage';
import NotificacoesTemplatesPage from '../Pages/Notificacoes/NotificacoesTemplatesPage';
import NotificacoesCampanhasPage from '../Pages/Notificacoes/NotificacoesCampanhasPage';
import NotificacoesHistoricoPage from '../Pages/Notificacoes/NotificacoesHistoricoPage';
import NotificacoesSequenciasPage from '../Pages/Notificacoes/NotificacoesSequenciasPage';
import CampanhaMonitorPage from '../Pages/Notificacoes/CampanhaMonitorPage';
import RegistroCultoList from '../Pages/Cultos/RegistroCultoList';
import RegistroCultoForm from '../Pages/Cultos/RegistroCultoForm';
import CultosDashboard from '../Pages/Cultos/CultosDashboard';
import RelatorioFluxoMensalPage from '../Pages/Cultos/RelatorioFluxoMensalPage';
import MinisteriosPage from '../Pages/Cultos/admin/MinisteriosPage';
import TiposEventoPage from '../Pages/Cultos/admin/TiposEventoPage';
import CampusMinisteriosPage from '../Pages/Cultos/admin/CampusMinisteriosPage';
import MinistrosPage from '../Pages/Cultos/admin/MinistrosPage';
import ValidacaoMinisterioPage from '../Pages/Cultos/ValidacaoMinisterioPage';
import AreaVoluntariadoPage from '../Pages/Voluntariado/AreaVoluntariadoPage';
import VoluntariadoPage from '../Pages/Voluntariado/VoluntariadoPage';
import CfmTurmasPage from '../Pages/Cfm/CfmTurmasPage';
import CfmTurmaDetailPage from '../Pages/Cfm/CfmTurmaDetailPage';
import CfmAulaDetailPage from '../Pages/Cfm/CfmAulaDetailPage';
import CfmInscricaoPublicaPage from '../Pages/Cfm/CfmInscricaoPublicaPage';
import CfmMatriculaPublicaPage from '../Pages/Cfm/CfmMatriculaPublicaPage';
import CfmConfigPage from '../Pages/Cfm/CfmConfigPage';
import CelulaPresencaPage from '../Pages/Celulas/CelulaPresencaPage';
import MinhaCelulaPage from '../Pages/Celulas/MinhaCelulaPage';
import ReportsHome from '../Pages/Reports/ReportsHome';
import MembersReport from '../Pages/Reports/MembersReport';
import EventsFinanceReport from '../Pages/Reports/EventsFinanceReport';
import CultosReport from '../Pages/Reports/CultosReport';
import { isStoredTokenValid, handleUnauthorized } from '../../utils/authSession';

// Restaura dados do usuário no objeto dummy ao recarregar a página
const storedUserRaw = localStorage.getItem('user');
if (storedUserRaw) {
  try {
    const storedUser = JSON.parse(storedUserRaw);
    if (storedUser) dummyContents.user = storedUser;
  } catch (e) { /* ignora JSON inválido */ }
}

function Application({ history }) {
  const changeMode = useContext(ThemeContext);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
    return storedAuth || isStoredTokenValid();
  });

  useEffect(() => {
    const tokenIsValid = isStoredTokenValid();
    localStorage.setItem('isAuthenticated', (isAuthenticated || tokenIsValid).toString());
  }, [isAuthenticated]);

  // Verifica token a cada 30s e força logout se expirar
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isStoredTokenValid()) {
        handleUnauthorized();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Switch>
      {/* Rotas publicas */}
      <Route exact path="/login" render={(routeProps) => <Login {...routeProps} setIsAuthenticated={setIsAuthenticated} />} />
      <Route exact path="/apelo" component={ApeloPublicPage} />
      <Route exact path="/public/apelo" component={ApeloPublicPage} />
      <Route exact path="/cfm/inscricao/:turmaId" component={CfmInscricaoPublicaPage} />
      <Route exact path="/cfm/matricula" component={CfmMatriculaPublicaPage} />
      <Route exact path="/cfm/matricula/:turmaId" component={CfmMatriculaPublicaPage} />

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
            <ProtectedRoute exact path="/app/minha-jornada" component={MinhaJornadaPage} isAuthenticated={isAuthenticated} />
            {/* MÓDULO INATIVO: <ProtectedRoute exact path="/app/diario-bordo" component={BoardJournalPage} isAuthenticated={isAuthenticated} /> */}
            <ProtectedRoute exact path="/app/start/celulas" component={ListagemCelulasPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/celulas/cadastrar" component={CadastrarCelula} isAuthenticated={isAuthenticated} requiredPermission="CELULA_CADASTRAR" />
            <ProtectedRoute exact path="/app/start/celulas/migrar-hierarquia" component={MigrarHierarquiaCelulasPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_CADASTRAR" />
            <ProtectedRoute exact path="/app/start/celulas/detalhes" component={BlankPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/campus" component={CampusPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/direcionamentos" component={ApelosDirecionadosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/fila-apelos" component={FilaApelosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/membros" component={MembrosPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/start/membros/detalhes" component={MembroDetailsPage} isAuthenticated={isAuthenticated} requiredPermission="CELULA_LISTAR" />
            <ProtectedRoute exact path="/app/admin/perfis" component={PerfilPermissaoPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_PERFIS" />
            {/* MÓDULO INATIVO: <ProtectedRoute exact path="/app/admin/diario-bordo" component={BoardJournalAdminPage} isAuthenticated={isAuthenticated} requiredPermission={['DIARIO_BORDO_ADMIN', 'DIARIO_BORDO_MANAGER']} /> */}
            <ProtectedRoute exact path="/app/admin/usuarios/novo" component={UserCreatePage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/usuarios" component={UsersListPage} isAuthenticated={isAuthenticated} requiredPermission="ADMIN_USUARIOS" />
            <ProtectedRoute exact path="/app/admin/webhooks" component={WebhooksPage} isAuthenticated={isAuthenticated} requiredPermission="WEBHOOKS_VIEW" />
            <ProtectedRoute exact path="/app/admin/videos/canais" component={VideosChannelsPage} isAuthenticated={isAuthenticated} requiredPermission="VIDEOS_ADMIN" />
            <ProtectedRoute exact path="/app/admin/videos/canais/:channelId" component={VideosListPage} isAuthenticated={isAuthenticated} requiredPermission="VIDEOS_ADMIN" />
            <ProtectedRoute exact path="/app/admin/videos/transcricoes" component={TranscriptsListPage} isAuthenticated={isAuthenticated} requiredPermission="VIDEOS_ADMIN" />
            <ProtectedRoute exact path="/app/admin/videos/transcricoes/:id" component={TranscriptDetailPage} isAuthenticated={isAuthenticated} requiredPermission="VIDEOS_ADMIN" />
            <ProtectedRoute exact path="/app/videos" component={VideoLibraryPage} isAuthenticated={isAuthenticated} requiredPermission={['VIDEOS_VIEW', 'VIDEOS_ADMIN']} />
            <ProtectedRoute exact path="/app/videos/:videoId" component={VideoDetailPage} isAuthenticated={isAuthenticated} requiredPermission={['VIDEOS_VIEW', 'VIDEOS_ADMIN']} />
            <ProtectedRoute exact path="/app/events" component={EventList} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/novo" component={EventForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/importar" component={EventImportPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id" component={EventDetails} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/editar" component={EventForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/checkin" component={CheckInManagement} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/events/:id/notificacoes" component={NotificationsManagement} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/cupons" component={CouponsPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/financeiro" component={FinancialPage} isAuthenticated={isAuthenticated} requiredPermission="EVENTS_ACESS" />
            <ProtectedRoute exact path="/app/notificacoes/grupos" component={NotificacoesGruposPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/notificacoes/templates" component={NotificacoesTemplatesPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/notificacoes/campanhas" component={NotificacoesCampanhasPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/notificacoes/historico/:id" component={NotificacoesHistoricoPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/notificacoes/monitor/:id" component={CampanhaMonitorPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/notificacoes/sequencias" component={NotificacoesSequenciasPage} isAuthenticated={isAuthenticated} requiredPermission="NOTIFICACOES_VIEW" />
            <ProtectedRoute exact path="/app/events/:id/formulario" component={FormBuilder} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/regras-inscricao" component={RegistrationRules} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/registrations/:id" component={RegistrationDetails} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/housing" component={EventHousing} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/events/:id/teams" component={EventTeams} isAuthenticated={isAuthenticated} />
            {/* ===== Módulo: Saúde e Fluxo de Cultos ===== */}
            <ProtectedRoute exact path="/app/cultos/dashboard" component={CultosDashboard} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/relatorio-fluxo" component={RelatorioFluxoMensalPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/registros" component={RegistroCultoList} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/registros/novo" component={RegistroCultoForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/registros/:id/editar" component={RegistroCultoForm} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/admin/ministerios" component={MinisteriosPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/admin/tipos-evento" component={TiposEventoPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/admin/campus-ministerios" component={CampusMinisteriosPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/admin/ministros" component={MinistrosPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/cultos/validacao" component={ValidacaoMinisterioPage} isAuthenticated={isAuthenticated} />
            {/* ===== Módulo: Voluntariado ===== */}
            <ProtectedRoute exact path="/app/voluntariado/areas" component={AreaVoluntariadoPage} isAuthenticated={isAuthenticated} requiredPermission="VOLUNTARIADO" />
            <ProtectedRoute exact path="/app/voluntariado" component={VoluntariadoPage} isAuthenticated={isAuthenticated} requiredPermission="VOLUNTARIADO" />
            {/* ===== Módulo: Relatórios ===== */}
            <ProtectedRoute exact path="/app/relatorios" component={ReportsHome} isAuthenticated={isAuthenticated} requiredPermission="RELATORIOS" />
            <ProtectedRoute exact path="/app/relatorios/membros" component={MembersReport} isAuthenticated={isAuthenticated} requiredPermission="RELATORIOS" />
            <ProtectedRoute exact path="/app/relatorios/eventos-financeiro" component={EventsFinanceReport} isAuthenticated={isAuthenticated} requiredPermission="RELATORIOS" />
            <ProtectedRoute exact path="/app/relatorios/cultos" component={CultosReport} isAuthenticated={isAuthenticated} requiredPermission="RELATORIOS" />
            {/* ===== Módulo: Perguntas ao Vivo ===== */}
            <ProtectedRoute exact path="/app/perguntas-ao-vivo" component={LiveQaSessionsPage} isAuthenticated={isAuthenticated} requiredPermission={['PERGUNTAS_AO_VIVO_GERENCIAR', 'PERGUNTAS_AO_VIVO_MODERAR']} />
            <ProtectedRoute exact path="/app/perguntas-ao-vivo/:id" component={LiveQaModerationPage} isAuthenticated={isAuthenticated} requiredPermission={['PERGUNTAS_AO_VIVO_GERENCIAR', 'PERGUNTAS_AO_VIVO_MODERAR']} />
            <ProtectedRoute exact path="/app/biblia" component={BibleSearchPage} isAuthenticated={isAuthenticated} requiredPermission="BIBLE" />
            {/* ===== Módulo: CFM ===== */}
            <ProtectedRoute exact path="/app/cfm/turmas" component={CfmTurmasPage} isAuthenticated={isAuthenticated} requiredPermission="CFM_ADMIN" />
            <ProtectedRoute exact path="/app/cfm/turmas/:id" component={CfmTurmaDetailPage} isAuthenticated={isAuthenticated} requiredPermission="CFM_ADMIN" />
            <ProtectedRoute exact path="/app/cfm/aulas/:aulaId" component={CfmAulaDetailPage} isAuthenticated={isAuthenticated} requiredPermission="CFM_ADMIN" />
            <ProtectedRoute exact path="/app/cfm/configuracao" component={CfmConfigPage} isAuthenticated={isAuthenticated} requiredPermission="CFM_ADMIN" />
            {/* ===== Módulo: Presença em Células ===== */}
            <ProtectedRoute exact path="/app/minha-celula" component={MinhaCelulaPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/celulas/:celulaId/presenca" component={CelulaPresencaPage} isAuthenticated={isAuthenticated} />
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
