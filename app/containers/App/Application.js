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
import FormPublicPage from '../Pages/FormsPage/FormPublicPage';
import FormPaymentCheckPage from '../Pages/FormsPage/FormPaymentCheckPage';
import FormPublicPaymentPage from '../Pages/FormsPage/FormPublicPaymentPage';

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
        <ProtectedRoute exact path="/app/profile" component={ProfilePage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas" component={ListagemCelulasPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas/cadastrar" component={CadastrarCelula} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/start/celulas/detalhes" component={BlankPage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/forms/create" component={FormCreatePage} isAuthenticated={isAuthenticated} />
        <ProtectedRoute exact path="/app/forms/edit/:id" component={FormEditPage} isAuthenticated={isAuthenticated} />


        <Route exact path="/public/forms/:slug" component={FormPublicPage} />
        <Route exact path="/public/pagamentos" component={FormPaymentCheckPage} />
        <Route exact path="/public/pagamento/:submissionId" component={FormPublicPaymentPage} />
       
        {/* Redireciona para Login se nenhuma rota for encontrada */}
        <Redirect to="/login" />
      </Switch>
    </Dashboard>
  );
}

export default Application;