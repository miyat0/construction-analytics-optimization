import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import {
  approveMilestoneTask,
  createMilestoneExtension,
  createMilestoneTask,
  createProjectDocument,
  createProjectMilestone,
  deleteMilestoneExtension,
  deleteMilestoneTask,
  deleteProjectDocument,
  deleteProjectMilestone,
  getProject,
  listMilestoneExtensions,
  listMilestoneTasks,
  listPendingApprovalTasks,
  listProjectConcerns,
  listProjectDailyUpdates,
  listProjectDocuments,
  listProjectMilestones,
  rejectMilestoneTask,
  resolveProjectConcern,
  updateMilestoneTask,
  updateProjectDocument,
  updateProjectMilestone,
} from "../../services/projectApi";
import type {
  DailyTaskUpdate,
  Milestone,
  MilestoneExtension,
  MilestonePayload,
  MilestoneTask,
  MilestoneTaskPayload,
  ProjectDetail,
  ProjectDocument,
} from "../../types/project";
import {
  getProjectViewBasePath,
  getProjectsBasePath,
  resolveProjectScopeFromPath,
  type ProjectWorkspaceScope,
} from "../../utils/projectCreateRoutes";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";
import { StatusBadge } from "../ui/StatusBadge";

import "./ProjectDetailLayout.css";

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

const formatStatus = (project: ProjectDetail): string =>
  project.is_archived
    ? "Archived"
    : project.status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatHeaderDate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

type ProjectDetailContextValue = {
  scope: ProjectWorkspaceScope;
  projectId: number;
  project: ProjectDetail | null;
  milestones: Milestone[];
  documents: ProjectDocument[];
  isLoading: boolean;
  isExecutionLoading: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  setNoticeMessage: (value: string | null) => void;
  setErrorMessage: (value: string | null) => void;
  refreshProject: () => Promise<void>;
  loadMilestoneExecution: (milestoneId: number) => Promise<{
    tasks: MilestoneTask[];
    extensions: MilestoneExtension[];
    pendingApprovalTasks: MilestoneTask[];
    dailyUpdates: DailyTaskUpdate[];
    concerns: DailyTaskUpdate[];
  }>;
  // CRUD handlers used by tab pages
  handleCreateMilestone: (payload: MilestonePayload) => Promise<void>;
  handleUpdateMilestone: (milestoneId: number, payload: Partial<MilestonePayload>) => Promise<void>;
  handleDeleteMilestone: (milestoneId: number) => Promise<void>;
  handleCreateTask: (milestoneId: number, payload: MilestoneTaskPayload) => Promise<void>;
  handleUpdateTask: (
    milestoneId: number,
    taskId: number,
    payload: Partial<MilestoneTaskPayload>,
  ) => Promise<void>;
  handleDeleteTask: (milestoneId: number, taskId: number) => Promise<void>;
  handleApproveTask: (milestoneId: number, taskId: number) => Promise<void>;
  handleCreateExtension: (
    milestoneId: number,
    payload: { new_end_date: string; reason?: string },
  ) => Promise<void>;
  handleDeleteExtension: (milestoneId: number, extensionId: number) => Promise<void>;
  handleCreateDocument: (payload: FormData) => Promise<void>;
  handleUpdateDocument: (documentId: number, payload: FormData) => Promise<void>;
  handleDeleteDocument: (documentId: number) => Promise<void>;
  handleResolveConcern: (updateId: number) => Promise<void>;
  handleApprovePendingTask: (task: MilestoneTask) => Promise<void>;
  handleRejectPendingTask: (task: MilestoneTask, note?: string) => Promise<void>;
  basePath: string;
};

const ProjectDetailContext = createContext<ProjectDetailContextValue | null>(null);

export const useProjectDetail = (): ProjectDetailContextValue => {
  const context = useContext(ProjectDetailContext);
  if (!context) {
    throw new Error("useProjectDetail must be used within ProjectDetailLayout.");
  }
  return context;
};

export const ProjectDetailLayout = () => {
  const selectedProjectId = useSelectedProjectId();
  const location = useLocation();
  const navigate = useNavigate();
  const scope = resolveProjectScopeFromPath(location.pathname);
  const basePath = getProjectsBasePath(scope);
  const viewBasePath = getProjectViewBasePath(scope);

  useEffect(() => {
    if (!selectedProjectId) {
      navigate(basePath, { replace: true });
    }
  }, [basePath, navigate, selectedProjectId]);

  const projectId = selectedProjectId ?? 0;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutionLoading, setIsExecutionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const refreshProject = useCallback(async () => {
    if (!selectedProjectId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [nextProject, milestoneData, documentData] = await Promise.all([
        getProject(selectedProjectId),
        listProjectMilestones(selectedProjectId),
        listProjectDocuments(selectedProjectId),
      ]);
      setProject(nextProject);
      setMilestones(milestoneData.results);
      setDocuments(documentData.results);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load the project right now."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  useEffect(() => {
    const state = location.state as { notice?: string; openMilestoneId?: number } | null;
    if (!state) {
      return;
    }

    if (state.notice) {
      setNoticeMessage(state.notice);
    }

    if (typeof state.openMilestoneId === "number") {
      navigate(`${viewBasePath}/milestones/${state.openMilestoneId}`, {
        replace: true,
        state: { projectId, notice: state.notice },
      });
      return;
    }

    if (state.notice) {
      navigate(location.pathname, { replace: true, state: { projectId } });
    }
  }, [location.pathname, location.state, navigate, projectId, viewBasePath]);

  const loadMilestoneExecution = useCallback(
    async (milestoneId: number) => {
      setIsExecutionLoading(true);
      try {
        const [taskData, extensionData, pendingData, updatesData, concernsData] =
          await Promise.all([
            listMilestoneTasks(projectId, milestoneId),
            listMilestoneExtensions(projectId, milestoneId),
            listPendingApprovalTasks(projectId),
            listProjectDailyUpdates(projectId),
            listProjectConcerns(projectId),
          ]);
        return {
          tasks: taskData.results,
          extensions: extensionData.results,
          pendingApprovalTasks: pendingData.results,
          dailyUpdates: updatesData.results,
          concerns: concernsData.results,
        };
      } finally {
        setIsExecutionLoading(false);
      }
    },
    [projectId],
  );

  const handleCreateMilestone = async (payload: MilestonePayload) => {
    await createProjectMilestone(projectId, payload);
    setNoticeMessage("Milestone added successfully.");
    await refreshProject();
  };

  const handleUpdateMilestone = async (
    milestoneId: number,
    payload: Partial<MilestonePayload>,
  ) => {
    await updateProjectMilestone(projectId, milestoneId, payload);
    setNoticeMessage("Milestone updated successfully.");
    await refreshProject();
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    await deleteProjectMilestone(projectId, milestoneId);
    setNoticeMessage("Milestone deleted successfully.");
    await refreshProject();
  };

  const handleCreateTask = async (milestoneId: number, payload: MilestoneTaskPayload) => {
    await createMilestoneTask(projectId, milestoneId, payload);
    setNoticeMessage("Task created successfully.");
  };

  const handleUpdateTask = async (
    milestoneId: number,
    taskId: number,
    payload: Partial<MilestoneTaskPayload>,
  ) => {
    await updateMilestoneTask(projectId, milestoneId, taskId, payload);
    setNoticeMessage("Task updated successfully.");
  };

  const handleDeleteTask = async (milestoneId: number, taskId: number) => {
    await deleteMilestoneTask(projectId, milestoneId, taskId);
    setNoticeMessage("Task deleted successfully.");
  };

  const handleApproveTask = async (milestoneId: number, taskId: number) => {
    await approveMilestoneTask(projectId, milestoneId, taskId);
    setNoticeMessage("Task approved successfully.");
  };

  const handleCreateExtension = async (
    milestoneId: number,
    payload: { new_end_date: string; reason?: string },
  ) => {
    await createMilestoneExtension(projectId, milestoneId, payload);
    setNoticeMessage("Timeline extension added successfully.");
    await refreshProject();
  };

  const handleDeleteExtension = async (milestoneId: number, extensionId: number) => {
    await deleteMilestoneExtension(projectId, milestoneId, extensionId);
    setNoticeMessage("Timeline extension deleted successfully.");
    await refreshProject();
  };

  const handleCreateDocument = async (payload: FormData) => {
    await createProjectDocument(projectId, payload);
    setNoticeMessage("Document uploaded successfully.");
    await refreshProject();
  };

  const handleUpdateDocument = async (documentId: number, payload: FormData) => {
    await updateProjectDocument(projectId, documentId, payload);
    setNoticeMessage("Document updated successfully.");
    await refreshProject();
  };

  const handleDeleteDocument = async (documentId: number) => {
    await deleteProjectDocument(projectId, documentId);
    setNoticeMessage("Document deleted successfully.");
    await refreshProject();
  };

  const handleResolveConcern = async (updateId: number) => {
    await resolveProjectConcern(projectId, updateId, true);
    setNoticeMessage("Concern resolved successfully.");
  };

  const handleApprovePendingTask = async (task: MilestoneTask) => {
    await approveMilestoneTask(projectId, task.milestone.milestone_id, task.task_id);
    setNoticeMessage("Task approved successfully.");
  };

  const handleRejectPendingTask = async (task: MilestoneTask, note = "") => {
    await rejectMilestoneTask(
      projectId,
      task.milestone.milestone_id,
      task.task_id,
      note.trim() || "Rejected",
    );
    setNoticeMessage("Task rejected successfully.");
  };

  const value = useMemo<ProjectDetailContextValue>(
    () => ({
      scope,
      projectId,
      project,
      milestones,
      documents,
      isLoading,
      isExecutionLoading,
      errorMessage,
      noticeMessage,
      setNoticeMessage,
      setErrorMessage,
      refreshProject,
      loadMilestoneExecution,
      handleCreateMilestone,
      handleUpdateMilestone,
      handleDeleteMilestone,
      handleCreateTask,
      handleUpdateTask,
      handleDeleteTask,
      handleApproveTask,
      handleCreateExtension,
      handleDeleteExtension,
      handleCreateDocument,
      handleUpdateDocument,
      handleDeleteDocument,
      handleResolveConcern,
      handleApprovePendingTask,
      handleRejectPendingTask,
      basePath,
    }),
    [
      scope,
      projectId,
      project,
      milestones,
      documents,
      isLoading,
      isExecutionLoading,
      errorMessage,
      noticeMessage,
      refreshProject,
      loadMilestoneExecution,
      basePath,
    ],
  );

  const hideProjectTabs =
    /\/milestones\/\d+/.test(location.pathname) &&
    !location.pathname.includes("/milestones/new");

  useEffect(() => {
    const scrollRoot =
      document.querySelector<HTMLElement>(".admin-layout__body") ||
      document.querySelector<HTMLElement>(".user-workspace-layout__body");
    if (scrollRoot) {
      scrollRoot.scrollTop = 0;
    }
  }, [location.pathname]);

  if (!selectedProjectId) {
    return null;
  }

  return (
    <ProjectDetailContext.Provider value={value}>
      <div className="project-detail-layout project-workspace">
        <nav className="project-detail-layout__breadcrumb" aria-label="Breadcrumb">
          <Link to={basePath}>Projects</Link>
          <span aria-hidden="true">/</span>
          {hideProjectTabs ? (
            <Link to={`${viewBasePath}/overview`} state={{ projectId }}>
              {formatDisplayTitle(project?.project_name) || "Project"}
            </Link>
          ) : (
            <span className="project-detail-layout__crumb-current">
              {formatDisplayTitle(project?.project_name) || "Project"}
            </span>
          )}
          {hideProjectTabs ? (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`${viewBasePath}/milestones`} state={{ projectId }}>
                Milestones
              </Link>
              <span aria-hidden="true">/</span>
              <span className="project-detail-layout__crumb-current">
                {formatDisplayTitle(
                  milestones.find((item) =>
                    location.pathname.includes(`/milestones/${item.milestone_id}`),
                  )?.title,
                ) || "Milestone"}
              </span>
            </>
          ) : null}
        </nav>

        {noticeMessage ? (
          <div className="alert alert-success mb-0">{noticeMessage}</div>
        ) : null}
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        {!hideProjectTabs ? (
          <>
            <header className="project-detail-layout__header">
              <div className="project-detail-layout__header-main">
                <div className="project-detail-layout__title-row">
                  <h1 className="project-detail-layout__title">
                    {formatDisplayTitle(project?.project_name) || "Project"}
                  </h1>
                  {project ? (
                    <StatusBadge
                      className="status-badge--compact"
                      label={formatStatus(project)}
                      tone={project.is_archived ? "archived" : project.status}
                    />
                  ) : null}
                </div>
                {project ? (
                  <p className="project-detail-layout__meta">
                    {[
                      [formatHeaderDate(project.start_date), formatHeaderDate(project.end_date)]
                        .filter(Boolean)
                        .join(" – "),
                      project.project_manager?.name
                        ? `Project Manager: ${project.project_manager.name}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                ) : null}
              </div>
              <div className="project-detail-layout__header-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary project-detail-layout__edit-btn"
                  onClick={() =>
                    navigate(basePath, {
                      state: { editProjectId: projectId },
                    })
                  }
                  disabled={!project}
                >
                  Edit Project
                </button>
              </div>
            </header>

            <nav className="project-detail-layout__tabs" aria-label="Project sections">
              <NavLink
                className={({ isActive }) =>
                  `project-detail-layout__tab${isActive ? " is-active" : ""}`
                }
                end
                to={`${viewBasePath}/overview`}
                state={{ projectId }}
              >
                Overview
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `project-detail-layout__tab${isActive ? " is-active" : ""}`
                }
                end
                to={`${viewBasePath}/milestones`}
                state={{ projectId }}
              >
                Milestones
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `project-detail-layout__tab${isActive ? " is-active" : ""}`
                }
                end
                to={`${viewBasePath}/documents`}
                state={{ projectId }}
              >
                Documents
              </NavLink>
            </nav>
          </>
        ) : null}

        <div className="project-detail-layout__content">
          {isLoading && !project ? (
            <div className="project-detail-layout__loading">Loading project...</div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </ProjectDetailContext.Provider>
  );
};

export default ProjectDetailLayout;
