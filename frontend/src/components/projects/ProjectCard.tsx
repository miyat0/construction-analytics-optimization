import type { ProjectSummary } from "../../types/project";
import { formatCurrencyINR } from "../../utils/formatCurrency";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

import "./ProjectCard.css";

const ViewIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
    <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const EditIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M9.5 3.5 12.5 6.5M2.75 13.25l2.1-.35 7.4-7.4a1.5 1.5 0 0 0-2.12-2.12l-7.4 7.4-.35 2.1Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M3 4.5h10M6.25 4.5V3.25A.75.75 0 0 1 7 2.5h2a.75.75 0 0 1 .75.75V4.5M12.25 4.5V13a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1V4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const MoreIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <circle cx="8" cy="3.5" fill="currentColor" r="1.25" />
    <circle cx="8" cy="8" fill="currentColor" r="1.25" />
    <circle cx="8" cy="12.5" fill="currentColor" r="1.25" />
  </svg>
);

interface ProjectCardProps {
  project: ProjectSummary;
  isActive?: boolean;
  onView: (project: ProjectSummary) => void;
  onEdit: (project: ProjectSummary) => void;
  onDelete: (project: ProjectSummary) => void;
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const getStatusKey = (project: ProjectSummary): string => {
  if (project.is_archived) {
    return "archived";
  }

  return project.status || "planning";
};

const getStatusLabel = (project: ProjectSummary): string => {
  if (project.is_archived) {
    return "Archived";
  }

  return project.status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const ProjectCard = ({
  project,
  isActive = false,
  onView,
  onEdit,
  onDelete,
}: ProjectCardProps) => {
  const progress = Number(project.progress_percentage || 0);
  const statusKey = getStatusKey(project);

  return (
    <article
      className={`project-card${isActive ? " project-card--active" : ""}`}
    >
      <button
        type="button"
        className="project-card__main"
        onClick={() => onView(project)}
      >
        <h3 className="project-card__title">
          {formatDisplayTitle(project.project_name) || project.project_name}
        </h3>

        <div className="project-card__meta">
          <span>PM: {project.project_manager?.name ?? "Unassigned"}</span>
          <span className="project-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>Client: {project.client?.name ?? "Unassigned"}</span>
          <span className="project-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>
            {formatDate(project.start_date)} – {formatDate(project.end_date)}
          </span>
          <span className="project-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>{project.milestone_count} milestones</span>
          <span className="project-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>Budget: {formatCurrencyINR(project.initial_budget)}</span>
        </div>

        <div className="project-card__progress">
          <div className="project-card__progress-label">
            <span>Progress</span>
            <strong>{progress.toFixed(0)}%</strong>
          </div>
          <div
            className="project-card__progress-bar"
            role="progressbar"
            aria-valuenow={progress || 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>
      </button>

      <div className="project-card__status-wrap">
        <span className={`status-pill project-card__status project-card__status--${statusKey}`}>
          {getStatusLabel(project)}
        </span>
      </div>

      <div className="project-card__actions">
        <button
          type="button"
          className="project-card__action"
          title="View Project"
          aria-label={`View ${project.project_name}`}
          onClick={(event) => {
            event.stopPropagation();
            onView(project);
          }}
        >
          <ViewIcon />
        </button>
        <button
          type="button"
          className="project-card__action"
          title="Edit Project"
          aria-label={`Edit ${project.project_name}`}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(project);
          }}
        >
          <EditIcon />
        </button>
        <div className="project-card__more">
          <button
            type="button"
            className="project-card__action"
            title="More actions"
            aria-label={`More actions for ${project.project_name}`}
            aria-haspopup="menu"
          >
            <MoreIcon />
          </button>
          <div className="project-card__more-menu" role="menu">
            <button
              type="button"
              className="project-card__more-item project-card__more-item--danger"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(project);
              }}
            >
              <DeleteIcon />
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
