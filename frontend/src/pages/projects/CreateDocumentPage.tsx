import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { ProjectCreateFormCard } from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { FileDropzone } from "../../components/ui/FileDropzone";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  createProjectDocument,
  getProject,
  listProjectMilestones,
} from "../../services/projectApi";
import {
  PROJECT_DOCUMENT_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type Milestone,
  type ProjectDetail,
  type ProjectDocumentType,
} from "../../types/project";
import { validateDocumentFormFields } from "../../utils/formValidation";
import {
  getProjectsBasePath,
  getProjectWorkspacePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";
import "./CreateDocumentPage.css";

export const CreateDocumentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const scope = resolveProjectScopeFromPath(location.pathname);
  const projectsPath = getProjectsBasePath(scope);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [milestoneId, setMilestoneId] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<ProjectDocumentType>("project_cost");
  const [description, setDescription] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { fieldErrors, touchAndValidate, validateSubmit } = useLiveFieldValidation();

  const validateWith = (
    overrides: Partial<{ title: string; hasFile: boolean }> = {},
  ) =>
    validateDocumentFormFields({
      title: overrides.title ?? title,
      fileRequired: true,
      hasFile: overrides.hasFile ?? Boolean(selectedFile),
    });

  const projectName = project?.project_name ?? "";
  const statusLabel = project
    ? project.is_archived
      ? "Archived"
      : (PROJECT_STATUS_OPTIONS.find((option) => option.value === project.status)?.label ??
        project.status)
    : "";
  const managerName = project?.project_manager?.name ?? "Unassigned";

  const returnToProject = (extra?: WorkspaceNoticeState) => {
    navigate(getProjectWorkspacePath(scope, parsedProjectId, "documents"), {
      replace: true,
      state: {
        projectId: parsedProjectId,
        ...(extra?.notice ? { notice: extra.notice } : {}),
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!Number.isFinite(parsedProjectId)) {
        setErrorMessage("Project not found.");
        setIsLoading(false);
        return;
      }

      try {
        const [nextProject, milestoneData] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load the project right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [parsedProjectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const nextErrors = validateSubmit(() => validateWith());
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
    try {
      await createProjectDocument(parsedProjectId, payload);
      returnToProject({ notice: "Document uploaded successfully." });
    } catch {
      setErrorMessage("Unable to upload the document right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading project...</div>;
  }

  return (
    <section className="upload-document-page">
      <nav className="upload-document-page__breadcrumb" aria-label="Breadcrumb">
        <Link to={projectsPath}>Projects</Link>
        <span aria-hidden="true">/</span>
        {projectName ? (
          <Link
            to={getProjectWorkspacePath(scope, parsedProjectId, "overview")}
            state={{ projectId: parsedProjectId }}
          >
            {projectName}
          </Link>
        ) : (
          <span>Project</span>
        )}
        <span aria-hidden="true">/</span>
        <Link
          to={getProjectWorkspacePath(scope, parsedProjectId, "documents")}
          state={{ projectId: parsedProjectId }}
        >
          Documents
        </Link>
        <span aria-hidden="true">/</span>
        <span className="upload-document-page__crumb-current">Upload Document</span>
      </nav>

      <ProjectCreatePageHeader
        title="Upload Document"
        contextLine={projectName ? `Add a document to ${projectName}.` : null}
      />

      {project ? (
        <p className="upload-document-page__context">
          <strong>{projectName}</strong>
          <span aria-hidden="true">·</span>
          <span>{statusLabel}</span>
          <span aria-hidden="true">·</span>
          <span>Project Manager: {managerName}</span>
        </p>
      ) : null}

      <ProjectCreateFormCard
        hideHeader
        className="upload-document-page__form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

        <div className="upload-document-page__grid">
          <label className="upload-document-page__field upload-document-page__field--full">
            <span className="upload-document-page__label">Document Title</span>
            <input
              className={`form-control${fieldErrors.title ? " is-invalid" : ""}`}
              value={title}
              onChange={(event) => {
                const value = event.target.value;
                setTitle(value);
                touchAndValidate("title", () => validateWith({ title: value }));
              }}
              onBlur={() => touchAndValidate("title", () => validateWith())}
              placeholder="Enter document title"
            />
            {fieldErrors.title ? (
              <span className="upload-document-page__error">{fieldErrors.title}</span>
            ) : null}
          </label>

          <label className="upload-document-page__field">
            <span className="upload-document-page__label">
              Milestone <span className="upload-document-page__optional">(optional)</span>
            </span>
            <div className="upload-document-page__select-wrap">
              <select
                className="form-select upload-document-page__select"
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

          <label className="upload-document-page__field">
            <span className="upload-document-page__label">Document Type</span>
            <div className="upload-document-page__select-wrap">
              <select
                className="form-select upload-document-page__select"
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

          <label className="upload-document-page__field upload-document-page__field--full">
            <span className="upload-document-page__label">
              Description <span className="upload-document-page__optional">(optional)</span>
            </span>
            <textarea
              className="form-control upload-document-page__textarea"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes"
            />
          </label>

          <div className="upload-document-page__field upload-document-page__field--full">
            <span className="upload-document-page__label">File</span>
            <FileDropzone
              file={selectedFile}
              onChange={(file) => {
                setSelectedFile(file);
                touchAndValidate("file", () => validateWith({ hasFile: Boolean(file) }));
              }}
              disabled={isSubmitting}
              compact
              hint="PDF, DOCX, XLSX, JPG, PNG"
            />
            {fieldErrors.file ? (
              <span className="upload-document-page__error">{fieldErrors.file}</span>
            ) : null}
          </div>
        </div>

        <label className="upload-document-page__checkbox">
          <input
            type="checkbox"
            checked={isClientVisible}
            onChange={(event) => setIsClientVisible(event.target.checked)}
          />
          <span>Share with client</span>
        </label>

        <div className="upload-document-page__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => returnToProject()}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={isSubmitting}>
            {isSubmitting ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </ProjectCreateFormCard>
    </section>
  );
};

export default CreateDocumentPage;
