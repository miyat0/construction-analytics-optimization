import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  PROJECT_STATUS_OPTIONS,
  type ProjectDetail,
  type ProjectLookupUser,
  type ProjectPayload,
  type ProjectStatus,
} from "../../types/project";

import "./ProjectForm.css";

type ProjectFormState = {
  project_name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  initial_budget: string;
  project_manager_id: string;
  client_id: string;
  site_engineer_id: string;
  supervisor_id: string;
};

interface ProjectFormProps {
  title: string;
  description: string;
  submitLabel: string;
  initialProject?: ProjectDetail | null;
  projectManagers: ProjectLookupUser[];
  clients: ProjectLookupUser[];
  siteEngineers: ProjectLookupUser[];
  supervisors: ProjectLookupUser[];
  canSelectProjectManager: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: ProjectPayload) => Promise<void>;
  onCancel?: () => void;
}

const createDefaultState = (project?: ProjectDetail | null): ProjectFormState => ({
  project_name: project?.project_name ?? "",
  description: project?.description ?? "",
  status: project?.status ?? "planning",
  start_date: project?.start_date ?? "",
  end_date: project?.end_date ?? "",
  initial_budget: project?.initial_budget ?? "0.00",
  project_manager_id: project?.project_manager?.user_id
    ? String(project.project_manager.user_id)
    : "",
  client_id: project?.client?.user_id ? String(project.client.user_id) : "",
  site_engineer_id: project?.site_engineer?.user_id
    ? String(project.site_engineer.user_id)
    : "",
  supervisor_id: project?.supervisor?.user_id ? String(project.supervisor.user_id) : "",
});

export const ProjectForm = ({
  title,
  description,
  submitLabel,
  initialProject = null,
  projectManagers,
  clients,
  siteEngineers,
  supervisors,
  canSelectProjectManager,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
  onCancel,
}: ProjectFormProps) => {
  const [formState, setFormState] = useState<ProjectFormState>(() =>
    createDefaultState(initialProject),
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState(createDefaultState(initialProject));
    setValidationMessage(null);
  }, [initialProject]);

  const selectedProjectManager = useMemo(() => {
    if (!initialProject?.project_manager) {
      return null;
    }

    return `${initialProject.project_manager.name} (${initialProject.project_manager.email})`;
  }, [initialProject]);

  const updateField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationMessage(null);

    if (!formState.project_name.trim()) {
      setValidationMessage("Project name is required.");
      return;
    }

    if (
      formState.start_date &&
      formState.end_date &&
      new Date(formState.end_date).getTime() < new Date(formState.start_date).getTime()
    ) {
      setValidationMessage("End date cannot be earlier than the start date.");
      return;
    }

    await onSubmit({
      project_name: formState.project_name.trim(),
      description: formState.description.trim(),
      status: formState.status,
      start_date: formState.start_date || null,
      end_date: formState.end_date || null,
      initial_budget: formState.initial_budget || "0.00",
      project_manager_id:
        canSelectProjectManager && formState.project_manager_id
          ? Number(formState.project_manager_id)
          : undefined,
      client_id: formState.client_id ? Number(formState.client_id) : null,
      site_engineer_id: formState.site_engineer_id ? Number(formState.site_engineer_id) : null,
      supervisor_id: formState.supervisor_id ? Number(formState.supervisor_id) : null,
    });
  };

  return (
    <div className="project-form">
      <div className="project-form__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>

      {(validationMessage || errorMessage) && (
        <div className="alert alert-danger mb-0">
          {validationMessage ?? errorMessage}
        </div>
      )}

      <form className="project-form__grid" onSubmit={(event) => void handleSubmit(event)}>
        <div className="project-form__field project-form__field--full">
          <label className="project-form__label" htmlFor="project_name">
            Project Name
          </label>
          <input
            id="project_name"
            className="form-control"
            value={formState.project_name}
            onChange={(event) => updateField("project_name", event.target.value)}
            placeholder="Enter project name"
          />
        </div>

        <div className="project-form__field project-form__field--full">
          <label className="project-form__label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="form-control"
            rows={3}
            value={formState.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="form-select"
            value={formState.status}
            onChange={(event) => updateField("status", event.target.value as ProjectStatus)}
          >
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="initial_budget">
            Initial Budget
          </label>
          <input
            id="initial_budget"
            className="form-control"
            inputMode="decimal"
            value={formState.initial_budget}
            onChange={(event) => updateField("initial_budget", event.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="start_date">
            Start Date
          </label>
          <input
            id="start_date"
            className="form-control"
            type="date"
            value={formState.start_date}
            onChange={(event) => updateField("start_date", event.target.value)}
          />
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="end_date">
            End Date
          </label>
          <input
            id="end_date"
            className="form-control"
            type="date"
            value={formState.end_date}
            onChange={(event) => updateField("end_date", event.target.value)}
          />
        </div>

        {canSelectProjectManager ? (
          <div className="project-form__field">
            <label className="project-form__label" htmlFor="project_manager_id">
              Project Manager
            </label>
            <select
              id="project_manager_id"
              className="form-select"
              value={formState.project_manager_id}
              onChange={(event) => updateField("project_manager_id", event.target.value)}
            >
              <option value="">Select a Project Manager</option>
              {projectManagers.map((manager) => (
                <option key={manager.user_id} value={manager.user_id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="project-form__field project-form__field--note">
            <span className="project-form__label">Project Manager</span>
            <div className="project-form__note">
              {selectedProjectManager ?? "You will be assigned as Project Manager."}
            </div>
          </div>
        )}

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="client_id">
            Client
          </label>
          <select
            id="client_id"
            className="form-select"
            value={formState.client_id}
            onChange={(event) => updateField("client_id", event.target.value)}
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.user_id} value={client.user_id}>
                {client.name} ({client.email})
              </option>
            ))}
          </select>
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="site_engineer_id">
            Site Engineer
          </label>
          <select
            id="site_engineer_id"
            className="form-select"
            value={formState.site_engineer_id}
            onChange={(event) => updateField("site_engineer_id", event.target.value)}
          >
            <option value="">No site engineer</option>
            {siteEngineers.map((engineer) => (
              <option key={engineer.user_id} value={engineer.user_id}>
                {engineer.name} ({engineer.email})
              </option>
            ))}
          </select>
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="supervisor_id">
            Supervisor
          </label>
          <select
            id="supervisor_id"
            className="form-select"
            value={formState.supervisor_id}
            onChange={(event) => updateField("supervisor_id", event.target.value)}
          >
            <option value="">No supervisor</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.user_id} value={supervisor.user_id}>
                {supervisor.name} ({supervisor.email})
              </option>
            ))}
          </select>
        </div>

        <div className="project-form__actions project-form__field--full">
          {onCancel ? (
            <button
              type="button"
              className="btn fs-btn fs-btn--secondary project-form__secondary-action"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            className="btn fs-btn fs-btn--primary project-form__primary-action"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
