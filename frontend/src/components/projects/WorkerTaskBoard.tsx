import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  INCOMPLETE_WORK_REASON_OPTIONS,
  TASK_UPDATE_STATUS_OPTIONS,
  type DailyTaskUpdatePayload,
  type IncompleteWorkReason,
  type TaskAssignment,
  type TaskUpdateStatus,
} from "../../types/project";
import { validateWorkerUpdateFields } from "../../utils/formValidation";

import "./WorkerTaskBoard.css";

interface WorkerTaskBoardProps {
  assignments: TaskAssignment[];
  onSubmitUpdate: (assignmentId: number, payload: DailyTaskUpdatePayload) => Promise<void>;
  title?: string;
  showHeader?: boolean;
}

type WorkerUpdateFormState = {
  completion_percentage: string;
  status: TaskUpdateStatus;
  remark: string;
  concern_text: string;
  incomplete_reason: IncompleteWorkReason | "";
  incomplete_reason_detail: string;
  has_safety_issue: boolean;
};

type WorkerLiveOverrides = Partial<{
  assignmentSelected: boolean;
  completionPercentage: string;
  status: string;
  incompleteReason: string;
  incompleteReasonDetail: string;
  concernText: string;
}>;

const defaultFormState: WorkerUpdateFormState = {
  completion_percentage: "0",
  status: "not_started",
  remark: "",
  concern_text: "",
  incomplete_reason: "",
  incomplete_reason_detail: "",
  has_safety_issue: false,
};

const RELATED_FIELDS = [
  "assignment_id",
  "completion_percentage",
  "status",
  "incomplete_reason",
  "incomplete_reason_detail",
  "concern_text",
] as const;

export const WorkerTaskBoard = ({
  assignments,
  onSubmitUpdate,
  title = "Tasks",
  showHeader = true,
}: WorkerTaskBoardProps) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [formState, setFormState] = useState<WorkerUpdateFormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fieldErrors, touchAndValidate, validateSubmit, resetFieldValidation } =
    useLiveFieldValidation();

  const selectedAssignment = useMemo(() => {
    return assignments.find((assignment) => assignment.assignment_id === selectedAssignmentId) ?? null;
  }, [assignments, selectedAssignmentId]);

  const validateWith = (overrides: WorkerLiveOverrides = {}) =>
    validateWorkerUpdateFields({
      assignmentSelected: overrides.assignmentSelected ?? Boolean(selectedAssignmentId),
      completionPercentage: overrides.completionPercentage ?? formState.completion_percentage,
      status: overrides.status ?? formState.status,
      incompleteReason: overrides.incompleteReason ?? formState.incomplete_reason,
      incompleteReasonDetail:
        overrides.incompleteReasonDetail ?? formState.incomplete_reason_detail,
      concernText: overrides.concernText ?? formState.concern_text,
    });

  useEffect(() => {
    const nextAssignment = assignments[0] ?? null;
    setSelectedAssignmentId((currentValue) =>
      currentValue && assignments.some((assignment) => assignment.assignment_id === currentValue)
        ? currentValue
        : nextAssignment?.assignment_id ?? null,
    );
  }, [assignments]);

  useEffect(() => {
    resetFieldValidation();
    setErrorMessage(null);

    if (!selectedAssignment?.latest_update) {
      setFormState(defaultFormState);
      return;
    }

    setFormState({
      completion_percentage: selectedAssignment.latest_update.completion_percentage,
      status: selectedAssignment.latest_update.status,
      remark: selectedAssignment.latest_update.remark,
      concern_text: selectedAssignment.latest_update.concern_text,
      incomplete_reason: selectedAssignment.latest_update.incomplete_reason || "",
      incomplete_reason_detail:
        selectedAssignment.latest_update.incomplete_reason_detail || "",
      has_safety_issue: selectedAssignment.latest_update.has_safety_issue,
    });
  }, [resetFieldValidation, selectedAssignment]);

  const isIncomplete =
    formState.status !== "completed" || Number(formState.completion_percentage) < 100;

  const updateField = <K extends keyof WorkerUpdateFormState>(
    field: K,
    value: WorkerUpdateFormState[K],
    live?: { fields: string | string[]; overrides?: WorkerLiveOverrides },
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    if (live) {
      touchAndValidate(live.fields, () => validateWith(live.overrides ?? {}));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!selectedAssignmentId) {
      return;
    }

    const completion = Number(formState.completion_percentage);
    const incomplete = formState.status !== "completed" || completion < 100;

    setIsSubmitting(true);

    try {
      await onSubmitUpdate(selectedAssignmentId, {
        completion_percentage: formState.completion_percentage,
        status: formState.status,
        remark: formState.remark.trim(),
        concern_text: formState.concern_text.trim(),
        incomplete_reason: incomplete ? formState.incomplete_reason : "",
        incomplete_reason_detail: incomplete
          ? formState.incomplete_reason_detail.trim()
          : "",
        has_safety_issue: formState.has_safety_issue,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to submit the work update. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="worker-task-board">
      {showHeader ? (
        <div className="worker-task-board__header">
          <h2>
            <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none">
              <path
                d="M7.5 4.5h5M8 3h4a1 1 0 0 1 1 1v1.5H7V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M6.5 5.5h7A1.5 1.5 0 0 1 15 7v8.5A1.5 1.5 0 0 1 13.5 17h-7A1.5 1.5 0 0 1 5 15.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            <span>{title}</span>
            <span className="worker-task-board__count">{assignments.length}</span>
          </h2>
        </div>
      ) : null}

      {assignments.length === 0 ? (
        <div className="worker-task-board__empty">
          <span className="worker-task-board__empty-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="24" height="24" fill="none">
              <path
                d="M7.5 4.5h5M8 3h4a1 1 0 0 1 1 1v1.5H7V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M6.5 5.5h7A1.5 1.5 0 0 1 15 7v8.5A1.5 1.5 0 0 1 13.5 17h-7A1.5 1.5 0 0 1 5 15.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <strong className="worker-task-board__empty-title">No tasks in this filter</strong>
          <span>Try another filter to see assigned work.</span>
        </div>
      ) : (
        <div className="worker-task-board__layout">
          <div className="worker-task-board__assignment-list">
            {assignments.map((assignment) => {
              const statusLabel = assignment.latest_update
                ? assignment.latest_update.status.replace(/_/g, " ")
                : "Not started";

              return (
                <button
                  key={assignment.assignment_id}
                  type="button"
                  className={`worker-task-board__assignment-card ${
                    selectedAssignmentId === assignment.assignment_id
                      ? "worker-task-board__assignment-card--active"
                      : ""
                  }`}
                  onClick={() => setSelectedAssignmentId(assignment.assignment_id)}
                >
                  <strong>{assignment.task.title}</strong>
                  <div className="worker-task-board__assignment-meta">
                    <span>
                      {assignment.task.project_name}
                      {assignment.task.milestone_title
                        ? ` · ${assignment.task.milestone_title}`
                        : ""}
                    </span>
                    <span className="worker-task-board__assignment-status">{statusLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <form className="worker-task-board__form" onSubmit={(event) => void handleSubmit(event)}>
            {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}
            {fieldErrors.assignment_id ? (
              <div className="alert alert-danger mb-0">{fieldErrors.assignment_id}</div>
            ) : null}

            {selectedAssignment ? (
              <>
                <div className="worker-task-board__details">
                  <h3>{selectedAssignment.task.title}</h3>
                  {selectedAssignment.duty_instructions ? (
                    <p>
                      <strong>Your duty: </strong>
                      {selectedAssignment.duty_instructions}
                    </p>
                  ) : null}
                  {selectedAssignment.task.expected_work ? (
                    <p>
                      <strong>Expected work: </strong>
                      {selectedAssignment.task.expected_work}
                    </p>
                  ) : null}
                  <div className="worker-task-board__plan-meta">
                    {selectedAssignment.task.daily_target_percentage ? (
                      <span>
                        Daily target: {Number(selectedAssignment.task.daily_target_percentage).toFixed(0)}%
                      </span>
                    ) : null}
                    {selectedAssignment.task.expected_progress_percentage != null ? (
                      <span>
                        Planned to date:{" "}
                        {Number(selectedAssignment.task.expected_progress_percentage).toFixed(0)}%
                      </span>
                    ) : null}
                    {selectedAssignment.latest_update?.completion_percentage != null ? (
                      <span>
                        Your last update:{" "}
                        {Number(selectedAssignment.latest_update.completion_percentage).toFixed(0)}%
                      </span>
                    ) : (
                      <span>No update submitted yet</span>
                    )}
                  </div>
                  {selectedAssignment.latest_update?.supervisor_review_status ===
                  "rejected" ? (
                    <div className="worker-task-board__feedback" role="status">
                      <strong>Supervisor rejected this update</strong>
                      <span>
                        {selectedAssignment.latest_update.supervisor_review_note ||
                          "Please correct and resubmit."}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="worker-task-board__grid">
                  <label className="worker-task-board__field">
                    <span className="worker-task-board__label">Completion %</span>
                    <input
                      className={`form-control${fieldErrors.completion_percentage ? " is-invalid" : ""}`}
                      inputMode="decimal"
                      value={formState.completion_percentage}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateField("completion_percentage", value, {
                          fields: [...RELATED_FIELDS],
                          overrides: { completionPercentage: value },
                        });
                      }}
                      onBlur={() =>
                        touchAndValidate([...RELATED_FIELDS], () => validateWith())
                      }
                    />
                    {fieldErrors.completion_percentage ? (
                      <span className="worker-task-board__field-error">
                        {fieldErrors.completion_percentage}
                      </span>
                    ) : null}
                  </label>

                  <label className="worker-task-board__field">
                    <span className="worker-task-board__label">Work Status</span>
                    <select
                      className={`form-select${fieldErrors.status ? " is-invalid" : ""}`}
                      value={formState.status}
                      onChange={(event) => {
                        const value = event.target.value as TaskUpdateStatus;
                        updateField("status", value, {
                          fields: [...RELATED_FIELDS],
                          overrides: { status: value },
                        });
                      }}
                      onBlur={() =>
                        touchAndValidate([...RELATED_FIELDS], () => validateWith())
                      }
                    >
                      {TASK_UPDATE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.status ? (
                      <span className="worker-task-board__field-error">{fieldErrors.status}</span>
                    ) : null}
                  </label>

                  {isIncomplete ? (
                    <>
                      <label className="worker-task-board__field worker-task-board__field--full">
                        <span className="worker-task-board__label">
                          Incomplete Work Reason
                        </span>
                        <select
                          className={`form-select${fieldErrors.incomplete_reason ? " is-invalid" : ""}`}
                          value={formState.incomplete_reason}
                          onChange={(event) => {
                            const value = event.target.value as IncompleteWorkReason | "";
                            updateField("incomplete_reason", value, {
                              fields: [...RELATED_FIELDS],
                              overrides: { incompleteReason: value },
                            });
                          }}
                          onBlur={() =>
                            touchAndValidate([...RELATED_FIELDS], () => validateWith())
                          }
                        >
                          <option value="">Select reason</option>
                          {INCOMPLETE_WORK_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.incomplete_reason ? (
                          <span className="worker-task-board__field-error">
                            {fieldErrors.incomplete_reason}
                          </span>
                        ) : null}
                      </label>
                      <label className="worker-task-board__field worker-task-board__field--full">
                        <span className="worker-task-board__label">
                          Incomplete Work Details
                        </span>
                        <textarea
                          className={`form-control${fieldErrors.incomplete_reason_detail ? " is-invalid" : ""}`}
                          rows={2}
                          value={formState.incomplete_reason_detail}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateField("incomplete_reason_detail", value, {
                              fields: [...RELATED_FIELDS],
                              overrides: { incompleteReasonDetail: value },
                            });
                          }}
                          onBlur={() =>
                            touchAndValidate([...RELATED_FIELDS], () => validateWith())
                          }
                          placeholder="Explain why work is incomplete..."
                        />
                        {fieldErrors.incomplete_reason_detail ? (
                          <span className="worker-task-board__field-error">
                            {fieldErrors.incomplete_reason_detail}
                          </span>
                        ) : null}
                      </label>
                    </>
                  ) : null}

                  <label className="worker-task-board__field worker-task-board__field--full">
                    <span className="worker-task-board__label">Remark</span>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formState.remark}
                      onChange={(event) => updateField("remark", event.target.value)}
                    />
                  </label>

                  <label className="worker-task-board__field worker-task-board__field--full">
                    <span className="worker-task-board__label">Concern</span>
                    <textarea
                      className={`form-control${fieldErrors.concern_text ? " is-invalid" : ""}`}
                      rows={2}
                      value={formState.concern_text}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateField("concern_text", value, {
                          fields: [...RELATED_FIELDS],
                          overrides: { concernText: value },
                        });
                      }}
                      onBlur={() =>
                        touchAndValidate([...RELATED_FIELDS], () => validateWith())
                      }
                    />
                    {fieldErrors.concern_text ? (
                      <span className="worker-task-board__field-error">
                        {fieldErrors.concern_text}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="worker-task-board__checkbox">
                  <input
                    type="checkbox"
                    checked={formState.has_safety_issue}
                    onChange={(event) => updateField("has_safety_issue", event.target.checked)}
                  />
                  <span>Safety issue</span>
                </label>

                <div className="worker-task-board__actions">
                  <button
                    type="submit"
                    className="worker-task-board__primary-action"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Submit Daily Update"}
                  </button>
                </div>
              </>
            ) : (
              <div className="worker-task-board__empty">Select a task to update.</div>
            )}
          </form>
        </div>
      )}
    </section>
  );
};

export default WorkerTaskBoard;
