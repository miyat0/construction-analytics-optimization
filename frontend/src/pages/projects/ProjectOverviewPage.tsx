import { formatCurrencyINR } from "../../utils/formatCurrency";
import { ProjectTimeline } from "../../components/projects/ProjectTimeline";
import { useProjectDetail } from "../../components/projects/ProjectDetailLayout";

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

const daysBetween = (start: string | null, end: string | null): string => {
  if (!start || !end) {
    return "—";
  }
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.max(0, Math.round(ms / 86400000) + 1);
  return `${days} days`;
};

export const ProjectOverviewPage = () => {
  const { project, milestones, documents } = useProjectDetail();

  if (!project) {
    return null;
  }

  const progress = Number(project.progress_percentage || 0);

  return (
    <div className="project-detail-overview">
      <div className="project-detail-overview__stats">
        <article className="project-detail-overview__stat">
          <span className="project-detail-overview__stat-label">Progress</span>
          <p className="project-detail-overview__stat-value">{progress.toFixed(0)}%</p>
          <div
            className="project-detail-overview__stat-bar"
            role="progressbar"
            aria-valuenow={progress || 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </article>
        <article className="project-detail-overview__stat">
          <span className="project-detail-overview__stat-label">Budget</span>
          <p className="project-detail-overview__stat-value">
            {formatCurrencyINR(project.initial_budget)}
          </p>
        </article>
        <article className="project-detail-overview__stat">
          <span className="project-detail-overview__stat-label">Milestones</span>
          <p className="project-detail-overview__stat-value">{milestones.length}</p>
        </article>
        <article className="project-detail-overview__stat">
          <span className="project-detail-overview__stat-label">Duration</span>
          <p className="project-detail-overview__stat-value">
            {daysBetween(project.start_date, project.end_date)}
          </p>
        </article>
      </div>

      <section className="project-detail-overview__card">
        <h2 className="project-detail-overview__card-title">Project Information</h2>
        <div className="project-detail-overview__grid">
          <div className="project-detail-overview__field project-detail-overview__field--full">
            <span className="project-detail-overview__field-label">Project Team</span>
            <div className="project-detail-overview__team">
              <p className="project-detail-overview__field-value">
                <strong>Project Manager:</strong>{" "}
                {project.project_manager?.name ?? "Unassigned"}
              </p>
              <p className="project-detail-overview__field-value">
                <strong>Site Engineers:</strong>{" "}
                {(project.site_engineers?.length
                  ? project.site_engineers
                  : project.site_engineer
                    ? [project.site_engineer]
                    : []
                )
                  .map((member) => member.name)
                  .join(", ") || "Not assigned"}
              </p>
              <p className="project-detail-overview__field-value">
                <strong>Supervisors:</strong>{" "}
                {(project.supervisors?.length
                  ? project.supervisors
                  : project.supervisor
                    ? [project.supervisor]
                    : []
                )
                  .map((member) => member.name)
                  .join(", ") || "Not assigned"}
              </p>
            </div>
          </div>
          <div className="project-detail-overview__field">
            <span className="project-detail-overview__field-label">Client</span>
            <p className="project-detail-overview__field-value">
              {project.client?.name ?? "Unassigned"}
            </p>
          </div>
          <div className="project-detail-overview__field">
            <span className="project-detail-overview__field-label">Start Date</span>
            <p className="project-detail-overview__field-value">
              {formatDate(project.start_date)}
            </p>
          </div>
          <div className="project-detail-overview__field">
            <span className="project-detail-overview__field-label">End Date</span>
            <p className="project-detail-overview__field-value">{formatDate(project.end_date)}</p>
          </div>
          <div className="project-detail-overview__field">
            <span className="project-detail-overview__field-label">Documents</span>
            <p className="project-detail-overview__field-value">{documents.length}</p>
          </div>
          {project.description ? (
            <div className="project-detail-overview__field project-detail-overview__field--full">
              <span className="project-detail-overview__field-label">Description</span>
              <p className="project-detail-overview__field-value">{project.description}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="project-detail-overview__section">
        <h2 className="project-detail-overview__section-title">Timeline</h2>
        <p className="project-detail-overview__section-subtitle">
          Milestone schedule and current project progress.
        </p>
        <ProjectTimeline milestones={milestones} hideTitle />
      </section>
    </div>
  );
};

export default ProjectOverviewPage;
