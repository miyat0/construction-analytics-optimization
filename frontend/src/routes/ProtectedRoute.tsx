import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  redirectTo?: string;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  redirectTo = "/login",
  fallback = null,
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to={redirectTo} />;
  }

  return <Outlet />;
};
