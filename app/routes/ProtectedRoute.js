import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { isStoredTokenValid } from '../utils/authSession';

const ProtectedRoute = ({ component: Component, isAuthenticated, requiredPermission, ...rest }) => {
  const storedPermissions = (() => {
    try {
      const raw = localStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Erro ao ler permissoes:', err);
      return [];
    }
  })();

  const hasPermission = () => {
    if (!requiredPermission) return true;
    const requiredPermissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    if (storedPermissions.includes('ADMIN_FULL_ACCESS')) return true;
    if (!storedPermissions.length) return true;
    return requiredPermissions.some((permission) => storedPermissions.includes(permission));
  };

  return (
    <Route
      {...rest}
      render={(props) => (
        (isAuthenticated || isStoredTokenValid()) && hasPermission() ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      )}
    />
  );
};

export default ProtectedRoute;
