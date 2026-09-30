import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  createProjectMilestone,
  getProject,
  listProjectMilestones,
} from "../../services/projectApi";
import {
  MILESTONE_STATUS_OPTIONS,
  type MilestoneStatus,
  type ProjectDetail,
} from "../../types/project";
import { validateMilestoneFormFields } from "../../utils/formValidation";
import {
  getProjectsBasePath,
  getProjectWorkspacePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

export const CreateMilestonePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const scope = resolveProjectScopeFromPath(location.pathname);
  const projectsPath = getProjectsBasePath(scope);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("planned");
  const [nextSortOrder, setNextSortOrder] = useState(1);
  const { fieldErrors, touchAndValidate, validateSubmit } = useLiveFieldValidation();

  const validateWith = (
    overrides: Partial<{
      title: string;
      plannedStartDate: string;
      plannedEndDate: string;
    }> = {},
  ) =>
    validateMilestoneFormFields({
      title: overrides.title ?? title,
      plannedStartDate: overrides.plannedStartDate ?? plannedStartDate,
      plannedEndDate: overrides.plannedEndDate ?? plannedEndDate,
    });

  const projectName = project?.project_name ?? "";

  useProjectCreateChrome(
    projectName
      ? `Projects / ${projectName} / Milestones / Add Milestone`
      : "Projects / Milestones / Add Milestone",
  );

  const returnToProject = (extra?: WorkspaceNoticeState) => {
    navigate(getProjectWorkspacePath(scope, parsedProjectId, "milestones"), {
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
        if (isMounted) {
          setProject(nextProject);
          const maxOrder = milestoneData.results.reduce(
            (max, item) => Math.max(max, item.sort_order ?? 0),
            0,
          );
          setNextSortOrder(maxOrder + 1);
        }
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

    setIsSubmitting(true);
    try {
      await createProjectMilestone(parsedProjectId, {
        title: title.trim(),
        description: description.trim(),
        planned_start_date: plannedStartDate || null,
        planned_end_date: plannedEndDate || null,
        status,
        sort_order: nextSortOrder,
      });
      returnToProject({ notice: "Milestone added successfully." });
    } catch {
      setErrorMessage("Unable to save the milestone right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading project...</div>;
  }

  return (
    <section className="project-create-page">
      <nav className="project-create-page__breadcrumb" aria-label="Breadcrumb">
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
          to={getProjectWorkspacePath(scope, parsedProjectId, "milestones")}
          state={{ projectId: parsedProjectId }}
        >
          Milestones
        </Link>
        <span aria-hidden="true">/</span>
        <span className="project-create-page__crumb-current">Add Milestone</span>
      </nav>

      <ProjectCreatePageHeader
        title="Add Milestone"
        contextLine={projectName ? `Create a new milestone for ${projectName}.` : null}
      />

      <div className="project-create-page__layout">
        <ProjectCreateFormCard
          title="Milestone Details"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="project-create-page__grid">
            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Milestone Title</span>
              <input
                className={`form-control${fieldErrors.title ? " is-invalid" : ""}`}
                value={title}
                onChange={(event) => {
                  const value = event.target.value;
                  setTitle(value);
                  touchAndValidate("title", () => validateWith({ title: value }));
                }}
                onBlur={() => touchAndValidate("title", () => validateWith())}
                placeholder="Milestone title"
              />
              {fieldErrors.title ? (
                <span className="invalid-feedback d-block">{fieldErrors.title}</span>
              ) : null}
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">
                Description <span className="project-create-page__optional">(optional)</span>
              </span>
              <textarea
                className="form-control"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes"
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">Start Date</span>
              <input
                className="form-control"
                type="date"
                value={plannedStartDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedStartDate(value);
                  touchAndValidate("planned_end_date", () =>
                    validateWith({ plannedStartDate: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_end_date", () => validateWith())}
              />
            </label>

            <label className="project-create-page__field">
              <span className="project-create-page__label">End Date</span>
              <input
                className={`form-control${fieldErrors.planned_end_date ? " is-invalid" : ""}`}
                type="date"
                value={plannedEndDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannedEndDate(value);
                  touchAndValidate("planned_end_date", () =>
                    validateWith({ plannedEndDate: value }),
                  );
                }}
                onBlur={() => touchAndValidate("planned_end_date", () => validateWith())}
              />
              {fieldErrors.planned_end_date ? (
                <span className="invalid-feedback d-block">{fieldErrors.planned_end_date}</span>
              ) : null}
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">Status</span>
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as MilestoneStatus)}
              >
                {MILESTONE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="project-create-page__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => returnToProject()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Milestone"}
            </button>
          </div>
        </ProjectCreateFormCard>

        <ProjectCreateContextPanel info={{ project }} />
      </div>
    </section>
  );
};

export default CreateMilestonePage;
