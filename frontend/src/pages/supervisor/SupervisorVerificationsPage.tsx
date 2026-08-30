import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  listSupervisorWorkplaceNeeds,
  reviewWorkplaceNeedBySupervisor,
} from "../../services/projectApi";
import type { WorkplaceNeed } from "../../types/project";

import { SupervisorNeedReviewModal } from "./SupervisorNeedReviewModal";

import "./SupervisorPages.css";

const NeedsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path
      d="M8 7h8M8 12h5M7 3.5h10A2.5 2.5 0 0 1 19.5 6v12A2.5 2.5 0 0 1 17 20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

const formatSubmitted = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const priorityClass = (priority: string): string => {
  if (priority === "high" || priority === "urgent") {
    return "supervisor-badge supervisor-badge--priority supervisor-badge--priority-high";
  }
  return "supervisor-badge supervisor-badge--priority";
};

export const SupervisorVerificationsPage = () => {
  useWorkspacePageTitle("Workplace Need Verifications");
  const [needs, setNeeds] = useState<WorkplaceNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedNeed, setSelectedNeed] = useState<WorkplaceNeed | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const viewButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const loadNeeds = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listSupervisorWorkplaceNeeds();
      setNeeds(response.results);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load workplace need verifications."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNeeds();
  }, []);

  const openNeed = (need: WorkplaceNeed) => {
    setModalError(null);
    setSelectedNeed(need);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    const requestId = selectedNeed?.request_id;
    setSelectedNeed(null);
    setModalError(null);
    if (requestId) {
      window.setTimeout(() => {
        viewButtonRefs.current[requestId]?.focus();
      }, 0);
    }
  };

  const handleReview = async (action: "verify" | "reject", remarks: string) => {
    if (!selectedNeed) {
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setSuccessMessage(null);

    try {
      await reviewWorkplaceNeedBySupervisor(selectedNeed.request_id, {
        action,
        remarks: remarks || undefined,
      });
      setSuccessMessage(
        action === "verify"
          ? "Request verified and forwarded to Project Manager."
          : "Request rejected.",
      );
      setSelectedNeed(null);
      await loadNeeds();
    } catch (error) {
      setModalError(
        getErrorMessage(error, "Unable to review the workplace need right now."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="supervisor-page">
      <div className="supervisor-page-content">
        {errorMessage ? (
          <div className="alert alert-danger supervisor-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="alert alert-success supervisor-page__alert" role="alert">
            {successMessage}
          </div>
        ) : null}

        <header className="supervisor-page__intro">
          <div className="supervisor-page__toolbar">
            <p className="supervisor-page__support">
              Review worker requests before forwarding them to the Project Manager.
            </p>
            {!isLoading ? (
              <span className="supervisor-page__pending-count">
                Pending requests: {needs.length}
              </span>
            ) : null}
          </div>
        </header>

        {isLoading ? (
          <div className="supervisor-card supervisor-page__loading">
            Loading verifications...
          </div>
        ) : needs.length === 0 ? (
          <div className="supervisor-empty">
            <span className="supervisor-empty__icon" aria-hidden="true">
              <NeedsIcon />
            </span>
            <strong className="supervisor-empty__title">No requests to verify</strong>
            <p className="supervisor-empty__description">
              New workplace requests will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="supervisor-card supervisor-page__table-wrap">
              <table className="supervisor-page__table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Category</th>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Priority</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {needs.map((need) => (
                    <tr key={need.request_id}>
                      <td>{need.submitted_by?.name ?? "—"}</td>
                      <td>{need.category_label}</td>
                      <td>{need.project_name}</td>
                      <td>{need.milestone_title ?? "—"}</td>
                      <td>
                        <span className={priorityClass(need.priority)}>
                          {need.priority_label}
                        </span>
                      </td>
                      <td>{formatSubmitted(need.submitted_at)}</td>
                      <td>
                        <span className="supervisor-badge supervisor-badge--need-status">
                          {need.status_label}
                        </span>
                      </td>
                      <td>
                        <button
                          ref={(node) => {
                            viewButtonRefs.current[need.request_id] = node;
                          }}
                          type="button"
                          className="supervisor-page__row-action"
                          onClick={() => openNeed(need)}
                        >
                          View Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="supervisor-page__mobile-list">
              {needs.map((need) => (
                <article
                  key={need.request_id}
                  className="supervisor-card supervisor-page__mobile-card"
                >
                  <div className="supervisor-page__mobile-card-top">
                    <div>
                      <strong>{need.category_label}</strong>
                      <span>{need.submitted_by?.name ?? "Worker"}</span>
                    </div>
                    <span className={priorityClass(need.priority)}>
                      {need.priority_label}
                    </span>
                  </div>
                  <span>Project: {need.project_name}</span>
                  <span>Milestone: {need.milestone_title ?? "—"}</span>
                  <span>Submitted: {formatSubmitted(need.submitted_at)}</span>
                  <button
                    type="button"
                    className="supervisor-page__row-action"
                    onClick={() => openNeed(need)}
                  >
                    View Request →
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedNeed ? (
        <SupervisorNeedReviewModal
          need={selectedNeed}
          isSubmitting={isSubmitting}
          errorMessage={modalError}
          onClose={closeModal}
          onVerify={(remarks) => handleReview("verify", remarks)}
          onReject={(remarks) => handleReview("reject", remarks)}
        />
      ) : null}
    </main>
  );
};

export default SupervisorVerificationsPage;
