import type { FormEvent, ReactNode } from "react";

import type { ProjectDetail, ProjectStatus } from "../../types/project";
import { PROJECT_STATUS_OPTIONS } from "../../types/project";

export type ProjectCreateContextInfo = {
  project: ProjectDetail | null;
  /** Extra read-only line (e.g. active milestone title). */
  focusLabel?: string | null;
  focusValue?: string | null;
};

const statusLabel = (status: ProjectStatus | undefined): string => {
  if (!status) {
    return "—";
  }

  return PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
};

interface ProjectCreateContextPanelProps {
  info: ProjectCreateContextInfo;
  title?: string;
}

export const ProjectCreateContextPanel = ({
  info,
  title = "Project Context",
}: ProjectCreateContextPanelProps) => {
  const project = info.project;

  return (
    <aside className="project-create-page__panel" aria-label={title}>
      <div className="project-create-page__panel-header">
        <span className="project-create-page__panel-icon" aria-hidden="true">
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="M2.5 13.5V4.75A1.25 1.25 0 0 1 3.75 3.5h3.1L8 5h4.25A1.25 1.25 0 0 1 13.5 6.25v7.25"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.4"
            />
            <path
              d="M2.5 13.5h11"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.4"
            />
          </svg>
        </span>
        <h2 className="project-create-page__panel-title">{title}</h2>
      </div>

      <dl className="project-create-page__panel-list">
        <div className="project-create-page__panel-row">
          <dt>Project</dt>
          <dd>{project?.project_name || "—"}</dd>
        </div>
        <div className="project-create-page__panel-row">
          <dt>Project Manager</dt>
          <dd>{project?.project_manager?.name || "Unassigned"}</dd>
        </div>
        <div className="project-create-page__panel-row">
          <dt>Status</dt>
          <dd>
            <span className="project-create-page__panel-status">
              {project?.is_archived ? "Archived" : statusLabel(project?.status)}
            </span>
          </dd>
        </div>
        <div className="project-create-page__panel-row">
          <dt>Milestones</dt>
          <dd>{project ? String(project.milestone_count) : "—"}</dd>
        </div>
        {info.focusLabel && info.focusValue ? (
          <div className="project-create-page__panel-row">
            <dt>{info.focusLabel}</dt>
            <dd>{info.focusValue}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
};

interface ProjectCreateFormCardProps {
  title?: string | null;
  hideHeader?: boolean;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  className?: string;
}

const FormCardIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <rect
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.4"
      width="12"
      x="2"
      y="3.5"
    />
    <path d="M5 2.5v2M11 2.5v2M2 7h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

export const ProjectCreateFormCard = ({
  title,
  hideHeader = false,
  children,
  onSubmit,
  className,
}: ProjectCreateFormCardProps) => {
  const showHeader = !hideHeader && Boolean(title);
  return (
    <form
      className={["project-create-page__form", className].filter(Boolean).join(" ")}
      onSubmit={onSubmit}
    >
      {showHeader ? (
        <div className="project-create-page__form-header">
          <span className="project-create-page__form-header-icon" aria-hidden="true">
            <FormCardIcon />
          </span>
          <h2 className="project-create-page__form-header-title">{title}</h2>
        </div>
      ) : null}
      {children}
    </form>
  );
};

export default ProjectCreateContextPanel;
