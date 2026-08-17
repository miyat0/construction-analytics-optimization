import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type { UserRoleName } from "../types/auth";

interface RoleProtectedRouteProps {
  allowedRoles: UserRoleName[];
  unauthenticatedRedirectTo?: string;
  unauthorizedRedirectTo?: string;
  fallback?: ReactNode;
}

export const RoleProtectedRoute = ({
  allowedRoles,
  unauthenticatedRedirectTo = "/login",
  unauthorizedRedirectTo = "/access-denied",
  fallback = null,
}: RoleProtectedRouteProps) => {
  const location = useLocation();
  const { hasRole, isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        state={{ from: location }}
        to={unauthenticatedRedirectTo}
      />
    );
  }

  if (!hasRole(...allowedRoles)) {
    return <Navigate replace state={{ from: location }} to={unauthorizedRedirectTo} />;
  }

  return <Outlet />;
};
