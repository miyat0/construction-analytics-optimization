import { Link, useLocation } from "react-router-dom";

import { getAdminPeopleRoleBySlug } from "../../config/adminPeople";
import { useAuth } from "../../hooks/useAuth";
import { useOptionalAdminChrome } from "../../contexts/AdminChromeContext";

import "./AdminTopbar.css";

type ActionLink = {
  label: string;
  to: string;
  variant: "primary" | "secondary";
};

type PageMeta = {
  title: string;
  actions: ActionLink[];
  /** When true, prefer muted breadcrumb chrome over the large page title. */
  useBreadcrumb?: boolean;
};

const isUploadDocumentPath = (pathname: string): boolean =>
  /\/projects\/view\/documents\/new\/?$/.test(pathname);

const isProjectFormPath = (pathname: string): boolean =>
  /\/projects\/view\/(milestones\/new|documents\/new|milestones\/\d+\/(?:tasks|extensions)\/(?:new|\d+(?:\/edit)?))\/?$/.test(
    pathname,
  );

const getPageMeta = (pathname: string): PageMeta => {
  if (isUploadDocumentPath(pathname)) {
    return {
      title: "Projects",
      actions: [],
    };
  }

  if (isProjectFormPath(pathname)) {
    return {
      title: "Projects",
      actions: [],
      useBreadcrumb: true,
    };
  }

  if (pathname === "/admin/projects") {
    return {
      title: "Projects",
      actions: [],
    };
  }

  if (/^\/admin\/projects\/view/.test(pathname)) {
    return {
      title: "Projects",
      actions: [],
    };
  }

  if (pathname === "/admin/dashboard") {
    return {
      title: "Dashboard",
      actions: [],
    };
  }

  const peopleMatch = pathname.match(/^\/admin\/people\/([^/]+)\/?$/);
  if (peopleMatch) {
    const peopleRole = getAdminPeopleRoleBySlug(peopleMatch[1]);
    if (peopleRole) {
      return {
        title: peopleRole.pageTitle,
        actions: [],
      };
    }
  }

  if (pathname === "/admin/users/create") {
    return {
      title: "Register User",
      actions: [{ label: "Back to Users", to: "/admin/users", variant: "secondary" }],
    };
  }

  if (/^\/admin\/users\/\d+\/edit$/.test(pathname)) {
    return {
      title: "Edit User",
      actions: [{ label: "Back to Users", to: "/admin/users", variant: "secondary" }],
    };
  }

  if (pathname === "/admin/profit-loss") {
    return {
      title: "Profit & Loss",
      actions: [],
    };
  }

  if (pathname === "/admin/users") {
    return {
      title: "Users & Roles",
      actions: [],
    };
  }

  return {
    title: "Administrator",
    actions: [],
  };
};

export const AdminTopbar = ({ onOpenNav }: { onOpenNav?: () => void }) => {
  const location = useLocation();
  const pageMeta = getPageMeta(location.pathname);
  const chrome = useOptionalAdminChrome();
  const { user } = useAuth();
  const initials = (user?.name?.trim()?.charAt(0) || "A").toUpperCase();
  const breadcrumb = chrome?.topbarBreadcrumb?.trim() || null;
  /** Only show topbar breadcrumb when chrome explicitly sets one (avoid duplicating page crumbs). */
  const showBreadcrumb = Boolean(breadcrumb);

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

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__inner">
        <div className="admin-topbar__content">
          {onOpenNav ? (
            <button
              type="button"
              className="admin-topbar__menu-btn"
              aria-label="Open navigation"
              onClick={onOpenNav}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          ) : null}
          {showBreadcrumb ? (
            <p className="admin-topbar__breadcrumb">
              {renderBreadcrumb(breadcrumb || pageMeta.title)}
            </p>
          ) : (
            <h1 className="admin-topbar__title">{pageMeta.title}</h1>
          )}
        </div>

        <div className="admin-topbar__controls">
          {pageMeta.actions.length > 0 ? (
            <div className="admin-topbar__actions">
              {pageMeta.actions.map((action) => (
                <Link
                  key={`${action.to}-${action.label}`}
                  className={`admin-topbar__action admin-topbar__action--${action.variant}`}
                  to={action.to}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="admin-topbar__profile" aria-label="Signed-in administrator">
            <span className="admin-topbar__avatar" aria-hidden="true">
              {initials}
            </span>
            <strong className="admin-topbar__profile-name">{user?.name || "Admin"}</strong>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
