import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
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
import { validateTaskFormFields } from "../../utils/formValidation";
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
  const [expectedWork, setExpectedWork] = useState("");
  const [completionRequirement, setCompletionRequirement] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [requiredWorkerCount, setRequiredWorkerCount] = useState("1");
  const [plannedDurationDays, setPlannedDurationDays] = useState("");
  const [plannedHoursPerDay, setPlannedHoursPerDay] = useState("");
  const [dailyTargetPercentage, setDailyTargetPercentage] = useState("");
  const [status, setStatus] = useState<MilestoneTaskStatus>("planned");
  const [sortOrder, setSortOrder] = useState("1");
  const { fieldErrors, touchAndValidate, validateSubmit, resetFieldValidation } =
    useLiveFieldValidation();

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const milestoneStartDate = selectedMilestone?.planned_start_date ?? null;
  const milestoneEndDate =
    selectedMilestone?.effective_end_date ?? selectedMilestone?.planned_end_date ?? null;

  const validateWith = (
    overrides: Partial<{
      title: string;
      expectedWork: string;
      completionRequirement: string;
      plannedStartDate: string;
      plannedEndDate: string;
      requiredWorkerCount: string;
      plannedDurationDays: string;
      plannedHoursPerDay: string;
      dailyTargetPercentage: string;
      sortOrder: string;
    }> = {},
  ) =>
    validateTaskFormFields({
      title: overrides.title ?? title,
      expectedWork: overrides.expectedWork ?? expectedWork,
      completionRequirement: overrides.completionRequirement ?? completionRequirement,
      plannedStartDate: overrides.plannedStartDate ?? plannedStartDate,
      plannedEndDate: overrides.plannedEndDate ?? plannedEndDate,
      requiredWorkerCount: overrides.requiredWorkerCount ?? requiredWorkerCount,
      plannedDurationDays: overrides.plannedDurationDays ?? plannedDurationDays,
      plannedHoursPerDay: overrides.plannedHoursPerDay ?? plannedHoursPerDay,
      dailyTargetPercentage: overrides.dailyTargetPercentage ?? dailyTargetPercentage,
      sortOrder: overrides.sortOrder ?? sortOrder,
      milestoneStartDate,
      milestoneEndDate,
    });

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
        setExpectedWork(task.expected_work ?? "");
        setCompletionRequirement(task.completion_requirement ?? "");
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
        resetFieldValidation();
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
  }, [parsedMilestoneId, parsedProjectId, parsedTaskId, resetFieldValidation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMilestoneTask(parsedProjectId, parsedMilestoneId, parsedTaskId, {
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
                className={`form-control${fieldErrors.title ? " is-invalid" : ""}`}
                value={title}
                onChange={(event) => {
                  const value = event.target.value;
                  setTitle(value);
                  touchAndValidate("title", () => validateWith({ title: value }));
                }}
                onBlur={() => touchAndValidate("title", () => validateWith())}
                placeholder="Task title"
              />
              {fieldErrors.title ? (
                <span className="project-create-page__field-error">{fieldErrors.title}</span>
              ) : null}
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
                className={`form-control${fieldErrors.expected_work ? " is-invalid" : ""}`}
                rows={3}
                value={expectedWork}
                onChange={(event) => {
                  const value = event.target.value;
                  setExpectedWork(value);
                  touchAndValidate("expected_work", () => validateWith({ expectedWork: value }));
                }}
                onBlur={() => touchAndValidate("expected_work", () => validateWith())}
                placeholder="Describe the work expected from assigned workers"
                required
              />
              {fieldErrors.expected_work ? (
                <span className="project-create-page__field-error">{fieldErrors.expected_work}</span>
              ) : null}
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Completion Requirement</span>
              <textarea
                className={`form-control${fieldErrors.completion_requirement ? " is-invalid" : ""}`}
                rows={2}
                value={completionRequirement}
                onChange={(event) => {
                  const value = event.target.value;
                  setCompletionRequirement(value);
                  touchAndValidate("completion_requirement", () =>
                    validateWith({ completionRequirement: value }),
                  );
                }}
                onBlur={() => touchAndValidate("completion_requirement", () => validateWith())}
                placeholder="What constitutes completion of this task"
                required
              />
              {fieldErrors.completion_requirement ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.completion_requirement}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Task Start Date</span>
              <input
                className={`form-control${fieldErrors.planned_start_date ? " is-invalid" : ""}`}
                type="date"
                value={plannedStartDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedStartDate(value);
                  touchAndValidate(["planned_start_date", "planned_end_date"], () =>
                    validateWith({ plannedStartDate: value }),
                  );
                }}
                onBlur={() =>
                  touchAndValidate(["planned_start_date", "planned_end_date"], () =>
                    validateWith(),
                  )
                }
              />
              {fieldErrors.planned_start_date ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.planned_start_date}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Task End Date</span>
              <input
                className={`form-control${fieldErrors.planned_end_date ? " is-invalid" : ""}`}
                type="date"
                value={plannedEndDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedEndDate(value);
                  touchAndValidate(["planned_start_date", "planned_end_date"], () =>
                    validateWith({ plannedEndDate: value }),
                  );
                }}
                onBlur={() =>
                  touchAndValidate(["planned_start_date", "planned_end_date"], () =>
                    validateWith(),
                  )
                }
              />
              {fieldErrors.planned_end_date ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.planned_end_date}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Workers Needed</span>
              <input
                className={`form-control${fieldErrors.required_worker_count ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={requiredWorkerCount}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequiredWorkerCount(value);
                  touchAndValidate("required_worker_count", () =>
                    validateWith({ requiredWorkerCount: value }),
                  );
                }}
                onBlur={() => touchAndValidate("required_worker_count", () => validateWith())}
              />
              {fieldErrors.required_worker_count ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.required_worker_count}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Planned Duration (Days)</span>
              <input
                className={`form-control${fieldErrors.planned_duration_days ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={plannedDurationDays}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedDurationDays(value);
                  touchAndValidate("planned_duration_days", () =>
                    validateWith({ plannedDurationDays: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_duration_days", () => validateWith())}
                placeholder="e.g. 5"
              />
              {fieldErrors.planned_duration_days ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.planned_duration_days}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Hours / Day</span>
              <input
                className={`form-control${fieldErrors.planned_hours_per_day ? " is-invalid" : ""}`}
                inputMode="decimal"
                value={plannedHoursPerDay}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedHoursPerDay(value);
                  touchAndValidate("planned_hours_per_day", () =>
                    validateWith({ plannedHoursPerDay: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_hours_per_day", () => validateWith())}
                placeholder="8"
              />
              {fieldErrors.planned_hours_per_day ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.planned_hours_per_day}
                </span>
              ) : null}
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Daily Target %</span>
              <input
                className={`form-control${fieldErrors.daily_target_percentage ? " is-invalid" : ""}`}
                inputMode="decimal"
                value={dailyTargetPercentage}
                onChange={(event) => {
                  const value = event.target.value;
                  setDailyTargetPercentage(value);
                  touchAndValidate("daily_target_percentage", () =>
                    validateWith({ dailyTargetPercentage: value }),
                  );
                }}
                onBlur={() => touchAndValidate("daily_target_percentage", () => validateWith())}
                placeholder="Auto from dates"
              />
              {fieldErrors.daily_target_percentage ? (
                <span className="project-create-page__field-error">
                  {fieldErrors.daily_target_percentage}
                </span>
              ) : null}
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
                className={`form-control${fieldErrors.sort_order ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={sortOrder}
                onChange={(event) => {
                  const value = event.target.value;
                  setSortOrder(value);
                  touchAndValidate("sort_order", () => validateWith({ sortOrder: value }));
                }}
                onBlur={() => touchAndValidate("sort_order", () => validateWith())}
                placeholder="1"
              />
              {fieldErrors.sort_order ? (
                <span className="project-create-page__field-error">{fieldErrors.sort_order}</span>
              ) : null}
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
