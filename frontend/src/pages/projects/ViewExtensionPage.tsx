import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import {
  ProjectCreateContextPanel,
  ProjectCreateFormCard,
} from "../../components/projects/ProjectCreateContextPanel";
import { ProjectCreatePageHeader } from "../../components/projects/ProjectCreatePageHeader";
import { useProjectCreateChrome } from "../../contexts/AdminChromeContext";
import {
  getMilestoneExtension,
  getProject,
  listProjectMilestones,
} from "../../services/projectApi";
import type { Milestone, MilestoneExtension, ProjectDetail } from "../../types/project";
import {
  getEditExtensionPath,
  getProjectMilestonePath,
  resolveProjectScopeFromPath,
  type WorkspaceNoticeState,
} from "../../utils/projectCreateRoutes";
import { useSelectedProjectId } from "../../utils/useSelectedProjectId";

import "./ProjectCreatePage.css";

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const ViewExtensionPage = () => {
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
  const [extension, setExtension] = useState<MilestoneExtension | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectName = project?.project_name ?? "";
  const selectedMilestone = useMemo(
    () => milestones.find((item) => item.milestone_id === parsedMilestoneId) ?? null,
    [milestones, parsedMilestoneId],
  );

  const contextLine = [projectName, selectedMilestone?.title].filter(Boolean).join(" · ");
  const breadcrumb = selectedMilestone?.title
    ? `Projects / ${projectName || "…"} / Milestones / ${selectedMilestone.title} / Extension`
    : projectName
      ? `Projects / ${projectName} / Extension`
      : "Projects / Extension";

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
        const [nextProject, milestoneData, nextExtension] = await Promise.all([
          getProject(parsedProjectId),
          listProjectMilestones(parsedProjectId),
          getMilestoneExtension(parsedProjectId, parsedMilestoneId, parsedExtensionId),
        ]);
        if (!isMounted) {
          return;
        }
        setProject(nextProject);
        setMilestones(milestoneData.results);
        setExtension(nextExtension);
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
  }, [parsedExtensionId, parsedMilestoneId, parsedProjectId]);

  if (isLoading) {
    return <div className="project-create-page__loading">Loading extension...</div>;
  }

  return (
    <section className="project-create-page">
      <ProjectCreatePageHeader
        backLabel="← Back to Milestone"
        onBack={() => returnToProject()}
        title="Extension Details"
        contextLine={contextLine || null}
      />

      <div className="project-create-page__layout">
        <ProjectCreateFormCard
          title="Extension Details"
          onSubmit={(event) => event.preventDefault()}
        >
          {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

          {extension ? (
            <div className="project-create-page__grid">
              <div className="project-create-page__field">
                <span className="project-create-page__label">Previous End</span>
                <p className="project-create-page__readonly">
                  {formatDate(extension.previous_end_date)}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">New End Date</span>
                <p className="project-create-page__readonly">
                  {formatDate(extension.new_end_date)}
                </p>
              </div>
              <div className="project-create-page__field project-create-page__field--full">
                <span className="project-create-page__label">Reason</span>
                <p className="project-create-page__readonly">
                  {extension.reason?.trim() || "No reason provided"}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">Requested</span>
                <p className="project-create-page__readonly">
                  {formatDate(extension.created_at)}
                </p>
              </div>
              <div className="project-create-page__field">
                <span className="project-create-page__label">By</span>
                <p className="project-create-page__readonly">
                  {extension.extended_by?.name ?? "System"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="project-create-page__actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => returnToProject()}
            >
              Back
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() =>
                navigate(
                  getEditExtensionPath(
                    scope,
                    parsedProjectId,
                    parsedMilestoneId,
                    parsedExtensionId,
                  ),
                  { state: { projectId: parsedProjectId } },
                )
              }
            >
              Edit Extension
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

export default ViewExtensionPage;
