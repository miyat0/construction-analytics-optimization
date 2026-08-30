import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";
import {
  MILESTONE_STATUS_OPTIONS,
  type Milestone,
  type MilestonePayload,
  type MilestoneStatus,
} from "../../types/project";

import "./MilestoneManager.css";

const ViewIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
    <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const EditIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M9.5 3.5 12.5 6.5M2.75 13.25l2.1-.35 7.4-7.4a1.5 1.5 0 0 0-2.12-2.12l-7.4 7.4-.35 2.1Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M3 4.5h10M6.25 4.5V3.25A.75.75 0 0 1 7 2.5h2a.75.75 0 0 1 .75.75V4.5M12.25 4.5V13a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1V4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

type MilestoneFormState = {
  title: string;
  description: string;
  planned_start_date: string;
  planned_end_date: string;
  status: MilestoneStatus;
  sort_order: string;
};

type PanelMode = "list" | "form" | "detail";

interface MilestoneManagerProps {
  milestones: Milestone[];
  canManage: boolean;
  onCreate: (payload: MilestonePayload) => Promise<void>;
  onUpdate: (milestoneId: number, payload: Partial<MilestonePayload>) => Promise<void>;
  onDelete: (milestoneId: number) => Promise<void>;
  onSelectMilestone?: (milestoneId: number) => void;
  onClearSelection?: () => void;
  detailContent?: ReactNode;
  formRequestKey?: number;
  /** When set, Add Milestone navigates instead of opening an inline form. */
  onRequestCreate?: () => void;
  /** When set, open this milestone's detail view (e.g. after returning from create pages). */
  activeMilestoneId?: number | null;
  /** When true, stay on list and use onSelectMilestone for View (page navigation). */
  listOnly?: boolean;
  /** When true, hide internal section title/toolbar (parent page owns header). */
  hideChrome?: boolean;
}

const defaultMilestoneFormState: MilestoneFormState = {
  title: "",
  description: "",
  planned_start_date: "",
  planned_end_date: "",
  status: "planned",
  sort_order: "",
};

const formatDateLabel = (value: string | null): string => {
  if (!value) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const getDaySpan = (start: string | null, end: string | null): string | null => {
  if (!start || !end) {
    return null;
  }

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }

  const days = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
};

const statusLabel = (status: MilestoneStatus): string => {
  return (
    MILESTONE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
};

export const MilestoneManager = ({
  milestones,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  onSelectMilestone,
  onClearSelection,
  detailContent,
  formRequestKey = 0,
  onRequestCreate,
  activeMilestoneId = null,
  listOnly = false,
  hideChrome = false,
}: MilestoneManagerProps) => {
  const [panelMode, setPanelMode] = useState<PanelMode>("list");
  const [formState, setFormState] = useState<MilestoneFormState>(defaultMilestoneFormState);
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [viewingMilestoneId, setViewingMilestoneId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingMilestoneId, setProcessingMilestoneId] = useState<number | null>(null);

  useEffect(() => {
    if (!canManage || formRequestKey <= 0 || onRequestCreate) {
      return;
    }

    setEditingMilestoneId(null);
    setFormState(defaultMilestoneFormState);
    setErrorMessage(null);
    setPanelMode("form");
  }, [canManage, formRequestKey, onRequestCreate]);

  useEffect(() => {
    if (listOnly || !activeMilestoneId) {
      return;
    }

    setViewingMilestoneId(activeMilestoneId);
    setPanelMode("detail");
  }, [activeMilestoneId, listOnly]);

  const viewingMilestone =
    viewingMilestoneId == null
      ? null
      : milestones.find((item) => item.milestone_id === viewingMilestoneId) ?? null;

  useEffect(() => {
    if (panelMode !== "form") {
      return;
    }

    if (!editingMilestoneId) {
      setFormState(defaultMilestoneFormState);
      return;
    }

    const milestone = milestones.find((item) => item.milestone_id === editingMilestoneId);
    if (!milestone) {
      setEditingMilestoneId(null);
      setFormState(defaultMilestoneFormState);
      return;
    }

    setFormState({
      title: milestone.title,
      description: milestone.description,
      planned_start_date: milestone.planned_start_date ?? "",
      planned_end_date: milestone.planned_end_date ?? "",
      status: milestone.status,
      sort_order: String(milestone.sort_order),
    });
  }, [editingMilestoneId, milestones, panelMode]);

  const updateField = <K extends keyof MilestoneFormState>(
    field: K,
    value: MilestoneFormState[K],
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const returnToList = () => {
    setPanelMode("list");
    setEditingMilestoneId(null);
    setViewingMilestoneId(null);
    setFormState(defaultMilestoneFormState);
    setErrorMessage(null);
    onClearSelection?.();
  };

  const openCreateForm = () => {
    if (onRequestCreate) {
      onRequestCreate();
      return;
    }

    setEditingMilestoneId(null);
    setFormState(defaultMilestoneFormState);
    setErrorMessage(null);
    setPanelMode("form");
  };

  const openEditForm = (milestoneId: number) => {
    setEditingMilestoneId(milestoneId);
    setErrorMessage(null);
    setPanelMode("form");
  };

  const openDetail = (milestoneId: number) => {
    if (listOnly) {
      onSelectMilestone?.(milestoneId);
      return;
    }

    setViewingMilestoneId(milestoneId);
    setPanelMode("detail");
    onSelectMilestone?.(milestoneId);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formState.title.trim()) {
      setErrorMessage("Milestone title is required.");
      return;
    }

    if (
      formState.planned_start_date &&
      formState.planned_end_date &&
      new Date(formState.planned_end_date).getTime() <
        new Date(formState.planned_start_date).getTime()
    ) {
      setErrorMessage("Milestone end date cannot be earlier than the start date.");
      return;
    }

    const payload: MilestonePayload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      planned_start_date: formState.planned_start_date || null,
      planned_end_date: formState.planned_end_date || null,
      status: formState.status,
      sort_order: formState.sort_order ? Number(formState.sort_order) : undefined,
    };

    setProcessingMilestoneId(editingMilestoneId ?? -1);

    try {
      if (editingMilestoneId) {
        await onUpdate(editingMilestoneId, payload);
      } else {
        await onCreate(payload);
      }
      returnToList();
    } finally {
      setProcessingMilestoneId(null);
    }
  };

  const handleDelete = async (milestoneId: number, title: string) => {
    const confirmed = window.confirm(
      `Delete milestone?\n\nAre you sure you want to delete "${title}"?`,
    );
    if (!confirmed) {
      return;
    }

    setProcessingMilestoneId(milestoneId);
    try {
      await onDelete(milestoneId);
      if (viewingMilestoneId === milestoneId || editingMilestoneId === milestoneId) {
        returnToList();
      }
    } finally {
      setProcessingMilestoneId(null);
    }
  };

  const addMilestoneButton = canManage ? (
    <button
      type="button"
      className="admin-btn admin-btn--primary milestone-manager__primary-action"
      onClick={openCreateForm}
    >
      <span className="admin-btn__plus" aria-hidden>
        +
      </span>{" "}
      Add Milestone
    </button>
  ) : null;

  if (panelMode === "form" && canManage) {
    return (
      <section className="milestone-manager">
        <div className="milestone-manager__header">
          <div>
            <button type="button" className="milestone-manager__back" onClick={returnToList}>
              ← Back to Milestones
            </button>
            <h2 className="milestone-manager__page-title">
              {editingMilestoneId ? "Edit Milestone" : "Add Milestone"}
            </h2>
          </div>
        </div>

        <form className="milestone-manager__form" onSubmit={(event) => void handleSubmit(event)}>
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="milestone-manager__grid">
            <div className="milestone-manager__field milestone-manager__field--full">
              <label className="milestone-manager__label" htmlFor="milestone_title">
                Title
              </label>
              <input
                id="milestone_title"
                className="form-control"
                value={formState.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Milestone title"
              />
            </div>

            <div className="milestone-manager__field milestone-manager__field--full">
              <label className="milestone-manager__label" htmlFor="milestone_description">
                Description
              </label>
              <textarea
                id="milestone_description"
                className="form-control"
                rows={3}
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="milestone-manager__field">
              <label className="milestone-manager__label" htmlFor="milestone_start_date">
                Start Date
              </label>
              <input
                id="milestone_start_date"
                className="form-control"
                type="date"
                value={formState.planned_start_date}
                onChange={(event) => updateField("planned_start_date", event.target.value)}
              />
            </div>

            <div className="milestone-manager__field">
              <label className="milestone-manager__label" htmlFor="milestone_end_date">
                End Date
              </label>
              <input
                id="milestone_end_date"
                className="form-control"
                type="date"
                value={formState.planned_end_date}
                onChange={(event) => updateField("planned_end_date", event.target.value)}
              />
            </div>

            <div className="milestone-manager__field">
              <label className="milestone-manager__label" htmlFor="milestone_status">
                Status
              </label>
              <select
                id="milestone_status"
                className="form-select"
                value={formState.status}
                onChange={(event) => updateField("status", event.target.value as MilestoneStatus)}
              >
                {MILESTONE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="milestone-manager__field">
              <label className="milestone-manager__label" htmlFor="milestone_order">
                Sort Order
              </label>
              <input
                id="milestone_order"
                className="form-control"
                inputMode="numeric"
                value={formState.sort_order}
                onChange={(event) => updateField("sort_order", event.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          <div className="milestone-manager__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary milestone-manager__secondary-action"
              onClick={returnToList}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary milestone-manager__primary-action"
              disabled={processingMilestoneId !== null}
            >
              {processingMilestoneId !== null
                ? "Saving..."
                : editingMilestoneId
                  ? "Update Milestone"
                  : "Add Milestone"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (panelMode === "detail" && viewingMilestone) {
    const span = getDaySpan(
      viewingMilestone.planned_start_date,
      viewingMilestone.effective_end_date || viewingMilestone.planned_end_date,
    );
    const progress = Number(viewingMilestone.progress_percentage || 0);

    return (
      <section className="milestone-manager">
        <div className="milestone-manager__header milestone-manager__header--detail">
          <div>
            <button type="button" className="milestone-manager__back" onClick={returnToList}>
              ← Back to Milestones
            </button>
            <h2 className="milestone-manager__page-title">{viewingMilestone.title}</h2>
            <div className="milestone-manager__detail-meta">
              <span
                className={`status-pill milestone-manager__badge milestone-manager__badge--${viewingMilestone.status}`}
              >
                {statusLabel(viewingMilestone.status)}
              </span>
              <span className="milestone-manager__order-chip">
                Order #{viewingMilestone.sort_order}
              </span>
            </div>
          </div>
          {canManage ? (
            <div className="milestone-manager__header-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary milestone-manager__secondary-action"
                onClick={() => openEditForm(viewingMilestone.milestone_id)}
              >
                Edit Milestone
              </button>
            </div>
          ) : null}
        </div>

        <div className="milestone-manager__summary">
          <div className="milestone-manager__summary-grid">
            <div className="milestone-manager__summary-item">
              <span className="milestone-manager__detail-label">Start Date</span>
              <span className="milestone-manager__detail-value">
                {formatDateLabel(viewingMilestone.planned_start_date)}
              </span>
            </div>
            <div className="milestone-manager__summary-item">
              <span className="milestone-manager__detail-label">End Date</span>
              <span className="milestone-manager__detail-value">
                {formatDateLabel(
                  viewingMilestone.effective_end_date || viewingMilestone.planned_end_date,
                )}
              </span>
            </div>
            {span ? (
              <div className="milestone-manager__summary-item">
                <span className="milestone-manager__detail-label">Duration</span>
                <span className="milestone-manager__detail-value">{span}</span>
              </div>
            ) : null}
            <div className="milestone-manager__summary-item">
              <span className="milestone-manager__detail-label">Progress</span>
              <span className="milestone-manager__detail-value">{progress.toFixed(0)}%</span>
              <div
                className="milestone-manager__progress-bar milestone-manager__progress-bar--summary"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
              </div>
            </div>
          </div>
          {viewingMilestone.description ? (
            <div className="milestone-manager__summary-description">
              <span className="milestone-manager__detail-label">Description</span>
              <p>{viewingMilestone.description}</p>
            </div>
          ) : null}
        </div>

        {detailContent}
      </section>
    );
  }

  return (
    <section className="milestone-manager">
      {hideChrome || listOnly ? null : milestones.length > 0 ? (
        <SectionHeader title="Milestones" action={addMilestoneButton} />
      ) : (
        <SectionHeader title="Milestones" />
      )}

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet."
          description="Create the first milestone to begin project tracking."
          action={hideChrome ? undefined : addMilestoneButton}
        />
      ) : (
        <div className="milestone-manager__list">
          {milestones.map((milestone) => {
            const endDate = milestone.effective_end_date || milestone.planned_end_date;
            const span = getDaySpan(milestone.planned_start_date, endDate);
            const progress = Number(milestone.progress_percentage || 0).toFixed(0);

            return (
              <article key={milestone.milestone_id} className="milestone-manager__card">
                <button
                  type="button"
                  className="milestone-manager__card-main"
                  onClick={() => openDetail(milestone.milestone_id)}
                >
                  <div className="milestone-manager__title-row">
                    <h3>{milestone.title}</h3>
                    <StatusBadge
                      label={
                        milestone.schedule_status_label ||
                        statusLabel(milestone.status)
                      }
                      tone={
                        milestone.schedule_status === "behind_schedule"
                          ? "delayed"
                          : milestone.schedule_status === "ahead_of_schedule"
                            ? "active"
                            : milestone.schedule_status === "completed"
                              ? "completed"
                              : milestone.schedule_status === "on_schedule"
                                ? "in_progress"
                                : milestone.status
                      }
                    />
                  </div>
                  <div className="milestone-manager__dates">
                    <span>
                      {formatDateLabel(milestone.planned_start_date)} –{" "}
                      {formatDateLabel(endDate)}
                    </span>
                  </div>
                  <div className="milestone-manager__meta-line">
                    {span ? <span>{span}</span> : null}
                    {span ? <span aria-hidden="true">•</span> : null}
                    <span>
                      Actual {progress}% · Planned{" "}
                      {Number(milestone.expected_progress_percentage || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="milestone-manager__progress-bar"
                    role="progressbar"
                    aria-valuenow={Number(progress) || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(progress) || 0))}%`,
                      }}
                    />
                  </div>
                </button>

                <div className="milestone-manager__inline-actions">
                  <button
                    type="button"
                    className="milestone-manager__icon-action"
                    title="View milestone"
                    aria-label={`View ${milestone.title}`}
                    onClick={() => openDetail(milestone.milestone_id)}
                  >
                    <ViewIcon />
                  </button>
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        className="milestone-manager__icon-action"
                        title="Edit milestone"
                        aria-label={`Edit ${milestone.title}`}
                        onClick={() => openEditForm(milestone.milestone_id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="milestone-manager__icon-action milestone-manager__icon-action--danger"
                        title="Delete milestone"
                        aria-label={`Delete ${milestone.title}`}
                        onClick={() => void handleDelete(milestone.milestone_id, milestone.title)}
                        disabled={processingMilestoneId === milestone.milestone_id}
                      >
                        <DeleteIcon />
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MilestoneManager;
