import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import {
  createProject,
  deleteProject,
  fetchProjectLookups,
  getProject,
  listProjectDocuments,
  listProjectMilestones,
  listProjects,
  updateProject,
} from "../../services/projectApi";
import type {
  ProjectDetail,
  ProjectLookupData,
  ProjectPayload,
  ProjectSummary,
} from "../../types/project";
import { ProjectForm } from "./ProjectForm";
import { ProjectFormModal } from "./ProjectFormModal";
import { ProjectList } from "./ProjectList";
import { ProjectQuickViewModal } from "./ProjectQuickViewModal";
import {
  getProjectMilestonePath,
  navigateToProjectWorkspace,
  type ProjectWorkspaceScope,
  type ReturnToProjectState,
} from "../../utils/projectCreateRoutes";
import { setSelectedProjectId } from "../../utils/selectedProjectSession";

import "./ProjectWorkspace.css";

interface ProjectWorkspaceProps {
  scope: ProjectWorkspaceScope;
  /**
   * When true, the parent page owns the primary title.
   * Workspace shows a compact section header (count + New Project).
   */
  embedded?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

const emptyLookups: ProjectLookupData = {
  project_managers: [],
  clients: [],
  site_engineers: [],
  supervisors: [],
  workers: [],
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

export const ProjectWorkspace = ({
  scope,
  embedded = false,
  pageTitle = "Projects",
  pageSubtitle = "Create, track, and manage all construction projects in one place.",
}: ProjectWorkspaceProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  useProjectCreateChrome(scope === "admin" ? "Management / Projects" : "Projects");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [lookups, setLookups] = useState<ProjectLookupData>(emptyLookups);
  const [quickViewProject, setQuickViewProject] = useState<ProjectDetail | null>(null);
  const [quickViewMilestoneCount, setQuickViewMilestoneCount] = useState(0);
  const [quickViewDocumentCount, setQuickViewDocumentCount] = useState(0);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isQuickViewLoading, setIsQuickViewLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const canSelectProjectManager = scope === "admin";
  /** Backend allows Company Admin + Project Manager to create projects. */
  const canCreateProjects = scope === "admin" || scope === "project-manager";
  const useLiveFilter = embedded || scope === "project-manager";

  const filteredProjects = useMemo(() => {
    const query = (useLiveFilter ? searchInput : submittedSearch).trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter === "archived") {
        if (!project.is_archived) {
          return false;
        }
      } else if (statusFilter) {
        if (project.is_archived || project.status !== statusFilter) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = [
        project.project_name,
        project.project_manager?.name ?? "",
        project.client?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [projects, statusFilter, searchInput, submittedSearch, useLiveFilter]);

  const projectCountLabel =
    filteredProjects.length === 1 ? "1 project" : `${filteredProjects.length} projects`;

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projectData, lookupData] = await Promise.all([
        listProjects(),
        fetchProjectLookups(),
      ]);
      setProjects(projectData.results);
      setLookups(lookupData);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load project workspace data right now."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingProject(null);
    setErrorMessage(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenQuickView = useCallback(async (projectId: number) => {
    setIsQuickViewOpen(true);
    setIsQuickViewLoading(true);
    setErrorMessage(null);
    try {
      const [project, milestoneData, documentData] = await Promise.all([
        getProject(projectId),
        listProjectMilestones(projectId),
        listProjectDocuments(projectId),
      ]);
      setQuickViewProject(project);
      setQuickViewMilestoneCount(milestoneData.results.length);
      setQuickViewDocumentCount(documentData.results.length);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load the selected project right now."));
      setIsQuickViewOpen(false);
    } finally {
      setIsQuickViewLoading(false);
    }
  }, []);

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewProject(null);
  };

  const handleOpenFullProject = (projectId: number, tab: "overview" | "milestones" | "documents" = "overview") => {
    handleCloseQuickView();
    navigateToProjectWorkspace(navigate, scope, projectId, tab);
  };

  const handleOpenEditModal = async (project: ProjectSummary | ProjectDetail) => {
    setErrorMessage(null);
    try {
      const detail = await getProject(project.project_id);
      setEditingProject(detail);
      setIsFormModalOpen(true);
      setIsQuickViewOpen(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to open the project editor right now."));
    }
  };

  useEffect(() => {
    const routeState = location.state as
      | (Partial<ReturnToProjectState> & {
          openCreate?: boolean;
          editProjectId?: number;
          notice?: string;
        })
      | null;

    if (!routeState) {
      return;
    }

    if (routeState.notice) {
      setNoticeMessage(String(routeState.notice));
    }

    if (routeState.openCreate) {
      handleOpenCreateModal();
    }

    if (typeof routeState.editProjectId === "number") {
      void (async () => {
        try {
          const detail = await getProject(routeState.editProjectId as number);
          setEditingProject(detail);
          setIsFormModalOpen(true);
        } catch {
          setErrorMessage("Unable to open the project editor right now.");
        }
      })();
    }

    if (typeof routeState.openProjectId === "number") {
      setSelectedProjectId(routeState.openProjectId);
      if (typeof routeState.openMilestoneId === "number") {
        navigate(
          getProjectMilestonePath(
            scope,
            routeState.openProjectId,
            routeState.openMilestoneId,
          ),
          {
            replace: true,
            state: {
              projectId: routeState.openProjectId,
              openMilestoneId: routeState.openMilestoneId,
              notice: routeState.notice,
            },
          },
        );
        return;
      }

      navigateToProjectWorkspace(
        navigate,
        scope,
        routeState.openProjectId,
        routeState.detailsTab ?? "overview",
      );
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [handleOpenCreateModal, location.pathname, location.state, navigate, scope]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!useLiveFilter) {
      setSubmittedSearch(searchInput);
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSubmittedSearch("");
    setStatusFilter("");
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmitProject = async (payload: ProjectPayload) => {
    setIsFormSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingProject) {
        await updateProject(editingProject.project_id, payload);
        setNoticeMessage("Project updated successfully.");
      } else {
        await createProject(payload);
        setNoticeMessage("Project created successfully.");
      }
      handleCloseFormModal();
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save the project right now."));
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDeleteProject = async (project: ProjectSummary) => {
    const confirmed = window.confirm(
      `Delete project?\n\nAre you sure you want to permanently delete "${project.project_name}"?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(project.project_id);
      setNoticeMessage("Project deleted successfully.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete the project right now."));
    }
  };

  return (
    <div className={`project-workspace${embedded ? " project-workspace--embedded" : ""}`}>
      {embedded ? (
        <div className="project-workspace__section-header">
          <div className="project-workspace__section-heading">
            <h2 className="project-workspace__section-title">Projects</h2>
            <span className="project-workspace__section-count">{projectCountLabel}</span>
          </div>
          {canCreateProjects ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary project-workspace__new-btn"
              onClick={handleOpenCreateModal}
            >
              New Project
              <span className="admin-btn__plus" aria-hidden="true">
                +
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="project-workspace__page-header">
          <div className="project-workspace__page-heading">
            <h1 className="project-workspace__page-title">{pageTitle}</h1>
            {pageSubtitle ? (
              <p className="project-workspace__page-subtitle">{pageSubtitle}</p>
            ) : null}
          </div>
          {canCreateProjects ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary project-workspace__new-btn"
              onClick={handleOpenCreateModal}
            >
              New Project
              <span className="admin-btn__plus" aria-hidden="true">
                +
              </span>
            </button>
          ) : null}
        </div>
      )}

      {noticeMessage ? <div className="alert alert-success mb-0">{noticeMessage}</div> : null}
      {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

      <ProjectList
        projects={filteredProjects}
        selectedProjectId={null}
        isLoading={isLoading}
        showNewProjectButton={false}
        searchValue={searchInput}
        statusFilter={statusFilter}
        onSearchChange={setSearchInput}
        onStatusFilterChange={setStatusFilter}
        onSearchSubmit={handleSearchSubmit}
        onResetFilters={handleResetFilters}
        onNewProject={handleOpenCreateModal}
        onView={(project) => void handleOpenQuickView(project.project_id)}
        onEdit={(project) => void handleOpenEditModal(project)}
        onDelete={(project) => void handleDeleteProject(project)}
        liveFilter={useLiveFilter}
        resetLabel="Clear"
      />

      <ProjectQuickViewModal
        isOpen={isQuickViewOpen}
        project={quickViewProject}
        isLoading={isQuickViewLoading}
        milestoneCount={quickViewMilestoneCount}
        documentCount={quickViewDocumentCount}
        onClose={handleCloseQuickView}
        onOpenProject={() => {
          if (quickViewProject) {
            handleOpenFullProject(quickViewProject.project_id);
          }
        }}
        onEdit={
          quickViewProject ? () => void handleOpenEditModal(quickViewProject) : undefined
        }
      />

      <ProjectFormModal
        isOpen={isFormModalOpen}
        title={editingProject ? "Edit Project" : "New Project"}
        onClose={handleCloseFormModal}
      >
        <ProjectForm
          title={editingProject ? "Edit Project" : "New Project"}
          description=""
          submitLabel={editingProject ? "Save Changes" : "Create Project"}
          initialProject={editingProject}
          projectManagers={lookups.project_managers}
          clients={lookups.clients}
          siteEngineers={lookups.site_engineers}
          supervisors={lookups.supervisors}
          canSelectProjectManager={canSelectProjectManager}
          isSubmitting={isFormSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmitProject}
          onCancel={handleCloseFormModal}
        />
      </ProjectFormModal>
    </div>
  );
};

export default ProjectWorkspace;
