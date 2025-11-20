import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ component: Component, isAuthenticated, requiredPermission, ...rest }) => {
  const token = localStorage.getItem('token');
  const storedPermissions = (() => {
    try {
      const raw = localStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Erro ao ler permissoes:', err);
      return [];
    }
  })();

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

  const hasPermission = () => {
    if (!requiredPermission) return true;
    // Se permissão ADMIN_FULL_ACCESS presente, libera tudo
    if (storedPermissions.includes('ADMIN_FULL_ACCESS')) return true;
    // Sem permissões carregadas ainda, não bloqueia
    if (!storedPermissions.length) return true;
    return storedPermissions.includes(requiredPermission);
  };

  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated && isTokenValid() && hasPermission() ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default ProtectedRoute;
