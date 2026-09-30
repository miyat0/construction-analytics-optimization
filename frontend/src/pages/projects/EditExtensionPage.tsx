import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import {
  getMilestoneExtension,
  getProject,
  listProjectMilestones,
  updateMilestoneExtension,
} from "../../services/projectApi";
import type { Milestone, ProjectDetail } from "../../types/project";
import { validateExtensionFormFields } from "../../utils/formValidation";
import {
  getProjectMilestonePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

export const EditExtensionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { milestoneId, extensionId } = useParams();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const parsedMilestoneId = Number(milestoneId);
  const parsedExtensionId = Number(extensionId);
  const scope = resolveProjectScopeFromPath(location.pathname);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [previousEndDate, setPreviousEndDate] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { fieldErrors, touchAndValidate, validateSubmit, resetFieldValidation } =
    useLiveFieldValidation();

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const validateWith = (overrides: Partial<{ newEndDate: string }> = {}) =>
    validateExtensionFormFields({
      newEndDate: overrides.newEndDate ?? newEndDate,
      minEndDate: previousEndDate,
      minEndDateMessage: "New end date must be after the previous milestone deadline.",
    });

  const contextLine = [projectName, selectedMilestone?.title].filter(Boolean).join(" · ");
  const breadcrumb = selectedMilestone?.title
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Edit Extension`
    : projectName
      ? `Projects / ${projectName} / Edit Extension`
      : "Projects / Edit Extension";

  useProjectCreateChrome(breadcrumb);

  const returnToProject = (extra?: WorkspaceNoticeState) => {
    navigate(getProjectMilestonePath(scope, parsedProjectId, parsedMilestoneId), {
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
      if (
        !Number.isFinite(parsedProjectId) ||
        !Number.isFinite(parsedMilestoneId) ||
        !Number.isFinite(parsedExtensionId)
      ) {
        setErrorMessage("Project, milestone, or extension not found.");
        setIsLoading(false);
        return;
      }

      try {
        const [nextProject, milestoneData, extension] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
          getMilestoneExtension(parsedProjectId, parsedMilestoneId, parsedExtensionId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
        setNewEndDate(extension.new_end_date);
        setPreviousEndDate(extension.previous_end_date);
        setReason(extension.reason ?? "");
        resetFieldValidation();
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load the extension right now.");
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
  }, [parsedExtensionId, parsedMilestoneId, parsedProjectId, resetFieldValidation]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMilestoneExtension(
        parsedProjectId,
        parsedMilestoneId,
        parsedExtensionId,
        {
          new_end_date: newEndDate,
          reason: reason.trim(),
        },
      );
      returnToProject({ notice: "Timeline extension updated successfully." });
    } catch {
      setErrorMessage("Unable to update the extension right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading extension...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Milestone"
        onBack={() => returnToProject()}
        title="Edit Extension"
        contextLine={contextLine || null}
      />

      <div className="project-create-page__layout">
        <ProjectCreateFormCard
          title="Extension Details"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          <div className="project-create-page__grid">
            <label className="project-create-page__field">
              <span className="project-create-page__label">New End Date</span>
              <input
                className={`form-control${fieldErrors.new_end_date ? " is-invalid" : ""}`}
                type="date"
                value={newEndDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setNewEndDate(value);
                  touchAndValidate("new_end_date", () => validateWith({ newEndDate: value }));
                }}
                onBlur={() => touchAndValidate("new_end_date", () => validateWith())}
              />
              {fieldErrors.new_end_date ? (
                <span className="invalid-feedback d-block">{fieldErrors.new_end_date}</span>
              ) : null}
            </label>

            <label className="project-create-page__field project-create-page__field--full">
              <span className="project-create-page__label">
                Reason <span className="project-create-page__optional">(optional)</span>
              </span>
              <textarea
                className="form-control"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for extension"
              />
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </ProjectCreateFormCard>

        <ProjectCreateContextPanel
          info={{
            project,
            focusLabel: selectedMilestone ? "Milestone" : null,
            focusValue: selectedMilestone?.title ?? null,
          }}
        />
      </div>
    </section>
  );
};

export default EditExtensionPage;
