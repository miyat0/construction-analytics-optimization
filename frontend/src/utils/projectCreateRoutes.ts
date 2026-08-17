import type { NavigateFunction } from "react-router-dom";

import { setSelectedProjectId } from "./selectedProjectSession";

export type ProjectWorkspaceScope = "admin" | "project-manager";

export const getProjectsBasePath = (scope: ProjectWorkspaceScope): string =>
  scope === "admin" ? "/admin/projects" : "/project-manager/projects";

export const resolveProjectScopeFromPath = (pathname: string): ProjectWorkspaceScope =>
  pathname.startsWith("/project-manager") ? "project-manager" : "admin";

/** Clean project workspace base (no numeric project ID in the URL). */
export const getProjectViewBasePath = (scope: ProjectWorkspaceScope): string =>
  `${getProjectsBasePath(scope)}/view`;

export const getProjectWorkspacePath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  tab: "overview" | "milestones" | "documents" = "overview",
): string => `${getProjectViewBasePath(scope)}/${tab}`;

export const getProjectMilestonePath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
): string => `${getProjectViewBasePath(scope)}/milestones/${milestoneId}`;

export const getCreateMilestonePath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
): string => `${getProjectViewBasePath(scope)}/milestones/new`;

export const getCreateDocumentPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
): string => `${getProjectViewBasePath(scope)}/documents/new`;

export const getCreateTaskPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
): string => `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/tasks/new`;

export const getCreateExtensionPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
): string => `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/extensions/new`;

export const getEditTaskPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
  taskId: number,
): string =>
  `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/tasks/${taskId}/edit`;

export const getViewTaskPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
  taskId: number,
): string => `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/tasks/${taskId}`;

export const getEditExtensionPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
  extensionId: number,
): string =>
  `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/extensions/${extensionId}/edit`;

export const getViewExtensionPath = (
  scope: ProjectWorkspaceScope,
  _projectId: number,
  milestoneId: number,
  extensionId: number,
): string =>
  `${getProjectViewBasePath(scope)}/milestones/${milestoneId}/extensions/${extensionId}`;

export const navigateToProjectWorkspace = (
  navigate: NavigateFunction,
  scope: ProjectWorkspaceScope,
  projectId: number,
  tab: "overview" | "milestones" | "documents" = "overview",
): void => {
  setSelectedProjectId(projectId);
  navigate(getProjectWorkspacePath(scope, projectId, tab), {
    state: { projectId },
  });
};

/** @deprecated Prefer navigating to getProjectWorkspacePath — kept for legacy state handling. */
export type ReturnToProjectState = {
  openProjectId: number;
  detailsTab: "overview" | "milestones" | "documents";
  openMilestoneId?: number;
  notice?: string;
};

export type WorkspaceNoticeState = {
  notice?: string;
};
