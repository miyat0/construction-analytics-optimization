import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import {
  getMilestoneTask,
  getProject,
  listProjectMilestones,
} from "../../services/projectApi";
import {
  MILESTONE_TASK_STATUS_OPTIONS,
  type Milestone,
  type MilestoneTask,
  type ProjectDetail,
} from "../../types/project";
import {
  getEditTaskPath,
  getProjectMilestonePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

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

const statusLabel = (status: string): string =>
  MILESTONE_TASK_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  status.replace(/_/g, " ");

export const ViewTaskPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { milestoneId, taskId } = useParams();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const parsedMilestoneId = Number(milestoneId);
  const parsedTaskId = Number(taskId);
  const scope = resolveProjectScopeFromPath(location.pathname);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [task, setTask] = useState<MilestoneTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const contextLine = [projectName, selectedMilestone?.title].filter(Boolean).join(" · ");
  const breadcrumb = selectedMilestone?.title
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Task`
    : projectName
      ? `Projects / ${projectName} / Task`
      : "Projects / Task";

  useProjectCreateChrome(breadcrumb);

  const returnToProject = (extra?: WorkspaceNoticeState) => {
    navigate(getProjectMilestonePath(scope, parsedProjectId, parsedMilestoneId), {
      replace: true,
      state: {
        projectId: parsedProjectId,
        ...(extra?.notice ? { notice: extra.notice } : {}),
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (
        !Number.isFinite(parsedProjectId) ||
        !Number.isFinite(parsedMilestoneId) ||
        !Number.isFinite(parsedTaskId)
      ) {
        setErrorMessage("Project, milestone, or task not found.");
        setIsLoading(false);
        return;
      }

      try {
        const [nextProject, milestoneData, nextTask] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
          getMilestoneTask(parsedProjectId, parsedMilestoneId, parsedTaskId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
        setTask(nextTask);
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load the task right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [parsedMilestoneId, parsedProjectId, parsedTaskId]);

  if (isLoading) {
    return <div className="project-create-page__loading">Loading task...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Milestone"
        onBack={() => returnToProject()}
        title={task?.title || "Task Details"}
        contextLine={contextLine || null}
      />

      <div className="project-create-page__layout">
        <ProjectCreateFormCard title="Task Details" onSubmit={(event) => event.preventDefault()}>
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          {task ? (
            <div className="project-create-page__grid">
              <div className="project-create-page__field project-create-page__field--full">
                <span className="project-create-page__label">Task Title</span>
                <p className="project-create-page__readonly">{task.title}</p>
              </div>
              <div className="project-create-page__field project-create-page__field--full">
                <span className="project-create-page__label">Description</span>
                <p className="project-create-page__readonly">
                  {task.description?.trim() || "No description"}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Start Date</span>
                <p className="project-create-page__readonly">
                  {formatDate(task.planned_start_date)}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">End Date</span>
                <p className="project-create-page__readonly">{formatDate(task.planned_end_date)}</p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Workers Needed</span>
                <p className="project-create-page__readonly">{task.required_worker_count}</p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Daily Target %</span>
                <p className="project-create-page__readonly">
                  {task.daily_target_percentage ?? "—"}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Status</span>
                <p className="project-create-page__readonly">{statusLabel(task.status)}</p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Progress</span>
                <p className="project-create-page__readonly">
                  {Number(task.progress_percentage || 0).toFixed(0)}%
                </p>
                {task.manpower_utilization_percentage != null ? (
                  <p className="project-create-page__hint">
                    Utilization: {Number(task.manpower_utilization_percentage).toFixed(0)}%
                  </p>
                ) : null}
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Sort Order</span>
                <p className="project-create-page__readonly">#{task.sort_order}</p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Approval</span>
                <p className="project-create-page__readonly">
                  {task.is_approved ? "Approved" : "Pending Approval"}
                </p>
              </div>
              <div className="project-create-page__field project-create-page__field--full">
                <span className="project-create-page__label">Manpower</span>
                <div className="project-create-page__grid" style={{ marginTop: "0.5rem" }}>
                  <div className="project-create-page__field">
                    <span className="project-create-page__label">Required Workers</span>
                    <p className="project-create-page__readonly">{task.required_worker_count}</p>
                  </div>
                  <div className="project-create-page__field">
                    <span className="project-create-page__label">Planned Man Hours</span>
                    <p className="project-create-page__readonly">
                      {task.planned_man_hours ?? "—"}
                    </p>
                  </div>
                  <div className="project-create-page__field">
                    <span className="project-create-page__label">Actual Man Hours</span>
                    <p className="project-create-page__readonly">{task.actual_man_hours ?? "0.00"}</p>
                  </div>
                  <div className="project-create-page__field">
                    <span className="project-create-page__label">Utilization %</span>
                    <p className="project-create-page__readonly">
                      {task.manpower_utilization_percentage != null
                        ? `${Number(task.manpower_utilization_percentage).toFixed(0)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="project-create-page__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => returnToProject()}
            >
              Back
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() =>
                navigate(
                  getEditTaskPath(scope, parsedProjectId, parsedMilestoneId, parsedTaskId),
                  { state: { projectId: parsedProjectId } },
                )
              }
            >
              Edit Task
            </button>
          </div>
        </ProjectCreateFormCard>

        <ProjectCreateContextPanel
          info={{
            project,
            focusLabel: selectedMilestone ? "Milestone" : null,
            focusValue: selectedMilestone?.title ?? null,
          }}
        />
      </div>
    </section>
  );
};

export default ViewTaskPage;
