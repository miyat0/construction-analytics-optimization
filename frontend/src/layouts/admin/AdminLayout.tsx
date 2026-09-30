import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { AdminTopbar } from "../../components/admin/AdminTopbar";
import { AppSidebar } from "../../components/navigation/AppSidebar";
import { AdminChromeProvider } from "../../contexts/AdminChromeContext";
import { useAuth } from "../../hooks/useAuth";

import "../DashboardShell.css";
import "./AdminLayout.css";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AdminChromeProvider>
      <div className="dashboard-shell admin-layout">
        {isMobileNavOpen ? (
          <button
            type="button"
            className="dashboard-shell__backdrop"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}
        <AppSidebar
          onLogout={handleLogout}
          isMobileOpen={isMobileNavOpen}
          onNavigate={() => setIsMobileNavOpen(false)}
        />
        <div className="dashboard-shell__main admin-layout__main">
          <AdminTopbar onOpenNav={() => setIsMobileNavOpen(true)} />
          <div className="dashboard-shell__body admin-layout__body">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminChromeProvider>
  );
};

export default AdminLayout;
