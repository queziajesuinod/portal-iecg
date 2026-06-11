import React from 'react';
import { PropTypes } from 'prop-types';
import { Router, Switch, Route } from 'react-router-dom';
import {
  NotFound,
} from '../pageListAsync';
import Auth from './Auth';
import Application from './Application';
import LoginDedicated from '../Pages/Standalone/LoginDedicated';
import QaJoinPage from '../Pages/Public/QaJoinPage';
import QaRoomPage from '../Pages/Public/QaRoomPage';
import QaLivePage from '../Pages/Public/QaLivePage';
import ThemeWrapper from './ThemeWrapper';
window.__MUI_USE_NEXT_TYPOGRAPHY_VARIANTS__ = true;

function App(props) {
  const { history } = props;
  return (
    <ThemeWrapper>
      <Router history={history}>
        <Switch>
          <Route path="/" exact component={LoginDedicated} />
          {/* Perguntas ao vivo (público, sem login) */}
          <Route path="/qa/:code/ao-vivo" exact component={QaLivePage} />
          <Route path="/qa/:code" exact component={QaRoomPage} />
          <Route path="/qa" exact component={QaJoinPage} />
          <Route path="/app" component={Application} />
          <Route component={Auth} />
          <Route component={NotFound} />

        </Switch>
      </Router>
    </ThemeWrapper>
  );
}

App.propTypes = {
  history: PropTypes.object.isRequired,
};

export default App;
