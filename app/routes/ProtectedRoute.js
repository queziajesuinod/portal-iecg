import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ component: Component, isAuthenticated, ...rest }) => {
  const token = localStorage.getItem('token');

  // Validação de token
  const isTokenValid = () => {
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      return decoded.exp && decoded.exp > now;
    } catch (err) {
      console.error('Erro ao decodificar o token:', err);
      return false;
    }
  };

  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated && isTokenValid() ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default ProtectedRoute;
