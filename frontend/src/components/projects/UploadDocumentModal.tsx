import { useEffect, useState, type FormEvent } from "react";

import { DetailModal } from "../ui/DetailModal";
import { FileDropzone } from "../ui/FileDropzone";
import {
  PROJECT_DOCUMENT_TYPE_OPTIONS,
  type Milestone,
  type ProjectDocumentType,
} from "../../types/project";

import "./ProjectEntityModal.css";

type UploadDocumentModalProps = {
  isOpen: boolean;
  projectName?: string | null;
  milestones: Milestone[];
  onClose: () => void;
  onSubmit: (payload: FormData) => Promise<void>;
};

export const UploadDocumentModal = ({
  isOpen,
  projectName,
  milestones,
  onClose,
  onSubmit,
}: UploadDocumentModalProps) => {
  const [title, setTitle] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [documentType, setDocumentType] = useState<ProjectDocumentType>("project_cost");
  const [description, setDescription] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle("");
    setMilestoneId("");
    setDocumentType("project_cost");
    setDescription("");
    setIsClientVisible(false);
    setSelectedFile(null);
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "Document title is required.";
    }
    if (!selectedFile) {
      nextErrors.file = "Please select a file.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = new FormData();
    payload.append("milestone_id", milestoneId || "");
    payload.append("title", title.trim());
    payload.append("document_type", documentType);
    payload.append("description", description.trim());
    payload.append("is_client_visible", String(isClientVisible));
    payload.append("file", selectedFile as File);

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(payload);
      onClose();
    } catch {
      setErrorMessage("Unable to upload the document right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailModal
      className="project-entity-modal project-entity-modal--form project-entity-modal--upload"
      isOpen={isOpen}
      title="Upload Document"
      description={projectName ? `Add a document to ${projectName}.` : null}
      onClose={onClose}
      size="sm"
    >
      <form className="project-entity-modal__form" onSubmit={(event) => void handleSubmit(event)}>
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        <label className="project-entity-modal__field">
          <span className="project-entity-modal__label">Document Title</span>
          <input
            className="form-control"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter document title"
          />
          {fieldErrors.title ? (
            <span className="project-entity-modal__error">{fieldErrors.title}</span>
          ) : null}
        </label>

        <div className="project-entity-modal__row">
          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">
              Milestone <span className="project-entity-modal__optional">(optional)</span>
            </span>
            <div className="project-entity-modal__select-wrap">
              <select
                className="form-select project-entity-modal__select"
                value={milestoneId}
                onChange={(event) => setMilestoneId(event.target.value)}
              >
                <option value="">Project-level document</option>
                {milestones.map((milestone) => (
                  <option key={milestone.milestone_id} value={milestone.milestone_id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="project-entity-modal__field">
            <span className="project-entity-modal__label">Document Type</span>
            <div className="project-entity-modal__select-wrap">
              <select
                className="form-select project-entity-modal__select"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as ProjectDocumentType)
                }
              >
                {PROJECT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

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

        <div className="project-entity-modal__field">
          <span className="project-entity-modal__label">File</span>
          <FileDropzone
            file={selectedFile}
            onChange={(file) => {
              setSelectedFile(file);
              if (file) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.file;
                  return next;
                });
              }
            }}
            disabled={isSubmitting}
            compact
            hint="PDF, DOCX, XLSX, JPG, PNG"
          />
          {fieldErrors.file ? (
            <span className="project-entity-modal__error">{fieldErrors.file}</span>
          ) : null}
        </div>

        <label className="project-entity-modal__checkbox">
          <input
            type="checkbox"
            checked={isClientVisible}
            onChange={(event) => setIsClientVisible(event.target.checked)}
          />
          <span>Share with client</span>
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
            {isSubmitting ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </form>
    </DetailModal>
  );
};

export default UploadDocumentModal;
