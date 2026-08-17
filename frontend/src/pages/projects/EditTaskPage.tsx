import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  updateMilestoneTask,
} from "../../services/projectApi";
import {
  MILESTONE_TASK_STATUS_OPTIONS,
  type Milestone,
  type MilestoneTaskStatus,
  type ProjectDetail,
} from "../../types/project";
import {
  getProjectMilestonePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

export const EditTaskPage = () => {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [requiredWorkerCount, setRequiredWorkerCount] = useState("1");
  const [plannedDurationDays, setPlannedDurationDays] = useState("");
  const [plannedHoursPerDay, setPlannedHoursPerDay] = useState("");
  const [dailyTargetPercentage, setDailyTargetPercentage] = useState("");
  const [status, setStatus] = useState<MilestoneTaskStatus>("planned");
  const [sortOrder, setSortOrder] = useState("1");

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const contextLine = [projectName, selectedMilestone?.title].filter(Boolean).join(" · ");
  const breadcrumb = selectedMilestone?.title
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Edit Task`
    : projectName
      ? `Projects / ${projectName} / Edit Task`
      : "Projects / Edit Task";

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
        const [nextProject, milestoneData, task] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
          getMilestoneTask(parsedProjectId, parsedMilestoneId, parsedTaskId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
        setTitle(task.title);
        setDescription(task.description ?? "");
        setPlannedStartDate(task.planned_start_date ?? "");
        setPlannedEndDate(task.planned_end_date ?? "");
        setRequiredWorkerCount(String(task.required_worker_count ?? 1));
        setPlannedDurationDays(
          task.planned_duration_days != null ? String(task.planned_duration_days) : "",
        );
        setPlannedHoursPerDay(task.planned_hours_per_day ?? "");
        setDailyTargetPercentage(task.daily_target_percentage ?? "");
        setStatus(task.status);
        setSortOrder(String(task.sort_order ?? 1));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (
      plannedStartDate &&
      plannedEndDate &&
      new Date(plannedEndDate).getTime() < new Date(plannedStartDate).getTime()
    ) {
      setErrorMessage("Task end date cannot be earlier than the task start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMilestoneTask(parsedProjectId, parsedMilestoneId, parsedTaskId, {
        title: title.trim(),
        description: description.trim(),
        planned_start_date: plannedStartDate || null,
        planned_end_date: plannedEndDate || null,
        required_worker_count: Number(requiredWorkerCount || "1"),
        planned_duration_days: plannedDurationDays ? Number(plannedDurationDays) : null,
        planned_hours_per_day: plannedHoursPerDay ? Number(plannedHoursPerDay) : null,
        daily_target_percentage: dailyTargetPercentage ? Number(dailyTargetPercentage) : null,
        status,
        sort_order: sortOrder ? Number(sortOrder) : undefined,
      });
      returnToProject({ notice: "Task updated successfully." });
    } catch {
      setErrorMessage("Unable to update the task right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading task...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Milestone"
        onBack={() => returnToProject()}
        title="Edit Task"
        contextLine={contextLine || null}
      />

      <div className="project-create-page__layout">
        <ProjectCreateFormCard title="Task Details" onSubmit={(event) => void handleSubmit(event)}>
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="project-create-page__grid">
            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Task Title</span>
              <input
                className="form-control"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
              />
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">
                Description <span className="project-create-page__optional">(optional)</span>
              </span>
              <textarea
                className="form-control"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes"
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Task Start Date</span>
              <input
                className="form-control"
                type="date"
                value={plannedStartDate}
                onChange={(event) => setPlannedStartDate(event.target.value)}
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Task End Date</span>
              <input
                className="form-control"
                type="date"
                value={plannedEndDate}
                onChange={(event) => setPlannedEndDate(event.target.value)}
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Workers Needed</span>
              <input
                className="form-control"
                inputMode="numeric"
                value={requiredWorkerCount}
                onChange={(event) => setRequiredWorkerCount(event.target.value)}
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Planned Duration (Days)</span>
              <input
                className="form-control"
                inputMode="numeric"
                value={plannedDurationDays}
                onChange={(event) => setPlannedDurationDays(event.target.value)}
                placeholder="e.g. 5"
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Hours / Day</span>
              <input
                className="form-control"
                inputMode="decimal"
                value={plannedHoursPerDay}
                onChange={(event) => setPlannedHoursPerDay(event.target.value)}
                placeholder="8"
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Daily Target %</span>
              <input
                className="form-control"
                inputMode="decimal"
                value={dailyTargetPercentage}
                onChange={(event) => setDailyTargetPercentage(event.target.value)}
                placeholder="Auto from dates"
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Status</span>
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as MilestoneTaskStatus)}
              >
                {MILESTONE_TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Sort Order</span>
              <input
                className="form-control"
                inputMode="numeric"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                placeholder="1"
              />
            </label>
          </div>

          <div className="project-create-page__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => returnToProject()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
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

export default EditTaskPage;
