import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  WorkplaceNeed,
  WorkplaceNeedCategory,
  WorkplaceNeedContextProject,
  WorkplaceNeedPriority,
  WorkplaceNeedStatus,
} from "../../types/project";

import "./WorkplaceNeedsPanel.css";

const CATEGORY_OPTIONS: { value: WorkplaceNeedCategory; label: string }[] = [
  { value: "safety", label: "Safety" },
  { value: "tools_equipment", label: "Tools/Equipment" },
  { value: "ppe", label: "PPE" },
  { value: "workplace_facilities", label: "Workplace Facilities" },
  { value: "transportation", label: "Transportation" },
  { value: "accommodation", label: "Accommodation" },
  { value: "working_conditions", label: "Working Conditions" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS: { value: WorkplaceNeedPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const formatDate = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const statusToneClass = (status: WorkplaceNeedStatus): string => {
  switch (status) {
    case "resolved":
      return "workplace-needs-panel__chip--success";
    case "rejected":
      return "workplace-needs-panel__chip--danger";
    case "in_progress":
    case "forwarded_to_pm":
    case "verified":
      return "workplace-needs-panel__chip--accent";
    default:
      return "workplace-needs-panel__chip--muted";
  }
};

const NeedsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none">
    <path
      d="M8 7h8M8 12h5M7 3.5h10A2.5 2.5 0 0 1 19.5 6v12A2.5 2.5 0 0 1 17 20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface WorkplaceNeedsPanelProps {
  mode: "worker" | "supervisor" | "project-manager";
  title?: string;
  description?: string;
  showTitle?: boolean;
  needs: WorkplaceNeed[];
  contextProjects?: WorkplaceNeedContextProject[];
  isLoading?: boolean;
  submitLabel?: string;
  onSubmitNeed?: (payload: FormData) => Promise<void>;
  onPrepareSubmit?: () => Promise<void> | void;
  onSupervisorReview?: (
    requestId: number,
    action: "verify" | "reject",
    remarks: string,
  ) => Promise<void>;
  onPmAction?: (
    requestId: number,
    action: "start" | "resolve" | "comment",
    comments: string,
  ) => Promise<void>;
}

export const WorkplaceNeedsPanel = ({
  mode,
  title,
  description,
  showTitle = true,
  needs,
  contextProjects = [],
  isLoading = false,
  submitLabel = "+ Submit Workplace Need",
  onSubmitNeed,
  onPrepareSubmit,
  onSupervisorReview,
  onPmAction,
}: WorkplaceNeedsPanelProps) => {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<WorkplaceNeedCategory>("safety");
  const [priority, setPriority] = useState<WorkplaceNeedPriority>("medium");
  const [projectId, setProjectId] = useState<number | "">("");
  const [milestoneId, setMilestoneId] = useState<number | "">("");
  const [needDescription, setNeedDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [remarksById, setRemarksById] = useState<Record<number, string>>({});
  const [commentsById, setCommentsById] = useState<Record<number, string>>({});

  const isWorkerMode = mode === "worker" && Boolean(onSubmitNeed);

  const sectionTitle =
    title ??
    (isWorkerMode ? "Workplace Needs" : "Workplace Needs & Requirements");

  const sectionDescription =
    description ??
    (isWorkerMode
      ? "Track requests submitted for supervisor verification."
      : mode === "supervisor"
        ? "Verify and forward to the Project Manager, or reject."
        : "Requests verified by Supervisors.");

  const selectedProject = useMemo(
    () => contextProjects.find((item) => item.project_id === projectId) ?? null,
    [contextProjects, projectId],
  );

  const resetForm = () => {
    setCategory("safety");
    setPriority("medium");
    setNeedDescription("");
    setAttachment(null);
    setMilestoneId("");
    setFormError(null);
    if (contextProjects.length === 1) {
      setProjectId(contextProjects[0].project_id);
    } else {
      setProjectId("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openModal = () => {
    void (async () => {
      if (onPrepareSubmit) {
        try {
          await onPrepareSubmit();
        } catch {
          // Still open the modal with existing context if refresh fails.
        }
      }
      setFormError(null);
      setIsModalOpen(true);
    })();
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    resetForm();
    window.setTimeout(() => {
      openButtonRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!selectedProject) {
      setMilestoneId("");
      return;
    }

    if (
      milestoneId &&
      !selectedProject.milestones.some((item) => item.milestone_id === milestoneId)
    ) {
      setMilestoneId("");
    }
  }, [milestoneId, selectedProject]);

  useEffect(() => {
    if (contextProjects.length === 1 && projectId === "") {
      setProjectId(contextProjects[0].project_id);
    }
  }, [contextProjects, projectId]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, isSubmitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmitNeed) {
      return;
    }

    if (contextProjects.length === 0) {
      setFormError(
        "No assigned projects found. Ask your supervisor to assign you to a task first.",
      );
      return;
    }

    if (!projectId) {
      setFormError("Select a project before submitting.");
      return;
    }

    if (!needDescription.trim()) {
      setFormError("Enter a description of the workplace need.");
      return;
    }

    const formData = new FormData();
    formData.append("project_id", String(projectId));
    if (milestoneId) {
      formData.append("milestone_id", String(milestoneId));
    }
    formData.append("category", category);
    formData.append("priority", priority);
    formData.append("description", needDescription.trim());
    if (attachment) {
      formData.append("attachment", attachment);
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onSubmitNeed(formData);
      setIsModalOpen(false);
      resetForm();
      window.setTimeout(() => {
        openButtonRef.current?.focus();
      }, 0);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to submit the workplace need. Please try again.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runSupervisorAction = async (
    requestId: number,
    action: "verify" | "reject",
  ) => {
    if (!onSupervisorReview) {
      return;
    }

    setProcessingId(requestId);
    try {
      await onSupervisorReview(requestId, action, remarksById[requestId]?.trim() || "");
      setRemarksById((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  };

  const runPmAction = async (
    requestId: number,
    action: "start" | "resolve" | "comment",
  ) => {
    if (!onPmAction) {
      return;
    }

    setProcessingId(requestId);
    try {
      await onPmAction(requestId, action, commentsById[requestId]?.trim() || "");
      if (action !== "comment") {
        setCommentsById((current) => {
          const next = { ...current };
          delete next[requestId];
          return next;
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const submitButton = (
    <button
      ref={openButtonRef}
      type="button"
      className="workplace-needs-panel__header-action"
      onClick={openModal}
    >
      {submitLabel}
    </button>
  );

  return (
    <section className={`workplace-needs-panel workplace-needs-panel--${mode}`}>
      <div className="workplace-needs-panel__header">
        <div className="workplace-needs-panel__header-copy">
          {showTitle ? (
            <div className="workplace-needs-panel__title-row">
              <h2 className="workplace-needs-panel__title">{sectionTitle}</h2>
              {!isWorkerMode ? (
                <span className="workplace-needs-panel__count">{needs.length}</span>
              ) : null}
            </div>
          ) : null}
          <p className="workplace-needs-panel__description">{sectionDescription}</p>
        </div>
        {isWorkerMode ? submitButton : null}
      </div>

      {isLoading ? (
        <div className="workplace-needs-panel__loading">Loading workplace needs...</div>
      ) : needs.length === 0 ? (
        <div className="workplace-needs-panel__empty-state">
          <span className="workplace-needs-panel__empty-icon" aria-hidden="true">
            <NeedsIcon />
          </span>
          <h3 className="workplace-needs-panel__empty-title">
            {isWorkerMode
              ? "No workplace needs yet"
              : mode === "supervisor"
                ? "No requests awaiting verification"
                : "No verified workplace requests."}
          </h3>
          <p className="workplace-needs-panel__empty-text">
            {isWorkerMode
              ? "Submitted workplace requirements will appear here."
              : mode === "supervisor"
                ? "New worker requests will appear here for verification."
                : "Verified requests will appear here."}
          </p>
        </div>
      ) : isWorkerMode ? (
        <div className="workplace-needs-panel__table-wrap">
          <table className="workplace-needs-panel__table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Project</th>
                <th>Milestone</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {needs.map((need) => (
                <tr key={need.request_id}>
                  <td>{need.category_label}</td>
                  <td>{need.project_name}</td>
                  <td>{need.milestone_title ?? "—"}</td>
                  <td>
                    <span
                      className={`workplace-needs-panel__chip workplace-needs-panel__priority--${need.priority}`}
                    >
                      {need.priority_label}
                    </span>
                  </td>
                  <td>
                    <span className={`workplace-needs-panel__chip ${statusToneClass(need.status)}`}>
                      {need.status_label}
                    </span>
                  </td>
                  <td>{formatDate(need.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="workplace-needs-panel__list">
          {needs.map((need) => (
            <article key={need.request_id} className="workplace-needs-panel__card">
              <div className="workplace-needs-panel__card-top">
                <div className="workplace-needs-panel__identity">
                  <div className="workplace-needs-panel__id-row">
                    <strong className="workplace-needs-panel__code">{need.tracking_code}</strong>
                    <span className={`workplace-needs-panel__chip ${statusToneClass(need.status)}`}>
                      {need.status_label}
                    </span>
                  </div>
                  <p className="workplace-needs-panel__context">
                    <span>{need.project_name}</span>
                    {need.milestone_title ? (
                      <>
                        <span className="workplace-needs-panel__dot" aria-hidden="true">
                          ·
                        </span>
                        <span>{need.milestone_title}</span>
                      </>
                    ) : null}
                    <>
                      <span className="workplace-needs-panel__dot" aria-hidden="true">
                        ·
                      </span>
                      <span>{need.submitted_by?.name ?? "Worker"}</span>
                    </>
                  </p>
                </div>

                <div className="workplace-needs-panel__badges">
                  <span className="workplace-needs-panel__chip workplace-needs-panel__chip--muted">
                    {need.category_label}
                  </span>
                  <span
                    className={`workplace-needs-panel__chip workplace-needs-panel__priority--${need.priority}`}
                  >
                    {need.priority_label}
                  </span>
                </div>
              </div>

              <p className="workplace-needs-panel__body">{need.description}</p>

              <div className="workplace-needs-panel__footer-meta">
                <span>Submitted {formatDateTime(need.submitted_at)}</span>
                {need.attachments.length > 0 ? (
                  <div className="workplace-needs-panel__attachments">
                    {need.attachments.map((item) => (
                      <a
                        key={item.attachment_id}
                        href={item.file_url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="workplace-needs-panel__attachment"
                      >
                        {item.original_name || "View attachment"}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              {need.supervisor_remarks ? (
                <div className="workplace-needs-panel__note">
                  <span className="workplace-needs-panel__note-label">Supervisor</span>
                  <p>{need.supervisor_remarks}</p>
                </div>
              ) : null}

              {need.pm_comments ? (
                <div className="workplace-needs-panel__note">
                  <span className="workplace-needs-panel__note-label">Project Manager</span>
                  <p>{need.pm_comments}</p>
                </div>
              ) : null}

              {mode === "supervisor" && onSupervisorReview ? (
                <div className="workplace-needs-panel__actions-block">
                  <input
                    className="admin-control"
                    placeholder="Add remarks (optional)"
                    value={remarksById[need.request_id] ?? ""}
                    onChange={(event) =>
                      setRemarksById((current) => ({
                        ...current,
                        [need.request_id]: event.target.value,
                      }))
                    }
                  />
                  <div className="workplace-needs-panel__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      disabled={processingId === need.request_id}
                      onClick={() => void runSupervisorAction(need.request_id, "reject")}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="workplace-needs-panel__primary-action"
                      disabled={processingId === need.request_id}
                      onClick={() => void runSupervisorAction(need.request_id, "verify")}
                    >
                      Verify & Forward
                    </button>
                  </div>
                </div>
              ) : null}

              {mode === "project-manager" && onPmAction ? (
                <div className="workplace-needs-panel__actions-block">
                  <input
                    className="admin-control"
                    placeholder="Comments or instructions"
                    value={commentsById[need.request_id] ?? ""}
                    onChange={(event) =>
                      setCommentsById((current) => ({
                        ...current,
                        [need.request_id]: event.target.value,
                      }))
                    }
                  />
                  <div className="workplace-needs-panel__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      disabled={processingId === need.request_id}
                      onClick={() => void runPmAction(need.request_id, "comment")}
                    >
                      Save Comment
                    </button>
                    {need.status !== "in_progress" ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        disabled={processingId === need.request_id}
                        onClick={() => void runPmAction(need.request_id, "start")}
                      >
                        In Progress
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="workplace-needs-panel__primary-action"
                      disabled={processingId === need.request_id}
                      onClick={() => void runPmAction(need.request_id, "resolve")}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {isWorkerMode && isModalOpen ? (
        <div className="workplace-need-modal" role="presentation">
          <button
            type="button"
            className="workplace-need-modal__backdrop"
            aria-label="Close dialog"
            disabled={isSubmitting}
            onClick={closeModal}
          />
          <div
            className="workplace-need-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="workplace-need-modal__header">
              <div className="workplace-need-modal__heading">
                <h3 id={titleId} className="workplace-need-modal__title">
                  Submit Workplace Need
                </h3>
                <p className="workplace-need-modal__subtitle">
                  Send a workplace requirement for supervisor verification.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="workplace-need-modal__close"
                aria-label="Close"
                disabled={isSubmitting}
                onClick={closeModal}
              >
                ×
              </button>
            </header>

            <form
              className="workplace-need-modal__form"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="workplace-need-modal__body">
                {contextProjects.length === 0 ? (
                  <p className="workplace-need-modal__banner" role="status">
                    No projects available yet. You need an active task assignment
                    before you can submit a workplace need.
                  </p>
                ) : null}
                {formError ? (
                  <p className="workplace-need-modal__error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <div className="workplace-need-modal__grid">
                  <label className="workplace-need-modal__field">
                    <span className="workplace-need-modal__label">Category</span>
                    <select
                      className="workplace-need-modal__control"
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as WorkplaceNeedCategory)
                      }
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="workplace-need-modal__field">
                    <span className="workplace-need-modal__label">Priority</span>
                    <select
                      className="workplace-need-modal__control"
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value as WorkplaceNeedPriority)
                      }
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="workplace-need-modal__field">
                    <span className="workplace-need-modal__label">Project</span>
                    <select
                      className="workplace-need-modal__control"
                      value={projectId}
                      onChange={(event) => {
                        setFormError(null);
                        setProjectId(event.target.value ? Number(event.target.value) : "");
                      }}
                      required
                    >
                      <option value="">Select project</option>
                      {contextProjects.map((project) => (
                        <option key={project.project_id} value={project.project_id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="workplace-need-modal__field">
                    <span className="workplace-need-modal__label">Milestone</span>
                    <select
                      className="workplace-need-modal__control"
                      value={milestoneId}
                      onChange={(event) =>
                        setMilestoneId(event.target.value ? Number(event.target.value) : "")
                      }
                      disabled={!selectedProject}
                    >
                      <option value="">
                        {!selectedProject
                          ? "Select a project first"
                          : (selectedProject.milestones?.length ?? 0) === 0
                            ? "No milestones available"
                            : "Optional"}
                      </option>
                      {(selectedProject?.milestones ?? []).map((milestone) => (
                        <option key={milestone.milestone_id} value={milestone.milestone_id}>
                          {milestone.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="workplace-need-modal__field workplace-need-modal__field--full">
                    <span className="workplace-need-modal__label">Description</span>
                    <textarea
                      className="workplace-need-modal__control workplace-need-modal__textarea"
                      value={needDescription}
                      onChange={(event) => {
                        setFormError(null);
                        setNeedDescription(event.target.value);
                      }}
                      placeholder="Describe the need or issue clearly..."
                      required
                    />
                  </label>

                  <div className="workplace-need-modal__field workplace-need-modal__field--full">
                    <span className="workplace-need-modal__label">Attachment</span>
                    <div className="workplace-need-modal__upload">
                      <button
                        type="button"
                        className="workplace-need-modal__upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload file
                      </button>
                      <span className="workplace-need-modal__upload-name">
                        {attachment?.name ?? "No file selected"}
                      </span>
                      <input
                        ref={fileInputRef}
                        className="workplace-need-modal__file-input"
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={(event) =>
                          setAttachment(event.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                    <span className="workplace-need-modal__hint">
                      JPG, PNG or PDF • Optional
                    </span>
                  </div>
                </div>
              </div>

              <footer className="workplace-need-modal__footer">
                <button
                  type="button"
                  className="workplace-need-modal__cancel"
                  disabled={isSubmitting}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="workplace-need-modal__submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default WorkplaceNeedsPanel;
