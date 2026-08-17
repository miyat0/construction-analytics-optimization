import { useEffect, useMemo, useState, type FormEvent } from "react";

import { DetailModal } from "../ui/DetailModal";
import {
  MILESTONE_TASK_STATUS_OPTIONS,
  type Milestone,
  type MilestoneTaskPayload,
  type MilestoneTaskStatus,
} from "../../types/project";

import "./ProjectEntityModal.css";

type AddTaskModalProps = {
  isOpen: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onSubmit: (payload: MilestoneTaskPayload) => Promise<void>;
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

export const AddTaskModal = ({ isOpen, milestone, onClose, onSubmit }: AddTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [requiredWorkerCount, setRequiredWorkerCount] = useState("1");
  const [dailyTargetPercentage, setDailyTargetPercentage] = useState("");
  const [status, setStatus] = useState<MilestoneTaskStatus>("planned");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextSortOrder = useMemo(() => (milestone?.sort_order ?? 0) + 1, [milestone]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle("");
    setDescription("");
    setPlannedStartDate(milestone?.planned_start_date ?? "");
    setPlannedEndDate(milestone?.effective_end_date ?? milestone?.planned_end_date ?? "");
    setRequiredWorkerCount("1");
    setDailyTargetPercentage("");
    setStatus("planned");
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen, milestone]);

  useEffect(() => {
    if (!isOpen || dailyTargetPercentage) {
      return;
    }
    const suggested = suggestDailyTarget(plannedStartDate, plannedEndDate);
    if (suggested) {
      setDailyTargetPercentage(suggested);
    }
  }, [dailyTargetPercentage, isOpen, plannedEndDate, plannedStartDate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "Task title is required.";
    }
    if (
      plannedStartDate &&
      plannedEndDate &&
      new Date(plannedEndDate).getTime() < new Date(plannedStartDate).getTime()
    ) {
      nextErrors.planned_end_date = "End date must be on or after the start date.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        planned_start_date: plannedStartDate || null,
        planned_end_date: plannedEndDate || null,
        required_worker_count: Number(requiredWorkerCount || "1"),
        daily_target_percentage: dailyTargetPercentage ? Number(dailyTargetPercentage) : null,
        status,
        sort_order: nextSortOrder,
      });
      onClose();
    } catch {
      setErrorMessage("Unable to save the task right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailModal
      className="project-entity-modal project-entity-modal--form"
      isOpen={isOpen}
      title="Add Task"
      description={milestone ? `Add a task to ${milestone.title}.` : null}
      onClose={onClose}
      size="sm"
    >
      <form className="project-entity-modal__form" onSubmit={(event) => void handleSubmit(event)}>
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">Task Title</span>
          <input
            className="form-control"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
          />
          {fieldErrors.title ? (
            <span className="project-entity-modal__error">{fieldErrors.title}</span>
          ) : null}
        </label>

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">
            Description <span className="project-entity-modal__optional">(optional)</span>
          </span>
          <textarea
            className="form-control project-entity-modal__textarea"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional notes"
          />
        </label>

        <div className="project-entity-modal__row">
          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">Start Date</span>
            <input
              className="form-control"
              type="date"
              value={plannedStartDate}
              onChange={(event) => setPlannedStartDate(event.target.value)}
            />
          </label>
          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">Due Date</span>
            <input
              className="form-control"
              type="date"
              value={plannedEndDate}
              onChange={(event) => setPlannedEndDate(event.target.value)}
            />
            {fieldErrors.planned_end_date ? (
              <span className="project-entity-modal__error">{fieldErrors.planned_end_date}</span>
            ) : null}
          </label>
        </div>

        <div className="project-entity-modal__row">
          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">Workers Needed</span>
            <input
              className="form-control"
              inputMode="numeric"
              value={requiredWorkerCount}
              onChange={(event) => setRequiredWorkerCount(event.target.value)}
            />
          </label>
          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">Daily Target %</span>
            <input
              className="form-control"
              inputMode="decimal"
              value={dailyTargetPercentage}
              onChange={(event) => setDailyTargetPercentage(event.target.value)}
              placeholder="Auto from dates"
            />
          </label>
        </div>

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">Status</span>
          <div className="project-entity-modal__select-wrap">
            <select
              className="form-select project-entity-modal__select"
              value={status}
              onChange={(event) => setStatus(event.target.value as MilestoneTaskStatus)}
            >
              {MILESTONE_TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="project-entity-modal__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Task"}
          </button>
        </div>
      </form>
    </DetailModal>
  );
};

export default AddTaskModal;
