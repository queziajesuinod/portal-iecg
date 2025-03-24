import React from 'react';
import { Switch, Route } from 'react-router-dom';
import Outer from '../Templates/Outer';
import {
  Login,
  ResetPassword,
  Maintenance,
  NotFound,
} from '../pageListAsync';

function Auth() {
  return (
    <Outer>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/maintenance" component={Maintenance} />
        <Route component={NotFound} />
      </Switch>
    </Outer>
  );
}

export default Auth;
