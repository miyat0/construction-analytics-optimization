import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { getDashboardRouteForRole } from "../../config/roleRoutes";
import { ROLE_NAMES } from "../../types/auth";
import { useAuth } from "../../hooks/useAuth";
import { BrandLogo } from "../branding/BrandLogo";

import "./UserSidebar.css";

interface UserSidebarProps {
  onLogout?: () => Promise<void> | void;
  isMobileOpen?: boolean;
  onNavigate?: () => void;
}

const DashboardIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 18 18" width="16">
    <path d="M3 3h5v5H3V3Zm7 0h5v8h-5V3ZM3 10h5v5H3v-5Zm7 3h5v2h-5v-2Z" fill="currentColor" />
  </svg>
);

const ProjectsIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 18 18" width="16">
    <path
      d="M3 4.75A1.75 1.75 0 0 1 4.75 3h2.3c.46 0 .9.182 1.226.508l.716.717c.14.14.33.219.528.219h3.73A1.75 1.75 0 0 1 15 6.194v7.056A1.75 1.75 0 0 1 13.25 15H4.75A1.75 1.75 0 0 1 3 13.25V4.75Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M6 8.25h6M6 11.25h3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

const TasksIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 18 18" width="16">
    <path
      d="M6.5 4h5M7 2.75h4A1 1 0 0 1 12 3.75V5H6V3.75A1 1 0 0 1 7 2.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5.5 5h7A1.5 1.5 0 0 1 14 6.5v8A1.5 1.5 0 0 1 12.5 16h-7A1.5 1.5 0 0 1 4 14.5v-8A1.5 1.5 0 0 1 5.5 5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M7 9.25h4M7 12h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const AttendanceIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 18 18" width="16">
    <path
      d="M9 15.25a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M9 6.25V9l2 1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const NeedsIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 18 18" width="16">
    <path
      d="M5 3.75h8A1.25 1.25 0 0 1 14.25 5v10L9 12.5 3.75 15V5A1.25 1.25 0 0 1 5 3.75Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
};

const getNavItems = (roleName?: string | null): NavItem[] => {
  if (roleName === ROLE_NAMES.WORKER) {
    return [
      { label: "Dashboard", to: "/worker/dashboard", icon: <DashboardIcon />, end: true },
      { label: "Tasks", to: "/worker/tasks", icon: <TasksIcon /> },
      { label: "Attendance", to: "/worker/attendance", icon: <AttendanceIcon /> },
      { label: "Workplace Needs", to: "/worker/workplace-needs", icon: <NeedsIcon /> },
    ];
  }

  if (roleName === ROLE_NAMES.SUPERVISOR) {
    return [
      { label: "Dashboard", to: "/supervisor/dashboard", icon: <DashboardIcon />, end: true },
      { label: "Verifications", to: "/supervisor/verifications", icon: <TasksIcon /> },
      { label: "Projects", to: "/supervisor/projects", icon: <ProjectsIcon /> },
    ];
  }

  if (roleName === ROLE_NAMES.SITE_ENGINEER) {
    return [
      { label: "Dashboard", to: "/site-engineer/dashboard", icon: <DashboardIcon />, end: true },
      { label: "Projects", to: "/site-engineer/projects", icon: <ProjectsIcon /> },
      { label: "Tasks", to: "/site-engineer/tasks", icon: <TasksIcon /> },
      { label: "Verifications", to: "/site-engineer/verifications", icon: <NeedsIcon /> },
    ];
  }

  if (roleName === ROLE_NAMES.PROJECT_MANAGER) {
    return [{ label: "Projects", to: "/project-manager/projects", icon: <ProjectsIcon /> }];
  }

  if (roleName === ROLE_NAMES.CLIENT) {
    const dashboardRoute = getDashboardRouteForRole(roleName) ?? "/dashboard";
    return [{ label: "Projects", to: dashboardRoute, icon: <ProjectsIcon /> }];
  }

  const dashboardRoute = getDashboardRouteForRole(roleName) ?? "/dashboard";
  return [{ label: "Dashboard", to: dashboardRoute, icon: <DashboardIcon /> }];
};

export const UserSidebar = ({
  onLogout: _onLogout,
  isMobileOpen = false,
  onNavigate,
}: UserSidebarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const dashboardRoute = getDashboardRouteForRole(user?.role.role_name) ?? "/dashboard";
  const navItems = getNavItems(user?.role.role_name);
  const initials = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();

  return (
    <aside
      className={`user-sidebar${isMobileOpen ? " user-sidebar--open" : ""}`.trim()}
      data-role={user?.role.role_name ?? undefined}
    >
      <NavLink className="user-sidebar__brand" to={dashboardRoute} onClick={onNavigate}>
        <BrandLogo theme="light" />
      </NavLink>

      <div className="user-sidebar__section">
        <div className="user-sidebar__section-title">Workspace</div>
        <nav
          className="user-sidebar__nav"
          aria-label={
            user?.role.role_name === ROLE_NAMES.WORKER
              ? "Worker navigation"
              : user?.role.role_name === ROLE_NAMES.SUPERVISOR
                ? "Supervisor navigation"
                : user?.role.role_name === ROLE_NAMES.SITE_ENGINEER
                  ? "Site Engineer navigation"
                  : "Workspace navigation"
          }
        >
          {navItems.map((item) => {
            let isActive = item.end
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            // Dashboard and Projects share the same PM listing page.
            if (
              user?.role.role_name === ROLE_NAMES.PROJECT_MANAGER &&
              item.to === "/project-manager/projects"
            ) {
              isActive =
                location.pathname === "/project-manager/projects" ||
                location.pathname === "/project-manager/dashboard" ||
                location.pathname.startsWith("/project-manager/projects/");
            }

            return (
              <NavLink
                key={item.to}
                className={`user-sidebar__link${isActive ? " user-sidebar__link--active" : ""}`.trim()}
                to={item.to}
                end={item.end}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
              >
                <span className="user-sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="user-sidebar__footer">
        <div className="user-sidebar__profile">
          <span className="user-sidebar__profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="user-sidebar__profile-copy">
            <span className="user-sidebar__profile-name">{user?.name ?? "Workspace User"}</span>
            <span className="user-sidebar__profile-role">
              {user?.role.role_name ?? "Protected User"}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default UserSidebar;
