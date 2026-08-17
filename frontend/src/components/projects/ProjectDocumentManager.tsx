import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import {
  PROJECT_DOCUMENT_TYPE_OPTIONS,
  type Milestone,
  type ProjectDocument,
  type ProjectDocumentType,
} from "../../types/project";

import "./ProjectDocumentManager.css";

type DocumentFormState = {
  milestone_id: string;
  title: string;
  document_type: ProjectDocumentType;
  description: string;
  is_client_visible: boolean;
};

type PanelMode = "list" | "form";

interface ProjectDocumentManagerProps {
  documents: ProjectDocument[];
  milestones: Milestone[];
  canManage: boolean;
  onCreate: (payload: FormData) => Promise<void>;
  onUpdate: (documentId: number, payload: FormData) => Promise<void>;
  onDelete: (documentId: number) => Promise<void>;
  formRequestKey?: number;
  /** When set, Upload Document navigates instead of opening an inline form. */
  onRequestCreate?: () => void;
  /** When true, hide internal Documents header/toolbar. */
  hideChrome?: boolean;
}

const defaultDocumentFormState: DocumentFormState = {
  milestone_id: "",
  title: "",
  document_type: "project_cost",
  description: "",
  is_client_visible: false,
};

const formatDocumentDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const typeLabel = (documentType: ProjectDocumentType): string => {
  return (
    PROJECT_DOCUMENT_TYPE_OPTIONS.find((option) => option.value === documentType)?.label ??
    documentType
  );
};

export const ProjectDocumentManager = ({
  documents,
  milestones,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  formRequestKey = 0,
  onRequestCreate,
  hideChrome = false,
}: ProjectDocumentManagerProps) => {
  const [panelMode, setPanelMode] = useState<PanelMode>("list");
  const [formState, setFormState] = useState<DocumentFormState>(defaultDocumentFormState);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingDocumentId, setProcessingDocumentId] = useState<number | null>(null);

  useEffect(() => {
    if (!canManage || formRequestKey <= 0 || onRequestCreate) {
      return;
    }

    setEditingDocument(null);
    setFormState(defaultDocumentFormState);
    setSelectedFile(null);
    setErrorMessage(null);
    setPanelMode("form");
  }, [canManage, formRequestKey, onRequestCreate]);

  useEffect(() => {
    if (panelMode !== "form") {
      return;
    }

    if (!editingDocument) {
      setFormState(defaultDocumentFormState);
      setSelectedFile(null);
      return;
    }

    setFormState({
      milestone_id: editingDocument.milestone_id ? String(editingDocument.milestone_id) : "",
      title: editingDocument.title,
      document_type: editingDocument.document_type,
      description: editingDocument.description,
      is_client_visible: editingDocument.is_client_visible,
    });
    setSelectedFile(null);
  }, [editingDocument, panelMode]);

  const updateField = <K extends keyof DocumentFormState>(
    field: K,
    value: DocumentFormState[K],
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const returnToList = () => {
    setPanelMode("list");
    setEditingDocument(null);
    setFormState(defaultDocumentFormState);
    setSelectedFile(null);
    setErrorMessage(null);
  };

  const openCreateForm = () => {
    if (onRequestCreate) {
      onRequestCreate();
      return;
    }

    setEditingDocument(null);
    setFormState(defaultDocumentFormState);
    setSelectedFile(null);
    setErrorMessage(null);
    setPanelMode("form");
  };

  const openEditForm = (document: ProjectDocument) => {
    setEditingDocument(document);
    setErrorMessage(null);
    setPanelMode("form");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!formState.title.trim()) {
      setErrorMessage("Document title is required.");
      return;
    }

    if (!editingDocument && !selectedFile) {
      setErrorMessage("Please choose a file to upload.");
      return;
    }

    const payload = new FormData();
    payload.append("milestone_id", formState.milestone_id || "");
    payload.append("title", formState.title.trim());
    payload.append("document_type", formState.document_type);
    payload.append("description", formState.description.trim());
    payload.append("is_client_visible", String(formState.is_client_visible));

    if (selectedFile) {
      payload.append("file", selectedFile);
    }

    setProcessingDocumentId(editingDocument?.document_id ?? -1);

    try {
      if (editingDocument) {
        await onUpdate(editingDocument.document_id, payload);
      } else {
        await onCreate(payload);
      }
      returnToList();
    } finally {
      setProcessingDocumentId(null);
    }
  };

  const handleDelete = async (documentId: number, title: string) => {
    const confirmed = window.confirm(
      `Delete document?\n\nAre you sure you want to delete "${title}"?`,
    );
    if (!confirmed) {
      return;
    }

    setProcessingDocumentId(documentId);
    try {
      await onDelete(documentId);
      if (editingDocument?.document_id === documentId) {
        returnToList();
      }
    } finally {
      setProcessingDocumentId(null);
    }
  };

  if (panelMode === "form" && canManage) {
    return (
      <section className="project-document-manager">
        <div className="project-document-manager__header">
          <div>
            <button type="button" className="project-document-manager__back" onClick={returnToList}>
              ← Back to Documents
            </button>
            <h2>{editingDocument ? "Edit Document" : "Upload Document"}</h2>
          </div>
        </div>

        <form
          className="project-document-manager__form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="project-document-manager__grid">
            <div className="project-document-manager__field">
              <label className="project-document-manager__label" htmlFor="document_milestone">
                Milestone
              </label>
              <select
                id="document_milestone"
                className="form-select"
                value={formState.milestone_id}
                onChange={(event) => updateField("milestone_id", event.target.value)}
              >
                <option value="">Project-level document</option>
                {milestones.map((milestone) => (
                  <option key={milestone.milestone_id} value={milestone.milestone_id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="project-document-manager__field">
              <label className="project-document-manager__label" htmlFor="document_title">
                Title
              </label>
              <input
                id="document_title"
                className="form-control"
                value={formState.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="project-document-manager__field">
              <label className="project-document-manager__label" htmlFor="document_type">
                Type
              </label>
              <select
                id="document_type"
                className="form-select"
                value={formState.document_type}
                onChange={(event) =>
                  updateField("document_type", event.target.value as ProjectDocumentType)
                }
              >
                {PROJECT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="project-document-manager__field project-document-manager__field--full">
              <label className="project-document-manager__label" htmlFor="document_description">
                Description
              </label>
              <textarea
                id="document_description"
                className="form-control"
                rows={2}
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className="project-document-manager__field project-document-manager__field--full">
              <label className="project-document-manager__label" htmlFor="document_file">
                File
              </label>
              <input
                id="document_file"
                className="form-control"
                type="file"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <label className="project-document-manager__checkbox">
            <input
              type="checkbox"
              checked={formState.is_client_visible}
              onChange={(event) => updateField("is_client_visible", event.target.checked)}
            />
            <span>Share this document with the client</span>
          </label>

          <div className="project-document-manager__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary project-document-manager__secondary-action"
              onClick={returnToList}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary project-document-manager__primary-action"
              disabled={processingDocumentId !== null}
            >
              {processingDocumentId !== null
                ? "Saving..."
                : editingDocument
                  ? "Update Document"
                  : "Upload Document"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  const uploadButton = canManage ? (
    <button
      type="button"
      className="admin-btn admin-btn--primary project-document-manager__primary-action"
      onClick={openCreateForm}
    >
      <span className="admin-btn__plus" aria-hidden>
        +
      </span>{" "}
      Upload Document
    </button>
  ) : null;

  return (
    <section className="project-document-manager">
      {hideChrome ? null : onRequestCreate ? (
        <div className="project-document-manager__toolbar">{uploadButton}</div>
      ) : (
        <SectionHeader title="Documents" action={uploadButton} />
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="No documents uploaded yet."
          description="Upload drawings, reports, invoices and other project files."
        />
      ) : (
        <div className="project-document-manager__list">
          {documents.map((document) => (
            <article key={document.document_id} className="project-document-manager__card">
              <div className="project-document-manager__card-body">
                <div className="project-document-manager__card-header">
                  <h3>{document.title}</h3>
                  <span className="status-pill project-document-manager__type">
                    {typeLabel(document.document_type)}
                  </span>
                </div>
                <div className="project-document-manager__meta">
                  <span>{document.milestone_title ?? "Project-level"}</span>
                  <span>
                    {document.is_client_visible ? "Shared with client" : "Internal only"}
                  </span>
                  <span>Uploaded: {formatDocumentDate(document.created_at)}</span>
                  <span>{document.file_name ?? "File unavailable"}</span>
                </div>
              </div>
              <div className="project-document-manager__links">
                {document.file_url ? (
                  <a
                    className="project-document-manager__link-button"
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ) : null}
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="btn project-document-manager__link-button"
                      onClick={() => openEditForm(document)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn project-document-manager__link-button project-document-manager__link-button--danger"
                      onClick={() => void handleDelete(document.document_id, document.title)}
                      disabled={processingDocumentId === document.document_id}
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectDocumentManager;
