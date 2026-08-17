import { Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { AdminTopbar } from "../../components/admin/AdminTopbar";
import { AdminChromeProvider } from "../../contexts/AdminChromeContext";

import "./AdminLayout.css";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AdminChromeProvider>
      <div className="admin-layout">
        <AdminSidebar onLogout={handleLogout} />
        <div className="admin-layout__main">
          <AdminTopbar />
          <div className="admin-layout__body">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminChromeProvider>
  );
};

export default AdminLayout;
