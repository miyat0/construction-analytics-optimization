import { useEffect, useState, type FormEvent } from "react";

import { DetailModal } from "../ui/DetailModal";
import type { Milestone, MilestoneExtensionPayload } from "../../types/project";

import "./ProjectEntityModal.css";

type AddTimelineExtensionModalProps = {
  isOpen: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onSubmit: (payload: MilestoneExtensionPayload) => Promise<void>;
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

export const AddTimelineExtensionModal = ({
  isOpen,
  milestone,
  onClose,
  onSubmit,
}: AddTimelineExtensionModalProps) => {
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEndDate = milestone?.effective_end_date || milestone?.planned_end_date || null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setNewEndDate("");
    setReason("");
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!newEndDate) {
      nextErrors.new_end_date = "New end date is required.";
    } else if (
      currentEndDate &&
      new Date(newEndDate).getTime() <= new Date(currentEndDate).getTime()
    ) {
      nextErrors.new_end_date = "New end date must be after the current end date.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        new_end_date: newEndDate,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch {
      setErrorMessage("Unable to add the timeline extension right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailModal
      className="project-entity-modal project-entity-modal--form"
      isOpen={isOpen}
      title="Add Timeline Extension"
      description={milestone ? `Extend the schedule for ${milestone.title}.` : null}
      onClose={onClose}
      size="sm"
    >
      <form className="project-entity-modal__form" onSubmit={(event) => void handleSubmit(event)}>
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        <div className="project-entity-modal__readonly">
          <span className="project-entity-modal__label">Current End Date</span>
          <p className="project-entity-modal__readonly-value">{formatDate(currentEndDate)}</p>
        </div>

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">New End Date</span>
          <input
            className="form-control"
            type="date"
            value={newEndDate}
            onChange={(event) => setNewEndDate(event.target.value)}
          />
          {fieldErrors.new_end_date ? (
            <span className="project-entity-modal__error">{fieldErrors.new_end_date}</span>
          ) : null}
        </label>

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">
            Reason <span className="project-entity-modal__optional">(optional)</span>
          </span>
          <textarea
            className="form-control project-entity-modal__textarea"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is more time needed?"
          />
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
            {isSubmitting ? "Adding..." : "Add Extension"}
          </button>
        </div>
      </form>
    </DetailModal>
  );
};

export default AddTimelineExtensionModal;
