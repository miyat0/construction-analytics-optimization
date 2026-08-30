import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import {
  createMilestoneTask,
  getProject,
  listProjectMilestones,
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

const suggestDailyTarget = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return (100 / days).toFixed(2);
};

export const CreateTaskPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { milestoneId } = useParams();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const parsedMilestoneId = Number(milestoneId);
  const scope = resolveProjectScopeFromPath(location.pathname);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedWork, setExpectedWork] = useState("");
  const [completionRequirement, setCompletionRequirement] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [requiredWorkerCount, setRequiredWorkerCount] = useState("1");
  const [plannedDurationDays, setPlannedDurationDays] = useState("");
  const [plannedHoursPerDay, setPlannedHoursPerDay] = useState("8");
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
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Add Task`
    : projectName
      ? `Projects / ${projectName} / Milestones / Add Task`
      : "Projects / Add Task";

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
      if (!Number.isFinite(parsedProjectId) || !Number.isFinite(parsedMilestoneId)) {
        setErrorMessage("Project or milestone not found.");
        setIsLoading(false);
        return;
      }

      try {
        const [nextProject, milestoneData] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load the project right now.");
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
  }, [parsedMilestoneId, parsedProjectId]);

  useEffect(() => {
    if (dailyTargetPercentage || !selectedMilestone) {
      return;
    }

    const start = plannedStartDate || selectedMilestone.planned_start_date || "";
    const end =
      plannedEndDate ||
      selectedMilestone.effective_end_date ||
      selectedMilestone.planned_end_date ||
      "";
    const suggested = suggestDailyTarget(start, end);
    if (suggested) {
      setDailyTargetPercentage(suggested);
    }
  }, [dailyTargetPercentage, plannedEndDate, plannedStartDate, selectedMilestone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!expectedWork.trim()) {
      setErrorMessage("Expected work is required.");
      return;
    }

    if (!completionRequirement.trim()) {
      setErrorMessage("Completion requirement is required.");
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
      await createMilestoneTask(parsedProjectId, parsedMilestoneId, {
        title: title.trim(),
        description: description.trim(),
        expected_work: expectedWork.trim(),
        completion_requirement: completionRequirement.trim(),
        planned_start_date: plannedStartDate || null,
        planned_end_date: plannedEndDate || null,
        required_worker_count: Number(requiredWorkerCount || "1"),
        planned_duration_days: plannedDurationDays ? Number(plannedDurationDays) : null,
        planned_hours_per_day: plannedHoursPerDay ? Number(plannedHoursPerDay) : null,
        daily_target_percentage: dailyTargetPercentage ? Number(dailyTargetPercentage) : null,
        status,
        sort_order: sortOrder ? Number(sortOrder) : undefined,
      });
      returnToProject({ notice: "Task saved successfully." });
    } catch {
      setErrorMessage("Unable to save the task right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading milestone...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Tasks"
        onBack={() => returnToProject()}
        title="Create Task"
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

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Expected Work</span>
              <textarea
                className="form-control"
                rows={3}
                value={expectedWork}
                onChange={(event) => setExpectedWork(event.target.value)}
                placeholder="Describe the work expected from assigned workers"
                required
              />
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Completion Requirement</span>
              <textarea
                className="form-control"
                rows={2}
                value={completionRequirement}
                onChange={(event) => setCompletionRequirement(event.target.value)}
                placeholder="What constitutes completion of this task"
                required
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
              {isSubmitting ? "Saving..." : "Create Task"}
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

export default CreateTaskPage;
