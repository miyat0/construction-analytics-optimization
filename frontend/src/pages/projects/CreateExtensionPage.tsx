import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import {
  createMilestoneExtension,
  getProject,
  listProjectMilestones,
} from "../../services/projectApi";
import type { Milestone, ProjectDetail } from "../../types/project";
import {
  getProjectMilestonePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

export const CreateExtensionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { milestoneId } = useParams();
  const selectedProjectId = useSelectedProjectId();
  const parsedProjectId = selectedProjectId ?? Number.NaN;
  const parsedMilestoneId = Number(milestoneId);
  const scope = resolveProjectScopeFromPath(location.pathname);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [reason, setReason] = useState("");

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const contextLine = [projectName, selectedMilestone?.title].filter(Boolean).join(" · ");
  const breadcrumb = selectedMilestone?.title
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Add Extension`
    : projectName
      ? `Projects / ${projectName} / Add Extension`
      : "Projects / Add Extension";

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
      if (!Number.isFinite(parsedProjectId) || !Number.isFinite(parsedMilestoneId)) {
        setErrorMessage("Project or milestone not found.");
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
  }, [parsedMilestoneId, parsedProjectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!newEndDate) {
      setErrorMessage("Choose the revised completion date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMilestoneExtension(parsedProjectId, parsedMilestoneId, {
        new_end_date: newEndDate,
        reason: reason.trim(),
      });
      returnToProject({ notice: "Milestone timeline extended successfully." });
    } catch {
      setErrorMessage("Unable to extend the milestone timeline right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="project-create-page__loading">Loading milestone...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Milestone"
        onBack={() => returnToProject()}
        title="Add Extension"
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
                className="form-control"
                type="date"
                value={newEndDate}
                onChange={(event) => setNewEndDate(event.target.value)}
              />
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
              {isSubmitting ? "Saving..." : "Add Extension"}
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

export default CreateExtensionPage;
