import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { ConcernPanel } from "../../components/projects/ConcernPanel";
import { DailyUpdateBoard } from "../../components/projects/DailyUpdateBoard";
import { ProjectTimeline } from "../../components/projects/ProjectTimeline";
import { TaskManager } from "../../components/projects/TaskManager";
import { WorkerAllocationPanel } from "../../components/projects/WorkerAllocationPanel";
import {
  createMilestoneTask,
  getProject,
  listMilestoneTasks,
  listProjectConcerns,
  listProjectMilestones,
  listProjects,
  reviewTaskUpdateByEngineer,
  updateMilestoneTask,
  deleteMilestoneTask,
} from "../../services/projectApi";
import type {
  DailyTaskReviewPayload,
  DailyTaskUpdate,
  Milestone,
  MilestoneTask,
  MilestoneTaskPayload,
  ProjectDetail,
  ProjectSummary,
} from "../../types/project";

import "./SiteEngineerDashboardPage.css";

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }

  return fallbackMessage;
};

export const SiteEngineerDashboardPage = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([]);
  const [projectConcerns, setProjectConcerns] = useState<DailyTaskUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const aggregatedUpdates = useMemo(() => {
    return milestoneTasks.flatMap((task) =>
      task.active_assignments.flatMap((assignment) => assignment.updates),
    );
  }, [milestoneTasks]);

  const loadProjectExecution = async (projectId: number, milestoneId?: number | null) => {
    setIsDetailLoading(true);

    try {
      const [project, milestoneData, concernData] = await Promise.all([
        getProject(projectId),
        listProjectMilestones(projectId),
        listProjectConcerns(projectId),
      ]);

      setSelectedProject(project);
      setMilestones(milestoneData.results);
      setProjectConcerns(concernData.results);

      const nextMilestoneId =
        milestoneId &&
        milestoneData.results.some((item) => item.milestone_id === milestoneId)
          ? milestoneId
          : milestoneData.results[0]?.milestone_id ?? null;

      setSelectedMilestoneId(nextMilestoneId);

      if (nextMilestoneId) {
        const taskData = await listMilestoneTasks(projectId, nextMilestoneId);
        setMilestoneTasks(taskData.results);
      } else {
        setMilestoneTasks([]);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load the Site Engineer workspace right now."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const loadProjects = async (preferredProjectId?: number | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const projectData = await listProjects();
      setProjects(projectData.results);

      const nextProjectId =
        preferredProjectId &&
        projectData.results.some((project) => project.project_id === preferredProjectId)
          ? preferredProjectId
          : projectData.results[0]?.project_id ?? null;

      setSelectedProjectId(nextProjectId);

      if (nextProjectId) {
        await loadProjectExecution(nextProjectId);
      } else {
        setSelectedProject(null);
        setMilestones([]);
        setSelectedMilestoneId(null);
        setMilestoneTasks([]);
        setProjectConcerns([]);
      }
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

  const handleSelectProject = async (projectId: number) => {
    setSelectedProjectId(projectId);
    setNoticeMessage(null);
    await loadProjectExecution(projectId);
  };

  const handleSelectMilestone = async (milestoneId: number) => {
    if (!selectedProjectId) {
      return;
    }

    const normalizedMilestoneId = milestoneId > 0 ? milestoneId : null;
    setSelectedMilestoneId(normalizedMilestoneId);

    if (!normalizedMilestoneId) {
      setMilestoneTasks([]);
      return;
    }

    try {
      const taskData = await listMilestoneTasks(selectedProjectId, normalizedMilestoneId);
      setMilestoneTasks(taskData.results);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load milestone tasks right now."),
      );
    }
  };

  const handleCreateTask = async (payload: MilestoneTaskPayload) => {
    if (!selectedProjectId || !selectedMilestoneId) {
      return;
    }

    try {
      await createMilestoneTask(selectedProjectId, selectedMilestoneId, payload);
      setNoticeMessage("Task created successfully and sent for approval.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to create the task right now."));
    }
  };

  const handleUpdateTask = async (
    taskId: number,
    payload: Partial<MilestoneTaskPayload>,
  ) => {
    if (!selectedProjectId || !selectedMilestoneId) {
      return;
    }

    try {
      await updateMilestoneTask(selectedProjectId, selectedMilestoneId, taskId, payload);
      setNoticeMessage("Task updated successfully and returned for approval.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to update the task right now."));
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!selectedProjectId || !selectedMilestoneId) {
      return;
    }

    try {
      await deleteMilestoneTask(selectedProjectId, selectedMilestoneId, taskId);
      setNoticeMessage("Task deleted successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete the task right now."));
    }
  };

  const handleEngineerReview = async (
    updateId: number,
    payload: DailyTaskReviewPayload,
  ) => {
    try {
      await reviewTaskUpdateByEngineer(updateId, payload);
      setNoticeMessage("Daily update verified successfully.");
      await refreshSelectedProject();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to verify the daily update right now."),
      );
    }
  };

  return (
    <main className="site-engineer-dashboard">
      <section className="site-engineer-dashboard__hero">
        <div>
          <h1>Site Engineer</h1>
        </div>
      </section>

      {noticeMessage ? <div className="alert alert-success">{noticeMessage}</div> : null}
      {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}

      <div className="site-engineer-dashboard__grid">
        <section className="site-engineer-dashboard__surface">
          <div className="site-engineer-dashboard__surface-header">
            <div>
              <h2>Projects</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="site-engineer-dashboard__empty">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="site-engineer-dashboard__empty">
              No projects assigned.
            </div>
          ) : (
            <div className="site-engineer-dashboard__project-list">
              {projects.map((project) => (
                <button
                  key={project.project_id}
                  type="button"
                  className={`site-engineer-dashboard__project-card ${
                    selectedProjectId === project.project_id
                      ? "site-engineer-dashboard__project-card--active"
                      : ""
                  }`}
                  onClick={() => void handleSelectProject(project.project_id)}
                >
                  <strong>{project.project_name}</strong>
                  <span>{project.status.replace(/_/g, " ")}</span>
                  <small>Milestones: {project.milestone_count}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="site-engineer-dashboard__surface">
          <div className="site-engineer-dashboard__surface-header">
            <div>
              <h2>Overview</h2>
            </div>
          </div>

          {isDetailLoading ? (
            <div className="site-engineer-dashboard__empty">Loading project details...</div>
          ) : !selectedProject ? (
            <div className="site-engineer-dashboard__empty">
              Select a project.
            </div>
          ) : (
            <div className="site-engineer-dashboard__overview">
              <h3>{selectedProject.project_name}</h3>
              <p>{selectedProject.description || "No description"}</p>
              <div className="site-engineer-dashboard__meta-grid">
                <span>Start: {selectedProject.start_date ?? "Not set"}</span>
                <span>End: {selectedProject.end_date ?? "Not set"}</span>
                <span>PM: {selectedProject.project_manager?.name ?? "Unassigned"}</span>
                <span>Supervisor: {selectedProject.supervisor?.name ?? "Unassigned"}</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedProject ? (
        <section className="site-engineer-dashboard__surface">
          <ProjectTimeline milestones={milestones} />
        </section>
      ) : null}

      {selectedProject ? (
        <section className="site-engineer-dashboard__surface">
          <TaskManager
            milestones={milestones}
            selectedMilestoneId={selectedMilestoneId}
            tasks={milestoneTasks}
            canManageTasks={true}
            canApproveTasks={false}
            onSelectMilestone={(milestoneId) => void handleSelectMilestone(milestoneId)}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </section>
      ) : null}

      {selectedProject ? (
        <section className="site-engineer-dashboard__surface">
          <WorkerAllocationPanel tasks={milestoneTasks} />
        </section>
      ) : null}

      {selectedProject ? (
        <section className="site-engineer-dashboard__surface">
          <DailyUpdateBoard
            title="Verify Supervisor Updates"
            description="Approve or reject updates already verified by the Supervisor."
            updates={aggregatedUpdates}
            mode="site-engineer"
            onReview={handleEngineerReview}
          />
        </section>
      ) : null}

      {selectedProject ? (
        <section className="site-engineer-dashboard__surface">
          <ConcernPanel
            title="Concerns"
            description=""
            concerns={projectConcerns}
          />
        </section>
      ) : null}
    </main>
  );
};

export default SiteEngineerDashboardPage;
