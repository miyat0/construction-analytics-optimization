import { ROLE_NAMES, type UserRoleName } from "../types/auth";

export const ROLE_DASHBOARD_ROUTES: Record<UserRoleName, string> = {
  [ROLE_NAMES.COMPANY_ADMINISTRATOR]: "/admin/projects",
  [ROLE_NAMES.PROJECT_MANAGER]: "/project-manager/dashboard",
  [ROLE_NAMES.SITE_ENGINEER]: "/site-engineer/dashboard",
  [ROLE_NAMES.SUPERVISOR]: "/supervisor/dashboard",
  [ROLE_NAMES.WORKER]: "/worker/dashboard",
  [ROLE_NAMES.CLIENT]: "/client/dashboard",
};

const ROLE_ROUTE_PREFIXES: Record<UserRoleName, string[]> = {
  [ROLE_NAMES.COMPANY_ADMINISTRATOR]: ["/admin"],
  [ROLE_NAMES.PROJECT_MANAGER]: ["/project-manager"],
  [ROLE_NAMES.SITE_ENGINEER]: ["/site-engineer"],
  [ROLE_NAMES.SUPERVISOR]: ["/supervisor"],
  [ROLE_NAMES.WORKER]: ["/worker"],
  [ROLE_NAMES.CLIENT]: ["/client"],
};

export const getDashboardRouteForRole = (
  roleName?: string | null,
): string | null => {
  if (!roleName) {
    return null;
  }

  return ROLE_DASHBOARD_ROUTES[roleName as UserRoleName] ?? null;
};

const matchesProtectedPrefix = (pathname: string, prefix: string): boolean => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export const canRoleAccessPath = (
  roleName?: string | null,
  pathname?: string | null,
): boolean => {
  if (!roleName || !pathname) {
    return false;
  }

  const routePrefixes = ROLE_ROUTE_PREFIXES[roleName as UserRoleName] ?? [];

  return routePrefixes.some((prefix) => matchesProtectedPrefix(pathname, prefix));
};

export const resolvePostLoginRoute = (
  roleName?: string | null,
  requestedPath?: string | null,
): string => {
  const dashboardRoute = getDashboardRouteForRole(roleName);

  if (!dashboardRoute) {
    return "/access-denied";
  }

  if (requestedPath && canRoleAccessPath(roleName, requestedPath)) {
    return requestedPath;
  }

  return dashboardRoute;
};
