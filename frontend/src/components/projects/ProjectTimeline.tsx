import type { Milestone } from "../../types/project";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

import "./ProjectTimeline.css";

interface ProjectTimelineProps {
  milestones: Milestone[];
  hideTitle?: boolean;
}

const formatTimelineDate = (value: string | null): string => {
  if (!value) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const statusLabel = (status: string): string =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const sameDate = (a: string | null, b: string | null): boolean => {
  if (!a || !b) {
    return a === b;
  }
  return new Date(a).toDateString() === new Date(b).toDateString();
};

export const ProjectTimeline = ({ milestones, hideTitle = false }: ProjectTimelineProps) => {
  return (
    <section className="project-timeline">
      {!hideTitle ? (
        <div className="project-timeline__header">
          <h2>Timeline</h2>
        </div>
      ) : null}

      {milestones.length === 0 ? (
        <div className="project-timeline__empty">No milestones yet.</div>
      ) : (
        <div className="project-timeline__table">
          <div className="project-timeline__col-head" aria-hidden="true">
            <span>Milestone</span>
            <span>Schedule</span>
            <span>Status</span>
            <span>Progress</span>
          </div>

          <div className="project-timeline__list">
            {milestones.map((milestone) => {
              const progress = Number(milestone.progress_percentage || 0);
              const plannedEnd = milestone.planned_end_date;
              const currentEnd = milestone.effective_end_date;
              const hasExtension =
                Boolean(plannedEnd && currentEnd) && !sameDate(plannedEnd, currentEnd);
              const notes = milestone.description?.trim() ?? "";

              return (
                <article key={milestone.milestone_id} className="project-timeline__row">
                  <div className="project-timeline__milestone">
                    <h3 className="project-timeline__name">
                      {formatDisplayTitle(milestone.title) || milestone.title}
                    </h3>
                    {notes ? <p className="project-timeline__notes">{notes}</p> : null}
                  </div>

                  <div className="project-timeline__schedule">
                    {hasExtension ? (
                      <>
                        <p className="project-timeline__schedule-line">
                          <span className="project-timeline__schedule-label">Planned</span>
                          {formatTimelineDate(plannedEnd)}
                        </p>
                        <p className="project-timeline__schedule-line">
                          <span className="project-timeline__schedule-label">Current</span>
                          {formatTimelineDate(currentEnd)}
                        </p>
                        {milestone.planned_start_date ? (
                          <p className="project-timeline__schedule-start">
                            Starts {formatTimelineDate(milestone.planned_start_date)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="project-timeline__schedule-range">
                        {formatTimelineDate(milestone.planned_start_date)}
                        <span aria-hidden="true"> → </span>
                        {formatTimelineDate(currentEnd || plannedEnd)}
                      </p>
                    )}
                  </div>

                  <div className="project-timeline__status">
                    <StatusBadge
                      className="status-badge--compact"
                      label={statusLabel(milestone.status)}
                      tone={milestone.status}
                    />
                  </div>

                  <div className="project-timeline__progress">
                    <span className="project-timeline__progress-value">{progress.toFixed(0)}%</span>
                    <div
                      className="project-timeline__progress-bar"
                      role="progressbar"
                      aria-valuenow={progress || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectTimeline;
