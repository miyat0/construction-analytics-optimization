import { useMemo, useState, type FormEvent } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import type { Milestone, MilestoneExtension, MilestoneExtensionPayload } from "../../types/project";

import "./MilestoneExtensionManager.css";

interface MilestoneExtensionManagerProps {
  milestones: Milestone[];
  selectedMilestoneId: number | null;
  extensions: MilestoneExtension[];
  canManage: boolean;
  onSelectMilestone: (milestoneId: number) => void;
  onCreate: (payload: MilestoneExtensionPayload) => Promise<void>;
  onUpdate?: (
    extensionId: number,
    payload: Partial<MilestoneExtensionPayload>,
  ) => Promise<void>;
  onDelete?: (extensionId: number) => Promise<void>;
  /** When true, hide milestone picker (used inside milestone detail). */
  embedded?: boolean;
  /** When set, Add Extension navigates instead of opening an inline form. */
  onRequestCreate?: () => void;
  onRequestEdit?: (extensionId: number) => void;
  onRequestView?: (extensionId: number) => void;
}

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

export const MilestoneExtensionManager = ({
  milestones,
  selectedMilestoneId,
  extensions,
  canManage,
  onSelectMilestone,
  onCreate,
  embedded = false,
  onRequestCreate,
  onRequestEdit,
}: MilestoneExtensionManagerProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMilestone = useMemo(() => {
    return milestones.find((milestone) => milestone.milestone_id === selectedMilestoneId) ?? null;
  }, [milestones, selectedMilestoneId]);

  const closeForm = () => {
    setIsFormOpen(false);
    setNewEndDate("");
    setReason("");
    setErrorMessage(null);
  };

  const openForm = () => {
    if (onRequestCreate) {
      onRequestCreate();
      return;
    }

    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const openEdit = (extensionId: number) => {
    if (onRequestEdit) {
      onRequestEdit(extensionId);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedMilestoneId) {
      setErrorMessage("Select a milestone before extending its timeline.");
      return;
    }

    if (!newEndDate) {
      setErrorMessage("Choose the revised completion date.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        new_end_date: newEndDate,
        reason: reason.trim(),
      });
      closeForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExtensionButton =
    canManage && selectedMilestone ? (
      <button
        type="button"
        className="admin-btn admin-btn--primary milestone-extension-manager__primary-action"
        onClick={openForm}
      >
        <span className="admin-btn__plus" aria-hidden>
          +
        </span>{" "}
        Add Extension
      </button>
    ) : null;

  return (
    <section className="milestone-extension-manager">
      <SectionHeader
        title="Timeline Extensions"
        action={!isFormOpen ? addExtensionButton : undefined}
      />

      {!embedded ? (
        <div className="milestone-extension-manager__toolbar">
          <label className="milestone-extension-manager__field">
            <span className="milestone-extension-manager__label">Milestone</span>
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

      {isFormOpen && canManage && selectedMilestone ? (
        <form
          className="milestone-extension-manager__form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="milestone-extension-manager__form-grid">
            <label className="milestone-extension-manager__field">
              <span className="milestone-extension-manager__label">New End Date</span>
              <input
                className="form-control"
                type="date"
                value={newEndDate}
                onChange={(event) => setNewEndDate(event.target.value)}
              />
            </label>

            <label className="milestone-extension-manager__field milestone-extension-manager__field--full">
              <span className="milestone-extension-manager__label">Reason</span>
              <textarea
                className="form-control"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for extension"
              />
            </label>
          </div>

          <div className="milestone-extension-manager__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary milestone-extension-manager__primary-action"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Add Extension"}
            </button>
          </div>
        </form>
      ) : null}

      {selectedMilestoneId === null ? (
        <EmptyState
          title="Select a milestone"
          description="Choose a milestone to review timeline extensions."
        />
      ) : extensions.length === 0 && !isFormOpen ? (
        <EmptyState
          title="No timeline extensions recorded."
          description="Request an extension when a milestone needs more time."
        />
      ) : extensions.length > 0 ? (
        <div className="milestone-extension-manager__list">
          {extensions.map((extension) => (
            <article key={extension.extension_id} className="milestone-extension-manager__card">
              <div className="milestone-extension-manager__card-main">
                <div className="milestone-extension-manager__card-header">
                  <h3>New end {formatDate(extension.new_end_date)}</h3>
                </div>
                <div className="milestone-extension-manager__dates">
                  <span>Previous: {formatDate(extension.previous_end_date)}</span>
                </div>
                <div className="milestone-extension-manager__meta-line">
                  <span>Requested {formatDate(extension.created_at)}</span>
                  <span aria-hidden="true">•</span>
                  <span>By {extension.extended_by?.name ?? "System"}</span>
                </div>
                {extension.reason ? (
                  <p className="milestone-extension-manager__reason">{extension.reason}</p>
                ) : null}
              </div>

              {canManage && onRequestEdit ? (
                <div className="milestone-extension-manager__row-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary milestone-extension-manager__edit-action"
                    onClick={() => openEdit(extension.extension_id)}
                  >
                    Edit Extension
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default MilestoneExtensionManager;
