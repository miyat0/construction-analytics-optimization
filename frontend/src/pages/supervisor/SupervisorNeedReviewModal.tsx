import { useEffect, useId, useRef, useState } from "react";

import type { WorkplaceNeed } from "../../types/project";

interface SupervisorNeedReviewModalProps {
  need: WorkplaceNeed;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onVerify: (remarks: string) => Promise<void>;
  onReject: (remarks: string) => Promise<void>;
}

const formatSubmittedAt = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const SupervisorNeedReviewModal = ({
  need,
  isSubmitting,
  errorMessage,
  onClose,
  onVerify,
  onReject,
}: SupervisorNeedReviewModalProps) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [remarks, setRemarks] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const attachment = need.attachments[0] ?? null;

  return (
    <div className="supervisor-need-modal-backdrop" role="presentation">
      <div
        className="supervisor-need-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="supervisor-need-modal__header">
          <div>
            <h2 id={titleId}>Workplace Need Details</h2>
            <p>Review this request before taking action.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="supervisor-need-modal__close"
            aria-label="Close request details"
            disabled={isSubmitting}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="supervisor-need-modal__body">
          <div className="supervisor-need-modal__grid">
            <div className="supervisor-need-modal__field">
              <span>Worker</span>
              <strong>{need.submitted_by?.name ?? "—"}</strong>
            </div>
            <div className="supervisor-need-modal__field">
              <span>Priority</span>
              <strong>{need.priority_label}</strong>
            </div>
            <div className="supervisor-need-modal__field">
              <span>Category</span>
              <strong>{need.category_label}</strong>
            </div>
            <div className="supervisor-need-modal__field">
              <span>Submitted</span>
              <strong>{formatSubmittedAt(need.submitted_at)}</strong>
            </div>
            <div className="supervisor-need-modal__field">
              <span>Project</span>
              <strong>{need.project_name}</strong>
            </div>
            <div className="supervisor-need-modal__field">
              <span>Milestone</span>
              <strong>{need.milestone_title ?? "—"}</strong>
            </div>
          </div>

          <div className="supervisor-need-modal__block">
            <span>Description</span>
            <p className="supervisor-need-modal__description">{need.description}</p>
          </div>

          <div className="supervisor-need-modal__block">
            <span>Attachment</span>
            {attachment ? (
              <div className="supervisor-need-modal__attachment">
                <span>{attachment.original_name || "Attachment"}</span>
                {attachment.file_url ? (
                  <a href={attachment.file_url} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
            ) : (
              <strong className="supervisor-need-modal__muted">No attachment</strong>
            )}
          </div>

          <div className="supervisor-need-modal__remarks">
            <label htmlFor={`supervisor-need-remarks-${need.request_id}`}>
              Remarks (optional)
            </label>
            <textarea
              id={`supervisor-need-remarks-${need.request_id}`}
              value={remarks}
              disabled={isSubmitting}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Add a note for the Project Manager or worker"
            />
          </div>

          {errorMessage ? (
            <p className="supervisor-need-modal__error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="supervisor-need-modal__footer">
          {confirmReject ? (
            <>
              <button
                type="button"
                className="supervisor-need-modal__btn supervisor-need-modal__btn--secondary"
                disabled={isSubmitting}
                onClick={() => setConfirmReject(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="supervisor-need-modal__btn supervisor-need-modal__btn--danger"
                disabled={isSubmitting}
                onClick={() => void onReject(remarks.trim())}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="supervisor-need-modal__btn supervisor-need-modal__btn--danger"
                disabled={isSubmitting}
                onClick={() => setConfirmReject(true)}
              >
                Reject
              </button>
              <button
                type="button"
                className="supervisor-need-modal__btn supervisor-need-modal__btn--primary"
                disabled={isSubmitting}
                onClick={() => void onVerify(remarks.trim())}
              >
                {isSubmitting ? "Verifying..." : "Verify & Forward"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorNeedReviewModal;
