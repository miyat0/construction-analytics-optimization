import { useEffect, useRef, useState } from "react";
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
      return "Worker Dashboard";
    default:
      return "Workspace";
  }
};

const UserWorkspaceHeader = ({
  onOpenNav,
}: {
  onOpenNav: () => void;
}) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const chrome = useOptionalAdminChrome();
  const breadcrumb = chrome?.topbarBreadcrumb?.trim() || null;
  const pageTitle = chrome?.pageTitle?.trim() || null;
  const showBreadcrumb = Boolean(breadcrumb);
  const initials = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const headerTitle = pageTitle || getWorkspaceTitle(user?.role.role_name);

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
    setIsMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [isMenuOpen]);

  return (
    <header className="admin-topbar user-workspace-layout__topbar">
      <div className="admin-topbar__inner user-workspace-layout__topbar-inner">
        <div className="admin-topbar__content user-workspace-layout__topbar-content">
          <button
            type="button"
            className="user-workspace-layout__menu-btn"
            aria-label="Open navigation"
            onClick={onOpenNav}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          {showBreadcrumb ? (
            <p className="admin-topbar__breadcrumb">
              {renderBreadcrumb(breadcrumb || headerTitle)}
            </p>
          ) : (
            <h1 className="admin-topbar__title">{headerTitle}</h1>
          )}
        </div>

        <div className="admin-topbar__controls">
          <div className="user-workspace-layout__profile-menu" ref={menuRef}>
            <button
              type="button"
              className="user-workspace-layout__profile-trigger"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="admin-topbar__avatar" aria-hidden="true">
                {initials}
              </span>
              <strong className="admin-topbar__profile-name">{user?.name || "User"}</strong>
              <span className="user-workspace-layout__profile-caret" aria-hidden="true">
                ▾
              </span>
            </button>

            {isMenuOpen ? (
              <div className="user-workspace-layout__profile-dropdown" role="menu">
                <div className="user-workspace-layout__profile-meta">
                  <strong>{user?.name || "User"}</strong>
                  <span>{user?.role.role_name || "User"}</span>
                </div>
                <button
                  type="button"
                  className="user-workspace-layout__profile-logout"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export const UserWorkspaceLayout = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <AdminChromeProvider>
      <div className="user-workspace-layout">
        {isMobileNavOpen ? (
          <button
            type="button"
            className="user-sidebar__backdrop"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}
        <UserSidebar
          isMobileOpen={isMobileNavOpen}
          onNavigate={() => setIsMobileNavOpen(false)}
        />
        <div className="user-workspace-layout__main">
          <UserWorkspaceHeader onOpenNav={() => setIsMobileNavOpen(true)} />
          <div className="user-workspace-layout__body">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminChromeProvider>
  );
};

export default UserWorkspaceLayout;
