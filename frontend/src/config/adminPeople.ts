import { ROLE_NAMES, type UserRoleName } from "../types/auth";

export type AdminPeopleRoleConfig = {
  slug: string;
  roleName: UserRoleName;
  navLabel: string;
  pageTitle: string;
  addButtonLabel: string;
  modalTitle: string;
  modalDescription: string;
  createSubmitLabel: string;
  emptyTitle: string;
  emptyDescription: string;
};

export const ADMIN_PEOPLE_ROLES: AdminPeopleRoleConfig[] = [
  {
    slug: "project-managers",
    roleName: ROLE_NAMES.PROJECT_MANAGER,
    navLabel: "Project Managers",
    pageTitle: "Project Managers",
    addButtonLabel: "Add Project Manager",
    modalTitle: "Add Project Manager",
    modalDescription: "Create a project manager account.",
    createSubmitLabel: "Create Project Manager",
    emptyTitle: "No project managers found.",
    emptyDescription: "Create a project manager to own construction projects.",
  },
  {
    slug: "site-engineers",
    roleName: ROLE_NAMES.SITE_ENGINEER,
    navLabel: "Site Engineers",
    pageTitle: "Site Engineers",
    addButtonLabel: "Add Site Engineer",
    modalTitle: "Add Site Engineer",
    modalDescription: "Create a site engineer account.",
    createSubmitLabel: "Create Site Engineer",
    emptyTitle: "No site engineers found.",
    emptyDescription: "Create a site engineer for field verification work.",
  },
  {
    slug: "supervisors",
    roleName: ROLE_NAMES.SUPERVISOR,
    navLabel: "Supervisors",
    pageTitle: "Supervisors",
    addButtonLabel: "Add Supervisor",
    modalTitle: "Add Supervisor",
    modalDescription: "Create a supervisor account.",
    createSubmitLabel: "Create Supervisor",
    emptyTitle: "No supervisors found.",
    emptyDescription: "Create a supervisor to assign and verify site work.",
  },
  {
    slug: "workers",
    roleName: ROLE_NAMES.WORKER,
    navLabel: "Workers",
    pageTitle: "Workers",
    addButtonLabel: "Add Worker",
    modalTitle: "Add Worker",
    modalDescription: "Create a worker account for daily site updates.",
    createSubmitLabel: "Create Worker",
    emptyTitle: "No workers found.",
    emptyDescription: "Create a worker to submit daily task progress.",
  },
  {
    slug: "clients",
    roleName: ROLE_NAMES.CLIENT,
    navLabel: "Clients",
    pageTitle: "Clients",
    addButtonLabel: "Add Client",
    modalTitle: "Add Client",
    modalDescription: "Create a client account for project visibility.",
    createSubmitLabel: "Create Client",
    emptyTitle: "No clients found.",
    emptyDescription: "Create a client to share project progress.",
  },
];

export const getAdminPeopleRoleBySlug = (
  slug?: string | null,
): AdminPeopleRoleConfig | null => {
  if (!slug) {
    return null;
  }
  return ADMIN_PEOPLE_ROLES.find((role) => role.slug === slug) ?? null;
};

export const getAdminPeoplePath = (slug: string): string => `/admin/people/${slug}`;
