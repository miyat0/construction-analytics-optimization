import { useEffect, useMemo, useState, type FormEvent } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  MILESTONE_TASK_STATUS_OPTIONS,
  type Milestone,
  type MilestoneTask,
  type MilestoneTaskPayload,
  type MilestoneTaskStatus,
} from "../../types/project";
import { validateTaskFormFields } from "../../utils/formValidation";

import "./TaskManager.css";

interface TaskManagerProps {
  milestones: Milestone[];
  selectedMilestoneId: number | null;
  tasks: MilestoneTask[];
  canManageTasks: boolean;
  canApproveTasks: boolean;
  onSelectMilestone: (milestoneId: number) => void;
  onCreateTask: (payload: MilestoneTaskPayload) => Promise<void>;
  onUpdateTask: (taskId: number, payload: Partial<MilestoneTaskPayload>) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onApproveTask?: (taskId: number) => Promise<void>;
  /** When true, hide milestone picker (used inside milestone detail). */
  embedded?: boolean;
  /** When set, Add Task navigates instead of opening an inline create form. */
  onRequestCreate?: () => void;
  /** When set, Edit navigates to a dedicated edit page. */
  onRequestEdit?: (taskId: number) => void;
  /** When set, View navigates to a dedicated view page. */
  onRequestView?: (taskId: number) => void;
}

type TaskFormState = {
  title: string;
  description: string;
  expected_work: string;
  completion_requirement: string;
  planned_start_date: string;
  planned_end_date: string;
  required_worker_count: string;
  planned_duration_days: string;
  planned_hours_per_day: string;
  daily_target_percentage: string;
  status: MilestoneTaskStatus;
  sort_order: string;
};

const defaultTaskFormState: TaskFormState = {
  title: "",
  description: "",
  expected_work: "",
  completion_requirement: "",
  planned_start_date: "",
  planned_end_date: "",
  required_worker_count: "1",
  planned_duration_days: "",
  planned_hours_per_day: "8",
  daily_target_percentage: "",
  status: "planned",
  sort_order: "",
};

const suggestDailyTarget = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) {
    return "";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return (100 / days).toFixed(2);
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

const statusLabel = (status: MilestoneTaskStatus): string =>
  MILESTONE_TASK_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  status.replace(/_/g, " ");

export const TaskManager = ({
  milestones,
  selectedMilestoneId,
  tasks,
  canManageTasks,
  canApproveTasks,
  onSelectMilestone,
  onCreateTask,
  onUpdateTask,
  onDeleteTask: _onDeleteTask,
  onApproveTask,
  embedded = false,
  onRequestCreate,
  onRequestEdit,
}: TaskManagerProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(defaultTaskFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const { fieldErrors, touchAndValidate, validateSubmit, resetFieldValidation } =
    useLiveFieldValidation();

  const selectedMilestone = useMemo(() => {
    return milestones.find((milestone) => milestone.milestone_id === selectedMilestoneId) ?? null;
  }, [milestones, selectedMilestoneId]);

  const milestoneStartDate = selectedMilestone?.planned_start_date ?? null;
  const milestoneEndDate =
    selectedMilestone?.effective_end_date ?? selectedMilestone?.planned_end_date ?? null;

  const showForm = canManageTasks && Boolean(selectedMilestone) && (isFormOpen || editingTaskId !== null);

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
      title: overrides.title ?? formState.title,
      expectedWork: overrides.expectedWork ?? formState.expected_work,
      completionRequirement: overrides.completionRequirement ?? formState.completion_requirement,
      plannedStartDate: overrides.plannedStartDate ?? formState.planned_start_date,
      plannedEndDate: overrides.plannedEndDate ?? formState.planned_end_date,
      requiredWorkerCount: overrides.requiredWorkerCount ?? formState.required_worker_count,
      plannedDurationDays: overrides.plannedDurationDays ?? formState.planned_duration_days,
      plannedHoursPerDay: overrides.plannedHoursPerDay ?? formState.planned_hours_per_day,
      dailyTargetPercentage: overrides.dailyTargetPercentage ?? formState.daily_target_percentage,
      sortOrder: overrides.sortOrder ?? formState.sort_order,
      milestoneStartDate,
      milestoneEndDate,
    });

  useEffect(() => {
    if (!editingTaskId) {
      if (!isFormOpen) {
        setFormState(defaultTaskFormState);
        resetFieldValidation();
      }
      return;
    }

    const task = tasks.find((item) => item.task_id === editingTaskId);
    if (!task) {
      setEditingTaskId(null);
      setFormState(defaultTaskFormState);
      resetFieldValidation();
      return;
    }

    setFormState({
      title: task.title,
      description: task.description,
      expected_work: task.expected_work ?? "",
      completion_requirement: task.completion_requirement ?? "",
      planned_start_date: task.planned_start_date ?? "",
      planned_end_date: task.planned_end_date ?? "",
      required_worker_count: String(task.required_worker_count),
      planned_duration_days:
        task.planned_duration_days != null ? String(task.planned_duration_days) : "",
      planned_hours_per_day: task.planned_hours_per_day ?? "",
      daily_target_percentage: task.daily_target_percentage ?? "",
      status: task.status,
      sort_order: String(task.sort_order),
    });
    resetFieldValidation();
  }, [editingTaskId, isFormOpen, resetFieldValidation, tasks]);

  useEffect(() => {
    if (!showForm || editingTaskId || formState.daily_target_percentage) {
      return;
    }

    const start =
      formState.planned_start_date || selectedMilestone?.planned_start_date || "";
    const end =
      formState.planned_end_date ||
      selectedMilestone?.effective_end_date ||
      selectedMilestone?.planned_end_date ||
      "";
    const suggested = suggestDailyTarget(start, end);

    if (suggested) {
      setFormState((current) =>
        current.daily_target_percentage
          ? current
          : { ...current, daily_target_percentage: suggested },
      );
    }
  }, [
    editingTaskId,
    formState.daily_target_percentage,
    formState.planned_end_date,
    formState.planned_start_date,
    selectedMilestone,
    showForm,
  ]);

  const updateField = <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTaskId(null);
    setFormState(defaultTaskFormState);
    setErrorMessage(null);
    resetFieldValidation();
  };

  const openCreateForm = () => {
    if (onRequestCreate) {
      onRequestCreate();
      return;
    }

    setEditingTaskId(null);
    setFormState(defaultTaskFormState);
    setErrorMessage(null);
    resetFieldValidation();
    setIsFormOpen(true);
  };

  const openEditForm = (taskId: number) => {
    if (onRequestEdit) {
      onRequestEdit(taskId);
      return;
    }

    setEditingTaskId(taskId);
    setIsFormOpen(true);
    setErrorMessage(null);
    resetFieldValidation();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedMilestoneId) {
      setErrorMessage("Select a milestone before creating or updating a task.");
      return;
    }

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload: MilestoneTaskPayload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      expected_work: formState.expected_work.trim(),
      completion_requirement: formState.completion_requirement.trim(),
      planned_start_date: formState.planned_start_date || null,
      planned_end_date: formState.planned_end_date || null,
      required_worker_count: Number(formState.required_worker_count || "1"),
      planned_duration_days: formState.planned_duration_days
        ? Number(formState.planned_duration_days)
        : null,
      planned_hours_per_day: formState.planned_hours_per_day
        ? Number(formState.planned_hours_per_day)
        : null,
      daily_target_percentage: formState.daily_target_percentage
        ? Number(formState.daily_target_percentage)
        : null,
      status: formState.status,
      sort_order: formState.sort_order ? Number(formState.sort_order) : undefined,
    };

    setProcessingTaskId(editingTaskId ?? -1);

    try {
      if (editingTaskId) {
        await onUpdateTask(editingTaskId, payload);
      } else {
        await onCreateTask(payload);
      }
      closeForm();
    } finally {
      setProcessingTaskId(null);
    }
  };

  const addTaskButton =
    canManageTasks && selectedMilestone ? (
      <button
        type="button"
        className="admin-btn admin-btn--primary task-manager__primary-action"
        onClick={openCreateForm}
      >
        <span className="admin-btn__plus" aria-hidden>
          +
        </span>{" "}
        Add Task
      </button>
    ) : null;

  return (
    <section className="task-manager">
      <SectionHeader title="Tasks" action={!showForm ? addTaskButton : undefined} />

      {!embedded ? (
        <div className="task-manager__toolbar">
          <label className="task-manager__field">
            <span className="task-manager__label">Milestone</span>
            <select
              className="form-select"
              value={selectedMilestoneId ?? ""}
              onChange={(event) =>
                onSelectMilestone(event.target.value ? Number(event.target.value) : 0)
              }
            >
              <option value="">Select a milestone</option>
              {milestones.map((milestone) => (
                <option key={milestone.milestone_id} value={milestone.milestone_id}>
                  {milestone.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showForm ? (
        <form className="task-manager__form" onSubmit={(event) => void handleSubmit(event)}>
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="task-manager__grid">
            <label className="task-manager__field task-manager__field--full">
              <span className="task-manager__label">Task Title</span>
              <input
                className={`form-control${fieldErrors.title ? " is-invalid" : ""}`}
                value={formState.title}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("title", value);
                  touchAndValidate("title", () => validateWith({ title: value }));
                }}
                onBlur={() => touchAndValidate("title", () => validateWith())}
                placeholder="Task title"
              />
              {fieldErrors.title ? (
                <span className="task-manager__field-error">{fieldErrors.title}</span>
              ) : null}
            </label>

            <label className="task-manager__field task-manager__field--full">
              <span className="task-manager__label">Description</span>
              <textarea
                className="form-control"
                rows={2}
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional notes"
              />
            </label>

            <label className="task-manager__field task-manager__field--full">
              <span className="task-manager__label">Expected Work</span>
              <textarea
                className={`form-control${fieldErrors.expected_work ? " is-invalid" : ""}`}
                rows={3}
                value={formState.expected_work}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("expected_work", value);
                  touchAndValidate("expected_work", () => validateWith({ expectedWork: value }));
                }}
                onBlur={() => touchAndValidate("expected_work", () => validateWith())}
                placeholder="Describe the work expected from assigned workers"
                required
              />
              {fieldErrors.expected_work ? (
                <span className="task-manager__field-error">{fieldErrors.expected_work}</span>
              ) : null}
            </label>

            <label className="task-manager__field task-manager__field--full">
              <span className="task-manager__label">Completion Requirement</span>
              <textarea
                className={`form-control${fieldErrors.completion_requirement ? " is-invalid" : ""}`}
                rows={2}
                value={formState.completion_requirement}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("completion_requirement", value);
                  touchAndValidate("completion_requirement", () =>
                    validateWith({ completionRequirement: value }),
                  );
                }}
                onBlur={() => touchAndValidate("completion_requirement", () => validateWith())}
                placeholder="What constitutes completion of this task"
                required
              />
              {fieldErrors.completion_requirement ? (
                <span className="task-manager__field-error">
                  {fieldErrors.completion_requirement}
                </span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Task Start Date</span>
              <input
                className={`form-control${fieldErrors.planned_start_date ? " is-invalid" : ""}`}
                type="date"
                value={formState.planned_start_date}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("planned_start_date", value);
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
                <span className="task-manager__field-error">{fieldErrors.planned_start_date}</span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Task End Date</span>
              <input
                className={`form-control${fieldErrors.planned_end_date ? " is-invalid" : ""}`}
                type="date"
                value={formState.planned_end_date}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("planned_end_date", value);
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
                <span className="task-manager__field-error">{fieldErrors.planned_end_date}</span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Workers Needed</span>
              <input
                className={`form-control${fieldErrors.required_worker_count ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={formState.required_worker_count}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("required_worker_count", value);
                  touchAndValidate("required_worker_count", () =>
                    validateWith({ requiredWorkerCount: value }),
                  );
                }}
                onBlur={() => touchAndValidate("required_worker_count", () => validateWith())}
              />
              {fieldErrors.required_worker_count ? (
                <span className="task-manager__field-error">
                  {fieldErrors.required_worker_count}
                </span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Planned Days</span>
              <input
                className={`form-control${fieldErrors.planned_duration_days ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={formState.planned_duration_days}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("planned_duration_days", value);
                  touchAndValidate("planned_duration_days", () =>
                    validateWith({ plannedDurationDays: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_duration_days", () => validateWith())}
              />
              {fieldErrors.planned_duration_days ? (
                <span className="task-manager__field-error">
                  {fieldErrors.planned_duration_days}
                </span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Hours / Day</span>
              <input
                className={`form-control${fieldErrors.planned_hours_per_day ? " is-invalid" : ""}`}
                inputMode="decimal"
                value={formState.planned_hours_per_day}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("planned_hours_per_day", value);
                  touchAndValidate("planned_hours_per_day", () =>
                    validateWith({ plannedHoursPerDay: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_hours_per_day", () => validateWith())}
              />
              {fieldErrors.planned_hours_per_day ? (
                <span className="task-manager__field-error">
                  {fieldErrors.planned_hours_per_day}
                </span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Daily Target %</span>
              <input
                className={`form-control${fieldErrors.daily_target_percentage ? " is-invalid" : ""}`}
                inputMode="decimal"
                value={formState.daily_target_percentage}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("daily_target_percentage", value);
                  touchAndValidate("daily_target_percentage", () =>
                    validateWith({ dailyTargetPercentage: value }),
                  );
                }}
                onBlur={() => touchAndValidate("daily_target_percentage", () => validateWith())}
                placeholder="Auto from dates"
              />
              {fieldErrors.daily_target_percentage ? (
                <span className="task-manager__field-error">
                  {fieldErrors.daily_target_percentage}
                </span>
              ) : null}
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Status</span>
              <select
                className="form-select"
                value={formState.status}
                onChange={(event) =>
                  updateField("status", event.target.value as MilestoneTaskStatus)
                }
              >
                {MILESTONE_TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-manager__field">
              <span className="task-manager__label">Sort Order</span>
              <input
                className={`form-control${fieldErrors.sort_order ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={formState.sort_order}
                onChange={(event) => {
                  const value = event.target.value;
                  updateField("sort_order", value);
                  touchAndValidate("sort_order", () => validateWith({ sortOrder: value }));
                }}
                onBlur={() => touchAndValidate("sort_order", () => validateWith())}
                placeholder="1"
              />
              {fieldErrors.sort_order ? (
                <span className="task-manager__field-error">{fieldErrors.sort_order}</span>
              ) : null}
            </label>
          </div>

          <div className="task-manager__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary task-manager__secondary-action"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary task-manager__primary-action"
              disabled={processingTaskId !== null}
            >
              {processingTaskId !== null
                ? "Saving..."
                : editingTaskId
                  ? "Update Task"
                  : "Create Task"}
            </button>
          </div>
        </form>
      ) : null}

      {selectedMilestoneId === null ? (
        <EmptyState title="Select a milestone" description="Choose a milestone to review tasks." />
      ) : tasks.length === 0 && !showForm ? (
        <EmptyState
          title="No tasks have been added yet."
          description="Create tasks to track work within this milestone."
        />
      ) : tasks.length > 0 ? (
        <>
          <div className="task-manager__progress-table-wrap">
            <table className="task-manager__progress-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Planned %</th>
                  <th>Actual Verified %</th>
                  <th>Difference</th>
                  <th>Schedule</th>
                  <th>Workers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const actual = Number(task.progress_percentage || 0);
                  const planned = Number(task.expected_progress_percentage || 0);
                  const diff = actual - planned;
                  return (
                    <tr key={`progress-${task.task_id}`}>
                      <td>{task.title}</td>
                      <td>{planned.toFixed(0)}%</td>
                      <td>{actual.toFixed(0)}%</td>
                      <td className={diff < 0 ? "is-behind" : diff > 0 ? "is-ahead" : ""}>
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(0)}%
                      </td>
                      <td>{task.schedule_status_label || "—"}</td>
                      <td>{task.required_worker_count}</td>
                      <td>
                        {statusLabel(task.status)}
                        {!task.is_approved ? " · Pending approval" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="task-manager__list">
          {tasks.map((task) => {
            const progress = Number(task.progress_percentage || 0);

            return (
              <article key={task.task_id} className="task-manager__card">
                <div className="task-manager__card-main">
                  <div className="task-manager__card-header">
                    <h3>{task.title}</h3>
                    <span
                      className={`status-pill task-manager__badge task-manager__badge--${task.status}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  {task.expected_work ? (
                    <p className="task-manager__expected">
                      <strong>Expected work:</strong> {task.expected_work}
                    </p>
                  ) : null}
                  {task.completion_requirement ? (
                    <p className="task-manager__expected">
                      <strong>Completion:</strong> {task.completion_requirement}
                    </p>
                  ) : null}
                  <div className="task-manager__dates">
                    <span>
                      {formatDate(task.planned_start_date)} – {formatDate(task.planned_end_date)}
                    </span>
                  </div>
                  <div className="task-manager__meta-line">
                    <span>
                      Actual {progress.toFixed(0)}% · Planned{" "}
                      {Number(task.expected_progress_percentage || 0).toFixed(0)}%
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>
                      {task.schedule_status_label || statusLabel(task.status)}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{task.required_worker_count} workers</span>
                    <span aria-hidden="true">•</span>
                    <span>{task.is_approved ? "Approved" : "Pending approval"}</span>
                  </div>
                  <div
                    className="task-manager__progress-bar"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </div>
                  {task.manpower_utilization_percentage != null ? (
                    <p className="task-manager__utilization">
                      Utilization: {Number(task.manpower_utilization_percentage).toFixed(0)}%
                    </p>
                  ) : null}
                </div>

                <div className="task-manager__row-actions">
                  {canManageTasks ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary task-manager__edit-action"
                      onClick={() => openEditForm(task.task_id)}
                    >
                      Edit Task
                    </button>
                  ) : null}
                  {canApproveTasks && !task.is_approved && onApproveTask ? (
                    <button
                      type="button"
                      className="btn task-manager__approve-action"
                      onClick={() => void onApproveTask(task.task_id)}
                    >
                      Approve
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          </div>
        </>
      ) : null}
    </section>
  );
};

export default TaskManager;
