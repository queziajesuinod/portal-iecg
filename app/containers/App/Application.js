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
import Login from '../Pages/Users/Login'; // Sua página de login
import ProtectedRoute from "../../routes/ProtectedRoute";
import FormEditPage from '../Pages/FormsPage/FormEditPage';
import FormCreatePage from '../Pages/FormsPage/FormCreatePage';
import FormListPage from '../Pages/FormsPage/FormListPage';
import FormPublicPage from '../Pages/FormsPage/FormPublicPage';
import FormPaymentCheckPage from '../Pages/FormsPage/FormPaymentCheckPage';
import FormPublicPaymentPage from '../Pages/FormsPage/FormPublicPaymentPage';
import ProcessPaymentPage from '../Pages/PaymentsPage/ProcessPaymentPage';

import dummyContents from 'dan-api/dummy/dummyContents';



function Application(props) {
  const { history } = props;
  const changeMode = useContext(ThemeContext);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    return storedAuth === "true";
  });

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    dummyContents.user = JSON.parse(storedUser);
  }

  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Switch>
      {/* 🔓 ROTAS PÚBLICAS */}
      <Route exact path="/login" render={(props) => <Login {...props} setIsAuthenticated={setIsAuthenticated} />} />
      
      {/* 🔐 ROTAS PRIVADAS COM DASHBOARD */}
      <Route path="/app">
        <Dashboard history={history} changeMode={changeMode}>
          <Switch>
            <ProtectedRoute exact path="/app" component={MiaListPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/mia/cadastrar" component={MiaPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/mia" component={MiaListPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/mia/detalhes" component={MiaDetailsPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/profile" component={ProfilePage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/start/celulas" component={ListagemCelulasPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/start/celulas/cadastrar" component={CadastrarCelula} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/start/celulas/detalhes" component={BlankPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/eventos/cadastrar" component={FormCreatePage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/eventos/editar/:id" component={FormEditPage} isAuthenticated={isAuthenticated} />
            <ProtectedRoute exact path="/app/eventos" component={FormListPage} isAuthenticated={isAuthenticated} />
           <ProtectedRoute exact path="/app/eventos/:slug" component={FormPublicPage} isAuthenticated={isAuthenticated} />
           <ProtectedRoute exact path="/app/pagamentos" component={FormPaymentCheckPage} isAuthenticated={isAuthenticated} />
           <ProtectedRoute exact path="/app/pagamento/:submissionId" component={FormPublicPaymentPage}  isAuthenticated={isAuthenticated}/>
           <ProtectedRoute exact path="/app/process-payment" component={ProcessPaymentPage} isAuthenticated={isAuthenticated} />

          </Switch>
        </Dashboard>
      </Route>

      {/* Redireciona tudo para login se nada bater */}
      <Redirect to="/login" />
    </Switch>
  );
}


export default Application;