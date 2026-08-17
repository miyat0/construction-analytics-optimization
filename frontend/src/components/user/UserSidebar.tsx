import { NavLink } from "react-router-dom";

import { getDashboardRouteForRole } from "../../config/roleRoutes";
import { ROLE_NAMES } from "../../types/auth";
import { useAuth } from "../../hooks/useAuth";
import { BrandLogo } from "../branding/BrandLogo";

import "./UserSidebar.css";

interface UserSidebarProps {
  onLogout?: () => Promise<void> | void;
}

const DashboardIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path d="M3 3h5v5H3V3Zm7 0h5v8h-5V3ZM3 10h5v5H3v-5Zm7 3h5v2h-5v-2Z" fill="currentColor" />
  </svg>
);

const ProjectsIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
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

const getPrimaryNav = (roleName?: string | null) => {
  if (roleName === ROLE_NAMES.PROJECT_MANAGER || roleName === ROLE_NAMES.CLIENT) {
    return {
      label: "Projects",
      icon: <ProjectsIcon />,
    };
  }

  return {
    label: "Dashboard",
    icon: <DashboardIcon />,
  };
};

export const UserSidebar = ({ onLogout: _onLogout }: UserSidebarProps) => {
  const { user } = useAuth();

  const dashboardRoute = getDashboardRouteForRole(user?.role.role_name) ?? "/dashboard";
  const primaryNav = getPrimaryNav(user?.role.role_name);

  return (
    <aside className="user-sidebar">
      <NavLink className="user-sidebar__brand" to={dashboardRoute}>
        <BrandLogo theme="light" />
      </NavLink>

      <div className="user-sidebar__section">
        <div className="user-sidebar__section-title">Workspace</div>
        <nav className="user-sidebar__nav" aria-label="User workspace navigation">
          <NavLink
            className={({ isActive }) =>
              `user-sidebar__link ${isActive ? "user-sidebar__link--active" : ""}`.trim()
            }
            to={dashboardRoute}
          >
            <span className="user-sidebar__icon">{primaryNav.icon}</span>
            <span>{primaryNav.label}</span>
          </NavLink>
        </nav>
      </div>

      <div className="user-sidebar__footer">
        <div className="user-sidebar__profile">
          <span className="user-sidebar__profile-name">{user?.name ?? "Workspace User"}</span>
          <span className="user-sidebar__profile-role">
            {user?.role.role_name ?? "Protected User"}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default UserSidebar;
