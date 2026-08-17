import { Navigate } from "react-router-dom";

import { getDashboardRouteForRole } from "../config/roleRoutes";
import { useAuth } from "../hooks/useAuth";

export const DashboardRedirect = () => {
  const { status, user } = useAuth();

  if (status === "loading") {
    return null;
  }

  const dashboardRoute = getDashboardRouteForRole(user?.role.role_name);

  if (!dashboardRoute) {
    return <Navigate replace to="/access-denied" />;
  }

  return <Navigate replace to={dashboardRoute} />;
};

export default DashboardRedirect;
