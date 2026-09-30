import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  PROJECT_STATUS_OPTIONS,
  type ProjectDetail,
  type ProjectLookupUser,
  type ProjectPayload,
  type ProjectStatus,
} from "../../types/project";
import { validateProjectFormFields } from "../../utils/formValidation";

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
  site_engineer_ids: number[];
  supervisor_ids: number[];
};

type ProjectLiveOverrides = Partial<{
  projectName: string;
  startDate: string;
  endDate: string;
  initialBudget: string;
}>;

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

const resolveTeamIds = (
  project: ProjectDetail | null | undefined,
  pluralKey: "site_engineers" | "supervisors",
  singularKey: "site_engineer" | "supervisor",
): number[] => {
  const plural = project?.[pluralKey];
  if (Array.isArray(plural) && plural.length > 0) {
    return plural.map((member) => member.user_id);
  }
  const singular = project?.[singularKey];
  return singular?.user_id ? [singular.user_id] : [];
};

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
  site_engineer_ids: resolveTeamIds(project, "site_engineers", "site_engineer"),
  supervisor_ids: resolveTeamIds(project, "supervisors", "supervisor"),
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
  const [pendingSiteEngineerId, setPendingSiteEngineerId] = useState("");
  const [pendingSupervisorId, setPendingSupervisorId] = useState("");
  const { fieldErrors, touchAndValidate, validateSubmit, resetFieldValidation } =
    useLiveFieldValidation();

  const validateWith = (overrides: ProjectLiveOverrides = {}) =>
    validateProjectFormFields({
      projectName: overrides.projectName ?? formState.project_name,
      startDate: overrides.startDate ?? formState.start_date,
      endDate: overrides.endDate ?? formState.end_date,
      initialBudget: overrides.initialBudget ?? formState.initial_budget,
    });

  useEffect(() => {
    setFormState(createDefaultState(initialProject));
    setValidationMessage(null);
    setPendingSiteEngineerId("");
    setPendingSupervisorId("");
    resetFieldValidation();
  }, [initialProject, resetFieldValidation]);

  const selectedProjectManager = useMemo(() => {
    if (!initialProject?.project_manager) {
      return null;
    }

    return `${initialProject.project_manager.name} (${initialProject.project_manager.email})`;
  }, [initialProject]);

  const selectedSiteEngineers = useMemo(() => {
    return formState.site_engineer_ids
      .map((id) => siteEngineers.find((engineer) => engineer.user_id === id))
      .filter((engineer): engineer is ProjectLookupUser => Boolean(engineer));
  }, [formState.site_engineer_ids, siteEngineers]);

  const selectedSupervisors = useMemo(() => {
    return formState.supervisor_ids
      .map((id) => supervisors.find((supervisor) => supervisor.user_id === id))
      .filter((supervisor): supervisor is ProjectLookupUser => Boolean(supervisor));
  }, [formState.supervisor_ids, supervisors]);

  const availableSiteEngineers = useMemo(() => {
    return siteEngineers.filter(
      (engineer) => !formState.site_engineer_ids.includes(engineer.user_id),
    );
  }, [formState.site_engineer_ids, siteEngineers]);

  const availableSupervisors = useMemo(() => {
    return supervisors.filter(
      (supervisor) => !formState.supervisor_ids.includes(supervisor.user_id),
    );
  }, [formState.supervisor_ids, supervisors]);

  const updateField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
    live?: { fields: string | string[]; overrides?: ProjectLiveOverrides },
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    if (live) {
      touchAndValidate(live.fields, () => validateWith(live.overrides ?? {}));
    }
  };

  const addTeamMember = (role: "site_engineer" | "supervisor") => {
    if (role === "site_engineer") {
      const userId = Number(pendingSiteEngineerId);
      if (!userId || formState.site_engineer_ids.includes(userId)) {
        return;
      }
      updateField("site_engineer_ids", [...formState.site_engineer_ids, userId]);
      setPendingSiteEngineerId("");
      return;
    }

    const userId = Number(pendingSupervisorId);
    if (!userId || formState.supervisor_ids.includes(userId)) {
      return;
    }
    updateField("supervisor_ids", [...formState.supervisor_ids, userId]);
    setPendingSupervisorId("");
  };

  const removeTeamMember = (role: "site_engineer" | "supervisor", userId: number) => {
    if (role === "site_engineer") {
      updateField(
        "site_engineer_ids",
        formState.site_engineer_ids.filter((id) => id !== userId),
      );
      return;
    }
    updateField(
      "supervisor_ids",
      formState.supervisor_ids.filter((id) => id !== userId),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationMessage(null);

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const budgetRaw = formState.initial_budget.trim();

    await onSubmit({
      project_name: formState.project_name.trim(),
      description: formState.description.trim(),
      status: formState.status,
      start_date: formState.start_date || null,
      end_date: formState.end_date || null,
      initial_budget: budgetRaw || "0.00",
      project_manager_id:
        canSelectProjectManager && formState.project_manager_id
          ? Number(formState.project_manager_id)
          : undefined,
      client_id: formState.client_id ? Number(formState.client_id) : null,
      site_engineer_ids: formState.site_engineer_ids,
      supervisor_ids: formState.supervisor_ids,
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
        <div className="alert alert-danger mb-0 project-form__alert">
          {validationMessage ?? errorMessage}
        </div>
      )}

      <form className="project-form__shell" onSubmit={(event) => void handleSubmit(event)}>
        <div className="project-form__grid">
        <div className="project-form__field project-form__field--full">
          <label className="project-form__label" htmlFor="project_name">
            Project Name
          </label>
          <input
            id="project_name"
            className={`form-control${fieldErrors.project_name ? " is-invalid" : ""}`}
            value={formState.project_name}
            onChange={(event) => {
              const value = event.target.value;
              updateField("project_name", value, {
                fields: "project_name",
                overrides: { projectName: value },
              });
            }}
            onBlur={() => touchAndValidate("project_name", () => validateWith())}
            placeholder="Enter project name"
          />
          {fieldErrors.project_name ? (
            <span className="project-form__field-error">{fieldErrors.project_name}</span>
          ) : null}
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
            className={`form-control${fieldErrors.initial_budget ? " is-invalid" : ""}`}
            inputMode="decimal"
            value={formState.initial_budget}
            onChange={(event) => {
              const value = event.target.value;
              updateField("initial_budget", value, {
                fields: "initial_budget",
                overrides: { initialBudget: value },
              });
            }}
            onBlur={() => touchAndValidate("initial_budget", () => validateWith())}
            placeholder="0.00"
          />
          {fieldErrors.initial_budget ? (
            <span className="project-form__field-error">{fieldErrors.initial_budget}</span>
          ) : null}
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="start_date">
            Start Date
          </label>
          <input
            id="start_date"
            className={`form-control${fieldErrors.start_date ? " is-invalid" : ""}`}
            type="date"
            value={formState.start_date}
            onChange={(event) => {
              const value = event.target.value;
              updateField("start_date", value, {
                fields: ["start_date", "end_date"],
                overrides: { startDate: value },
              });
            }}
            onBlur={() =>
              touchAndValidate(["start_date", "end_date"], () => validateWith())
            }
          />
          {fieldErrors.start_date ? (
            <span className="project-form__field-error">{fieldErrors.start_date}</span>
          ) : null}
        </div>

        <div className="project-form__field">
          <label className="project-form__label" htmlFor="end_date">
            End Date
          </label>
          <input
            id="end_date"
            className={`form-control${fieldErrors.end_date ? " is-invalid" : ""}`}
            type="date"
            value={formState.end_date}
            onChange={(event) => {
              const value = event.target.value;
              updateField("end_date", value, {
                fields: ["start_date", "end_date"],
                overrides: { endDate: value },
              });
            }}
            onBlur={() =>
              touchAndValidate(["start_date", "end_date"], () => validateWith())
            }
          />
          {fieldErrors.end_date ? (
            <span className="project-form__field-error">{fieldErrors.end_date}</span>
          ) : null}
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

        <div className="project-form__team project-form__field--full">
          <div className="project-form__team-header">
            <h3 className="project-form__team-title">Project Team</h3>
            <p className="project-form__team-hint">
              Assign Site Engineers and Supervisors. Only assigned users will see this project on
              their dashboards.
            </p>
          </div>

          <div className="project-form__team-panels">
            <section className="project-form__team-panel" aria-labelledby="team-site-engineers">
              <div className="project-form__team-panel-head">
                <div>
                  <h4 id="team-site-engineers" className="project-form__team-heading">
                    Site Engineers
                  </h4>
                  <p className="project-form__team-sub">Design tasks and verify progress</p>
                </div>
                <span className="project-form__team-count">
                  {selectedSiteEngineers.length}
                </span>
              </div>

              {selectedSiteEngineers.length === 0 ? (
                <div className="project-form__team-empty">
                  <span className="project-form__team-empty-title">No Site Engineers assigned</span>
                  <span className="project-form__team-empty-text">
                    Choose a Site Engineer below to allocate them to this project.
                  </span>
                </div>
              ) : (
                <ul className="project-form__team-list">
                  {selectedSiteEngineers.map((engineer) => (
                    <li key={engineer.user_id} className="project-form__team-item">
                      <span className="project-form__team-avatar" aria-hidden="true">
                        {(engineer.name?.trim()?.charAt(0) || "S").toUpperCase()}
                      </span>
                      <span className="project-form__team-copy">
                        <span className="project-form__team-name">{engineer.name}</span>
                        <small className="project-form__team-email">{engineer.email}</small>
                      </span>
                      <button
                        type="button"
                        className="project-form__team-remove"
                        onClick={() => removeTeamMember("site_engineer", engineer.user_id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="project-form__team-add">
                <select
                  className="form-select project-form__team-select"
                  value={pendingSiteEngineerId}
                  onChange={(event) => setPendingSiteEngineerId(event.target.value)}
                  aria-label="Select Site Engineer"
                >
                  <option value="">Select Site Engineer</option>
                  {availableSiteEngineers.map((engineer) => (
                    <option key={engineer.user_id} value={engineer.user_id}>
                      {engineer.name} ({engineer.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="project-form__team-assign"
                  disabled={!pendingSiteEngineerId}
                  onClick={() => addTeamMember("site_engineer")}
                >
                  Assign
                </button>
              </div>
            </section>

            <section className="project-form__team-panel" aria-labelledby="team-supervisors">
              <div className="project-form__team-panel-head">
                <div>
                  <h4 id="team-supervisors" className="project-form__team-heading">
                    Supervisors
                  </h4>
                  <p className="project-form__team-sub">Assign workers and verify daily updates</p>
                </div>
                <span className="project-form__team-count">{selectedSupervisors.length}</span>
              </div>

              {selectedSupervisors.length === 0 ? (
                <div className="project-form__team-empty">
                  <span className="project-form__team-empty-title">No Supervisors assigned</span>
                  <span className="project-form__team-empty-text">
                    Choose a Supervisor below to allocate them to this project.
                  </span>
                </div>
              ) : (
                <ul className="project-form__team-list">
                  {selectedSupervisors.map((supervisor) => (
                    <li key={supervisor.user_id} className="project-form__team-item">
                      <span className="project-form__team-avatar" aria-hidden="true">
                        {(supervisor.name?.trim()?.charAt(0) || "S").toUpperCase()}
                      </span>
                      <span className="project-form__team-copy">
                        <span className="project-form__team-name">{supervisor.name}</span>
                        <small className="project-form__team-email">{supervisor.email}</small>
                      </span>
                      <button
                        type="button"
                        className="project-form__team-remove"
                        onClick={() => removeTeamMember("supervisor", supervisor.user_id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="project-form__team-add">
                <select
                  className="form-select project-form__team-select"
                  value={pendingSupervisorId}
                  onChange={(event) => setPendingSupervisorId(event.target.value)}
                  aria-label="Select Supervisor"
                >
                  <option value="">Select Supervisor</option>
                  {availableSupervisors.map((supervisor) => (
                    <option key={supervisor.user_id} value={supervisor.user_id}>
                      {supervisor.name} ({supervisor.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="project-form__team-assign"
                  disabled={!pendingSupervisorId}
                  onClick={() => addTeamMember("supervisor")}
                >
                  Assign
                </button>
              </div>
            </section>
          </div>
        </div>

        </div>

        <div className="project-form__actions">
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
