import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { ConcernPanel } from "../../components/projects/ConcernPanel";
import { DailyUpdateBoard } from "../../components/projects/DailyUpdateBoard";
import { ProjectTimeline } from "../../components/projects/ProjectTimeline";
import { TaskAssignmentManager } from "../../components/projects/TaskAssignmentManager";
import { WorkplaceNeedsPanel } from "../../components/projects/WorkplaceNeedsPanel";
import {
  DetailField,
  DetailModal,
  DetailOverviewGrid,
  DetailSection,
} from "../../components/ui/DetailModal";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  createTaskAssignment,
  deleteTaskAssignment,
  getProject,
  getProjectWorkerOptions,
  listMilestoneTasks,
  listProjectConcerns,
  listProjectMilestones,
  listProjectWorkplaceNeeds,
  listProjects,
  listSupervisorWorkplaceNeeds,
  resolveProjectConcern,
  reviewTaskUpdateBySupervisor,
  reviewWorkplaceNeedBySupervisor,
  updateTaskAssignment,
} from "../../services/projectApi";
import type {
  DailyTaskReviewPayload,
  DailyTaskUpdate,
  Milestone,
  MilestoneTask,
  ProjectDetail,
  ProjectLookupUser,
  ProjectSummary,
  TaskWorkerAssignmentPayload,
  WorkplaceNeed,
} from "../../types/project";
import { formatCurrencyINR } from "../../utils/formatCurrency";

import "./SupervisorPages.css";

type SupervisorDetailsTab =
  | "overview"
  | "milestones"
  | "assignments"
  | "needs"
  | "reports";

const SUPERVISOR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "assignments", label: "Assignments" },
  { id: "needs", label: "Needs" },
  { id: "reports", label: "Reports" },
] as const;

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const SupervisorProjectsPage = () => {
  useWorkspacePageTitle("Projects");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<SupervisorDetailsTab>("overview");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [workers, setWorkers] = useState<ProjectLookupUser[]>([]);
  const [projectConcerns, setProjectConcerns] = useState<DailyTaskUpdate[]>([]);
  const [projectNeeds, setProjectNeeds] = useState<WorkplaceNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const aggregatedUpdates = useMemo(() => {
    return milestoneTasks.flatMap((task) =>
      task.active_assignments.flatMap((assignment) => assignment.updates),
    );
  }, [milestoneTasks]);

  const loadMilestoneTasks = async (projectId: number, milestoneId: number | null) => {
    if (!milestoneId) {
      setMilestoneTasks([]);
      setSelectedTaskId(null);
      return;
    }

    const taskData = await listMilestoneTasks(projectId, milestoneId);
    setMilestoneTasks(taskData.results);
    setSelectedTaskId(taskData.results[0]?.task_id ?? null);
  };

  const loadProjectExecution = async (projectId: number, milestoneId?: number | null) => {
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      const [project, milestoneData, workerOptions, concernData, needData] = await Promise.all([
        getProject(projectId),
        listProjectMilestones(projectId),
        getProjectWorkerOptions(projectId),
        listProjectConcerns(projectId),
        listProjectWorkplaceNeeds(projectId),
      ]);

      setSelectedProject(project);
      setMilestones(milestoneData.results);
      setWorkers(workerOptions);
      setProjectConcerns(concernData.results);
      setProjectNeeds(needData.results);

      const nextMilestoneId =
        milestoneId &&
        milestoneData.results.some((item) => item.milestone_id === milestoneId)
          ? milestoneId
          : milestoneData.results[0]?.milestone_id ?? null;

      setSelectedMilestoneId(nextMilestoneId);

      try {
        await loadMilestoneTasks(projectId, nextMilestoneId);
      } catch (taskError) {
        setMilestoneTasks([]);
        setSelectedTaskId(null);
        setErrorMessage(
          getErrorMessage(taskError, "Unable to load milestone tasks right now."),
        );
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load the project details right now."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const loadProjects = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const projectData = await listProjects();
      setProjects(projectData.results);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load your assigned projects right now."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const refreshSelectedProject = async () => {
    if (selectedProjectId) {
      await loadProjectExecution(selectedProjectId, selectedMilestoneId);
    }
  };

  const handleOpenProject = async (projectId: number) => {
    setSelectedProjectId(projectId);
    setDetailsTab("overview");
    setIsDetailsOpen(true);
    setNoticeMessage(null);
    await loadProjectExecution(projectId);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setErrorMessage(null);
    setNoticeMessage(null);
  };

  const handleSelectMilestone = async (milestoneId: number) => {
    if (!selectedProjectId) {
      return;
    }

    const normalizedMilestoneId = milestoneId > 0 ? milestoneId : null;
    setSelectedMilestoneId(normalizedMilestoneId);

    if (!normalizedMilestoneId) {
      setMilestoneTasks([]);
      setSelectedTaskId(null);
      return;
    }

    try {
      await loadMilestoneTasks(selectedProjectId, normalizedMilestoneId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load milestone tasks right now."));
    }
  };

  const handleCreateAssignment = async (payload: TaskWorkerAssignmentPayload) => {
    if (!selectedProjectId || !selectedMilestoneId || !selectedTaskId) {
      return;
    }

    try {
      await createTaskAssignment(
        selectedProjectId,
        selectedMilestoneId,
        selectedTaskId,
        payload,
      );
      setNoticeMessage("Worker assigned successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to assign the worker right now."));
    }
  };

  const handleUpdateAssignment = async (
    assignmentId: number,
    payload: Partial<TaskWorkerAssignmentPayload>,
  ) => {
    if (!selectedProjectId || !selectedMilestoneId || !selectedTaskId) {
      return;
    }

    try {
      await updateTaskAssignment(
        selectedProjectId,
        selectedMilestoneId,
        selectedTaskId,
        assignmentId,
        payload,
      );
      setNoticeMessage("Worker assignment updated successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to update the worker assignment right now."),
      );
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!selectedProjectId || !selectedMilestoneId || !selectedTaskId) {
      return;
    }

    try {
      await deleteTaskAssignment(
        selectedProjectId,
        selectedMilestoneId,
        selectedTaskId,
        assignmentId,
      );
      setNoticeMessage("Worker assignment removed successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to remove the worker assignment right now."),
      );
    }
  };

  const handleSupervisorReview = async (
    updateId: number,
    payload: DailyTaskReviewPayload,
  ) => {
    try {
      await reviewTaskUpdateBySupervisor(updateId, payload);
      setNoticeMessage("Daily work status reviewed successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to review the daily work update right now."),
      );
    }
  };

  const handleResolveConcern = async (updateId: number, resolved: boolean) => {
    if (!selectedProjectId) {
      return;
    }

    try {
      await resolveProjectConcern(selectedProjectId, updateId, resolved);
      setNoticeMessage(resolved ? "Concern marked resolved." : "Concern reopened.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to update the concern right now."));
    }
  };

  const handleWorkplaceNeedReview = async (
    requestId: number,
    action: "verify" | "reject",
    remarks: string,
  ) => {
    try {
      await reviewWorkplaceNeedBySupervisor(requestId, { action, remarks });
      setNoticeMessage(
        action === "verify"
          ? "Request verified and forwarded to Project Manager."
          : "Request rejected.",
      );
      await refreshSelectedProject();
      // Keep inbox in sync if user returns to Verifications later.
      void listSupervisorWorkplaceNeeds();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to review the workplace need right now."),
      );
      throw error;
    }
  };

  const pendingProjectNeeds = useMemo(
    () =>
      projectNeeds.filter(
        (need) =>
          need.status === "submitted" || need.status === "under_supervisor_review",
      ),
    [projectNeeds],
  );

  const statusLabel = selectedProject
    ? selectedProject.is_archived
      ? "Archived"
      : selectedProject.status.replace(/_/g, " ")
    : null;

  return (
    <main className="supervisor-page">
      <div className="supervisor-page-content">
        {noticeMessage ? (
          <div className="alert alert-success supervisor-page__alert" role="alert">
            {noticeMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="alert alert-danger supervisor-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <header className="supervisor-page__intro">
          <p className="supervisor-page__support">
            Projects currently assigned to you.
          </p>
        </header>

        {isLoading ? (
          <div className="supervisor-card supervisor-page__loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="supervisor-empty">
            <strong className="supervisor-empty__title">No projects assigned</strong>
            <p className="supervisor-empty__description">
              Projects assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="supervisor-page__project-list">
            {projects.map((project) => (
              <button
                key={project.project_id}
                type="button"
                className="supervisor-page__project-card"
                aria-label={`View details for ${project.project_name}`}
                onClick={() => void handleOpenProject(project.project_id)}
              >
                <div className="supervisor-page__project-card-top">
                  <strong>{project.project_name}</strong>
                  <span className="supervisor-badge supervisor-badge--status">
                    {project.is_archived
                      ? "Archived"
                      : project.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="supervisor-page__project-meta">
                  <div className="supervisor-page__project-meta-row">
                    <span>Project Manager</span>
                    <span>{project.project_manager?.name ?? "Unassigned"}</span>
                  </div>
                  <div className="supervisor-page__project-meta-row">
                    <span>Milestones</span>
                    <span>{project.milestone_count}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <DetailModal
        isOpen={isDetailsOpen}
        title={selectedProject?.project_name ?? "Project Details"}
        statusLabel={statusLabel}
        statusVariant={selectedProject?.is_archived ? "archived" : "default"}
        tabs={[...SUPERVISOR_TABS]}
        activeTab={detailsTab}
        onTabChange={(tabId) => setDetailsTab(tabId as SupervisorDetailsTab)}
        onClose={handleCloseDetails}
        isLoading={isDetailLoading && !selectedProject}
        loadingLabel="Loading project details..."
        size="lg"
      >
        {detailsTab === "overview" && selectedProject ? (
          <div className="detail-overview">
            <DetailOverviewGrid>
              <DetailField label="Project Name" value={selectedProject.project_name} />
              <DetailField
                label="Status"
                value={
                  selectedProject.is_archived
                    ? "Archived"
                    : selectedProject.status
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())
                }
              />
              <DetailField
                label="Project Manager"
                value={selectedProject.project_manager?.name ?? "Unassigned"}
              />
              <DetailField
                label="Client"
                value={selectedProject.client?.name ?? "Unassigned"}
              />
              <DetailField label="Start Date" value={formatDate(selectedProject.start_date)} />
              <DetailField label="End Date" value={formatDate(selectedProject.end_date)} />
              <DetailField
                label="Site Engineer"
                value={selectedProject.site_engineer?.name ?? "Not assigned"}
              />
              <DetailField
                label="Budget"
                value={formatCurrencyINR(selectedProject.initial_budget)}
              />
              <DetailField label="Milestones" value={milestones.length} />
              <DetailField
                label="Documents"
                value={selectedProject.document_count ?? 0}
              />
              {selectedProject.description ? (
                <DetailField
                  label="Description"
                  value={selectedProject.description}
                  fullWidth
                />
              ) : null}
            </DetailOverviewGrid>

            <DetailSection>
              {milestones.length === 0 ? (
                <div className="detail-empty">
                  <p className="detail-empty__title">No milestones yet.</p>
                </div>
              ) : (
                <ProjectTimeline milestones={milestones} />
              )}
            </DetailSection>
          </div>
        ) : null}

        {detailsTab === "milestones" ? (
          <div className="detail-panel-stack">
            {milestones.length === 0 ? (
              <div className="detail-empty">
                <p className="detail-empty__title">No milestones yet.</p>
              </div>
            ) : (
              <>
                <ProjectTimeline milestones={milestones} />
                <div className="supervisor-page__milestone-list">
                  {milestones.map((milestone) => (
                    <article
                      key={milestone.milestone_id}
                      className="supervisor-page__milestone-card"
                    >
                      <div className="supervisor-page__milestone-card-header">
                        <h3>{milestone.title}</h3>
                        <span className="status-pill">
                          {milestone.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="supervisor-page__milestone-meta">
                        <span>
                          {formatDate(milestone.planned_start_date)} –{" "}
                          {formatDate(milestone.planned_end_date)}
                        </span>
                      </div>
                      {milestone.description ? (
                        <p className="supervisor-page__milestone-preview">
                          {milestone.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {detailsTab === "assignments" ? (
          <div className="detail-panel-stack">
            <div className="supervisor-page__assignment-controls">
              <label
                className="supervisor-page__control-label"
                htmlFor="supervisor-milestone-select"
              >
                Milestone
              </label>
              <select
                id="supervisor-milestone-select"
                className="admin-control"
                value={selectedMilestoneId ?? ""}
                onChange={(event) =>
                  void handleSelectMilestone(
                    event.target.value ? Number(event.target.value) : 0,
                  )
                }
              >
                <option value="">Select a milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone.milestone_id} value={milestone.milestone_id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </div>

            {!selectedMilestoneId ? (
              <div className="detail-empty">
                <p className="detail-empty__title">Select a milestone</p>
                <span>Choose a milestone to manage worker assignments.</span>
              </div>
            ) : (
              <TaskAssignmentManager
                tasks={milestoneTasks}
                workers={workers}
                selectedTaskId={selectedTaskId}
                onSelectTask={(taskId) => setSelectedTaskId(taskId > 0 ? taskId : null)}
                onCreateAssignment={handleCreateAssignment}
                onUpdateAssignment={handleUpdateAssignment}
                onDeleteAssignment={handleDeleteAssignment}
              />
            )}
          </div>
        ) : null}

        {detailsTab === "needs" ? (
          <div className="detail-panel-stack">
            <WorkplaceNeedsPanel
              mode="supervisor"
              title="Project Workplace Needs"
              description="Pending requests for this project."
              needs={pendingProjectNeeds}
              isLoading={isDetailLoading}
              onSupervisorReview={handleWorkplaceNeedReview}
            />
          </div>
        ) : null}

        {detailsTab === "reports" ? (
          <div className="detail-panel-stack">
            <section className="supervisor-page__report-section">
              <h3 className="detail-overview__section-title">Daily Updates</h3>
              <DailyUpdateBoard
                title=""
                description=""
                updates={aggregatedUpdates}
                mode="supervisor"
                onReview={handleSupervisorReview}
              />
            </section>
            <section className="supervisor-page__report-section">
              <h3 className="detail-overview__section-title">Concerns</h3>
              <ConcernPanel
                title=""
                description=""
                concerns={projectConcerns}
                canResolve={true}
                onResolve={handleResolveConcern}
              />
            </section>
          </div>
        ) : null}
      </DetailModal>
    </main>
  );
};

export default SupervisorProjectsPage;
