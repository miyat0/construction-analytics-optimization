import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { BrandLogo } from "../branding/BrandLogo";

import "./AdminSidebar.css";

const DashboardIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path d="M3 3h5v5H3V3Zm7 0h5v8h-5V3ZM3 10h5v5H3v-5Zm7 3h5v2h-5v-2Z" fill="currentColor" />
  </svg>
);

const ProjectsIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path d="M3 4.75A1.75 1.75 0 0 1 4.75 3h2.3c.46 0 .9.182 1.226.508l.716.717c.14.14.33.219.528.219h3.73A1.75 1.75 0 0 1 15 6.194v7.056A1.75 1.75 0 0 1 13.25 15H4.75A1.75 1.75 0 0 1 3 13.25V4.75Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M6 8.25h6M6 11.25h3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const UsersIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path d="M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.75 15.25A4.25 4.25 0 0 1 6 11h1a4.25 4.25 0 0 1 4.25 4.25M11 15.25a3.25 3.25 0 0 1 6.25 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

const LogoutIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path d="M6.75 3.75H5.5A1.75 1.75 0 0 0 3.75 5.5v7A1.75 1.75 0 0 0 5.5 14.25h1.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M10.5 6.25 13.25 9l-2.75 2.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M7 9h6.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

interface SidebarLink {
  to: string;
  label: string;
  icon: JSX.Element;
  matches: (pathname: string) => boolean;
}

interface AdminSidebarProps {
  onLogout: () => Promise<void>;
}

const navigationSections: Array<{ title: string; links: SidebarLink[] }> = [
  {
    title: "Overview",
    links: [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        icon: <DashboardIcon />,
        matches: (pathname) => pathname === "/admin/dashboard",
      },
    ],
  },
  {
    title: "Projects",
    links: [
      {
        to: "/admin/projects",
        label: "Projects",
        icon: <ProjectsIcon />,
        matches: (pathname) =>
          pathname === "/admin/projects" || pathname.startsWith("/admin/projects/"),
      },
    ],
  },
  {
    title: "Organization",
    links: [
      {
        to: "/admin/users",
        label: "Users & Roles",
        icon: <UsersIcon />,
        matches: (pathname) =>
          pathname === "/admin/users" ||
          pathname === "/admin/users/create" ||
          /^\/admin\/users\/\d+\/edit$/.test(pathname),
      },
    ],
  },
];

export const AdminSidebar = ({ onLogout }: AdminSidebarProps) => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <aside className="admin-sidebar">
      <NavLink className="admin-sidebar__brand" to="/admin/dashboard">
        <BrandLogo theme="light" />
      </NavLink>

      {navigationSections.map((section) => (
        <div key={section.title} className="admin-sidebar__section">
          <div className="admin-sidebar__section-title">{section.title}</div>
          <nav className="admin-sidebar__nav" aria-label={section.title}>
            {section.links.map((link) => {
              const isActive = link.matches(pathname);

              return (
                <NavLink
                  key={link.to}
                  className={`admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`.trim()}
                  to={link.to}
                >
                  <span className="admin-sidebar__icon">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__profile">
          <span className="admin-sidebar__profile-name">{user?.name ?? "Administrator"}</span>
          <span className="admin-sidebar__profile-role">
            {user?.role.role_name ?? "Company Administrator"}
          </span>
        </div>

        <nav className="admin-sidebar__footer-nav" aria-label="Account actions">
          <button
            type="button"
            className="admin-sidebar__link admin-sidebar__footer-link"
            onClick={() => void onLogout()}
          >
            <span className="admin-sidebar__icon">
              <LogoutIcon />
            </span>
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
