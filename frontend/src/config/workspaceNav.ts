import { ROLE_NAMES, type UserRoleName } from "../types/auth";
import { ADMIN_PEOPLE_ROLES, getAdminPeoplePath } from "./adminPeople";

export type WorkspaceNavIcon =
  | "dashboard"
  | "projects"
  | "finance"
  | "users"
  | "tasks"
  | "attendance"
  | "needs"
  | "verify";

export type WorkspaceNavItem = {
  label: string;
  to: string;
  icon: WorkspaceNavIcon;
  end?: boolean;
  matches: (pathname: string) => boolean;
};

export type WorkspaceNavSection = {
  title: string;
  links: WorkspaceNavItem[];
};

const startsWith = (pathname: string, base: string): boolean =>
  pathname === base || pathname.startsWith(`${base}/`);

export const getWorkspaceNav = (roleName?: string | null): WorkspaceNavSection[] => {
  if (roleName === ROLE_NAMES.COMPANY_ADMINISTRATOR) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Dashboard",
            to: "/admin/dashboard",
            icon: "dashboard",
            end: true,
            matches: (pathname) => pathname === "/admin/dashboard",
          },
          {
            label: "Projects",
            to: "/admin/projects",
            icon: "projects",
            matches: (pathname) => startsWith(pathname, "/admin/projects"),
          },
          {
            label: "Profit & Loss",
            to: "/admin/profit-loss",
            icon: "finance",
            matches: (pathname) => startsWith(pathname, "/admin/profit-loss"),
          },
        ],
      },
      {
        title: "People",
        links: ADMIN_PEOPLE_ROLES.map((role) => ({
          label: role.navLabel,
          to: getAdminPeoplePath(role.slug),
          icon: "users" as const,
          matches: (pathname: string) => startsWith(pathname, getAdminPeoplePath(role.slug)),
        })),
      },
    ];
  }

  if (roleName === ROLE_NAMES.PROJECT_MANAGER) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Projects",
            to: "/project-manager/projects",
            icon: "projects",
            matches: (pathname) =>
              pathname === "/project-manager/projects" ||
              pathname === "/project-manager/dashboard" ||
              startsWith(pathname, "/project-manager/projects"),
          },
          {
            label: "Profit & Loss",
            to: "/project-manager/profit-loss",
            icon: "finance",
            matches: (pathname) => startsWith(pathname, "/project-manager/profit-loss"),
          },
        ],
      },
    ];
  }

  if (roleName === ROLE_NAMES.SITE_ENGINEER) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Dashboard",
            to: "/site-engineer/dashboard",
            icon: "dashboard",
            end: true,
            matches: (pathname) => pathname === "/site-engineer/dashboard",
          },
          {
            label: "Projects",
            to: "/site-engineer/projects",
            icon: "projects",
            matches: (pathname) => startsWith(pathname, "/site-engineer/projects"),
          },
          {
            label: "Tasks",
            to: "/site-engineer/tasks",
            icon: "tasks",
            matches: (pathname) => startsWith(pathname, "/site-engineer/tasks"),
          },
          {
            label: "Verifications",
            to: "/site-engineer/verifications",
            icon: "verify",
            matches: (pathname) => startsWith(pathname, "/site-engineer/verifications"),
          },
        ],
      },
    ];
  }

  if (roleName === ROLE_NAMES.SUPERVISOR) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Dashboard",
            to: "/supervisor/dashboard",
            icon: "dashboard",
            end: true,
            matches: (pathname) => pathname === "/supervisor/dashboard",
          },
          {
            label: "Verifications",
            to: "/supervisor/verifications",
            icon: "verify",
            matches: (pathname) => startsWith(pathname, "/supervisor/verifications"),
          },
          {
            label: "Projects",
            to: "/supervisor/projects",
            icon: "projects",
            matches: (pathname) => startsWith(pathname, "/supervisor/projects"),
          },
        ],
      },
    ];
  }

  if (roleName === ROLE_NAMES.WORKER) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Dashboard",
            to: "/worker/dashboard",
            icon: "dashboard",
            end: true,
            matches: (pathname) => pathname === "/worker/dashboard",
          },
          {
            label: "Tasks",
            to: "/worker/tasks",
            icon: "tasks",
            matches: (pathname) => startsWith(pathname, "/worker/tasks"),
          },
          {
            label: "Attendance",
            to: "/worker/attendance",
            icon: "attendance",
            matches: (pathname) => startsWith(pathname, "/worker/attendance"),
          },
          {
            label: "Workplace Needs",
            to: "/worker/workplace-needs",
            icon: "needs",
            matches: (pathname) => startsWith(pathname, "/worker/workplace-needs"),
          },
        ],
      },
    ];
  }

  if (roleName === ROLE_NAMES.CLIENT) {
    return [
      {
        title: "Workspace",
        links: [
          {
            label: "Projects",
            to: "/client/dashboard",
            icon: "projects",
            matches: (pathname) =>
              pathname === "/client/dashboard" ||
              pathname === "/client/projects" ||
              startsWith(pathname, "/client/projects") ||
              startsWith(pathname, "/client/dashboard"),
          },
        ],
      },
    ];
  }

  return [];
};

export const getWorkspaceBrandTo = (roleName?: UserRoleName | string | null): string => {
  switch (roleName) {
    case ROLE_NAMES.COMPANY_ADMINISTRATOR:
      return "/admin/dashboard";
    case ROLE_NAMES.PROJECT_MANAGER:
      return "/project-manager/projects";
    case ROLE_NAMES.SITE_ENGINEER:
      return "/site-engineer/dashboard";
    case ROLE_NAMES.SUPERVISOR:
      return "/supervisor/dashboard";
    case ROLE_NAMES.WORKER:
      return "/worker/dashboard";
    case ROLE_NAMES.CLIENT:
      return "/client/dashboard";
    default:
      return "/dashboard";
  }
};
