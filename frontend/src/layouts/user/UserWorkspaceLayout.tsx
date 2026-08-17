import { Outlet, useNavigate } from "react-router-dom";

import { ROLE_NAMES } from "../../types/auth";
import { useAuth } from "../../hooks/useAuth";
import { UserSidebar } from "../../components/user/UserSidebar";
import {
  AdminChromeProvider,
  useOptionalAdminChrome,
} from "../../contexts/AdminChromeContext";

import "../../components/admin/AdminTopbar.css";
import "./UserWorkspaceLayout.css";

const getWorkspaceTitle = (roleName?: string | null): string => {
  switch (roleName) {
    case ROLE_NAMES.PROJECT_MANAGER:
    case ROLE_NAMES.CLIENT:
      return "Projects";
    case ROLE_NAMES.SITE_ENGINEER:
      return "Site Engineer";
    case ROLE_NAMES.SUPERVISOR:
      return "Supervisor";
    case ROLE_NAMES.WORKER:
      return "Worker";
    default:
      return "Workspace";
  }
};

const UserWorkspaceHeader = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const chrome = useOptionalAdminChrome();
  const breadcrumb = chrome?.topbarBreadcrumb?.trim() || null;
  const showBreadcrumb = Boolean(breadcrumb);
  const initials = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();

  const renderBreadcrumb = (value: string) => {
    const parts = value.split(" / ").map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      return value;
    }

    const current = parts[parts.length - 1];
    const parents = parts.slice(0, -1).join(" / ");

    return (
      <>
        {parents}
        {" / "}
        <span className="admin-topbar__breadcrumb-current">{current}</span>
      </>
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="admin-topbar user-workspace-layout__topbar">
      <div className="admin-topbar__inner">
        <div className="admin-topbar__content">
          {showBreadcrumb ? (
            <p className="admin-topbar__breadcrumb">
              {renderBreadcrumb(breadcrumb || getWorkspaceTitle(user?.role.role_name))}
            </p>
          ) : (
            <h1 className="admin-topbar__title">{getWorkspaceTitle(user?.role.role_name)}</h1>
          )}
        </div>

        <div className="admin-topbar__controls">
          <div className="admin-topbar__profile" aria-label="Signed-in user">
            <span className="admin-topbar__avatar" aria-hidden="true">
              {initials}
            </span>
            <strong className="admin-topbar__profile-name">{user?.name || "User"}</strong>
          </div>
          <button
            type="button"
            className="admin-topbar__action admin-topbar__action--secondary admin-topbar__action--logout"
            onClick={() => void handleLogout()}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export const UserWorkspaceLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AdminChromeProvider>
      <div className="user-workspace-layout">
        <UserSidebar onLogout={handleLogout} />
        <div className="user-workspace-layout__main">
          <UserWorkspaceHeader />
          <div className="user-workspace-layout__body">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminChromeProvider>
  );
};

export default UserWorkspaceLayout;
