import { useEffect, useMemo, useState, type FormEvent } from "react";

import { DetailModal } from "../ui/DetailModal";
import {
  MILESTONE_STATUS_OPTIONS,
  type Milestone,
  type MilestonePayload,
  type MilestoneStatus,
} from "../../types/project";

import "./ProjectEntityModal.css";

type AddMilestoneModalProps = {
  isOpen: boolean;
  projectName?: string | null;
  milestones: Milestone[];
  onClose: () => void;
  onSubmit: (payload: MilestonePayload) => Promise<void>;
};

export const AddMilestoneModal = ({
  isOpen,
  projectName,
  milestones,
  onClose,
  onSubmit,
}: AddMilestoneModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("planned");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextSortOrder = useMemo(() => {
    const maxOrder = milestones.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0);
    return maxOrder + 1;
  }, [milestones]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle("");
    setDescription("");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setStatus("planned");
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "Milestone title is required.";
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
        status,
        sort_order: nextSortOrder,
      });
      onClose();
    } catch {
      setErrorMessage("Unable to save the milestone right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailModal
      className="project-entity-modal project-entity-modal--form"
      isOpen={isOpen}
      title="Add Milestone"
      description={projectName ? `Create a new milestone for ${projectName}.` : null}
      onClose={onClose}
      size="sm"
    >
      <form className="project-entity-modal__form" onSubmit={(event) => void handleSubmit(event)}>
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">Milestone Title</span>
          <input
            className="form-control"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter milestone title"
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
            <span className="project-entity-modal__label">End Date</span>
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

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">Status</span>
          <div className="project-entity-modal__select-wrap">
            <select
              className="form-select project-entity-modal__select"
              value={status}
              onChange={(event) => setStatus(event.target.value as MilestoneStatus)}
            >
              {MILESTONE_STATUS_OPTIONS.map((option) => (
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
            {isSubmitting ? "Adding..." : "Add Milestone"}
          </button>
        </div>
      </form>
    </DetailModal>
  );
};

export default AddMilestoneModal;
