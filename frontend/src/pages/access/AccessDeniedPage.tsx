import { Link } from "react-router-dom";

import { getDashboardRouteForRole } from "../../config/roleRoutes";
import { useAuth } from "../../hooks/useAuth";

export const AccessDeniedPage = () => {
  const { user } = useAuth();
  const dashboardRoute = getDashboardRouteForRole(user?.role.role_name) ?? "/dashboard";

  return (
    <main className="app-placeholder">
      <section className="app-placeholder__card">
        <span className="app-placeholder__eyebrow">Access</span>
        <h1>Access denied</h1>
        <p>Your role cannot open this page.</p>
        <Link className="app-placeholder__action" to={dashboardRoute}>
          Go to dashboard
        </Link>
      </section>
    </main>
  );
};

export default AccessDeniedPage;
