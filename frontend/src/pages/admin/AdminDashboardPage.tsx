import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchAdminDashboard } from "../../services/adminDashboardApi";
import type {
  AdminDashboardData,
  DashboardActivityItem,
  DashboardProjectRow,
  DashboardUpcomingMilestone,
} from "../../types/adminDashboard";
import { StatCard, StatCardRow, StatIcons } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  formatCompactCurrencyINR,
  formatCurrencyINR,
} from "../../utils/formatCurrency";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";
import { navigateToProjectWorkspace } from "../../utils/projectCreateRoutes";

import "./AdminDashboard.css";

const ACTIVITY_LIMIT = 4;

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatRelativeTime = (value: string): string => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return formatDateTime(value);
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const formatDueIn = (days: number): string => {
  if (days <= 0) {
    return "Due today";
  }
  if (days === 1) {
    return "Due in 1 day";
  }
  return `Due in ${days} days`;
};

const ProjectsIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M2.5 4.25A1.75 1.75 0 0 1 4.25 2.5h1.9c.4 0 .78.16 1.06.44l.6.6c.12.12.28.19.45.19h3.49A1.75 1.75 0 0 1 13.5 5.48v6.27A1.75 1.75 0 0 1 11.75 13.5H4.25A1.75 1.75 0 0 1 2.5 11.75V4.25Z"
      stroke="currentColor"
      strokeWidth="1.4"
    />
  </svg>
);

const MilestoneIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M3 13V3h6.2L8.5 5.5 9.2 8H3"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const ActivityIcon = ({ type }: { type: string }) => {
  if (type.includes("milestone")) {
    return <MilestoneIcon />;
  }
  if (type.includes("user")) {
    return (
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
        <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3.5 13c.7-2 2.2-3 4.5-3s3.8 1 4.5 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      </svg>
    );
  }
  return <ProjectsIcon />;
};

const EmptyStateIcon = () => (
  <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14">
    <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 5.25v3.5M8 11h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
    <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M5.5 8.1 7.2 9.8 10.5 6.4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const getProgressTone = (healthKey: string): string => {
  if (healthKey === "delayed") {
    return "delayed";
  }
  if (healthKey === "attention") {
    return "attention";
  }
  if (healthKey === "planning" || healthKey === "on_hold") {
    return healthKey;
  }
  return "on_track";
};

const statusTone = (
  healthKey: string,
): "planning" | "active" | "delayed" | "on_hold" | "completed" | "neutral" => {
  if (healthKey === "planning") {
    return "planning";
  }
  if (healthKey === "on_track" || healthKey === "active" || healthKey === "completed") {
    return healthKey === "completed" ? "completed" : "active";
  }
  if (healthKey === "delayed") {
    return "delayed";
  }
  if (healthKey === "on_hold") {
    return "on_hold";
  }
  return "neutral";
};

const AllocationBars = ({
  points,
}: {
  points: AdminDashboardData["budget_overview"]["chart"];
}) => {
  const visible = points.filter((point) =>
    ["Planning", "Active", "Completed"].includes(point.label),
  );
  const maxValue = Math.max(...visible.map((point) => point.value), 1);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="admin-dashboard__alloc" role="img" aria-label="Budget allocation by status">
      {visible.map((point) => {
        const width = point.value > 0 ? Math.max((point.value / maxValue) * 100, 0) : 0;
        return (
          <div key={point.label} className="admin-dashboard__alloc-row">
            <div className="admin-dashboard__alloc-head">
              <span>{point.label}</span>
              <strong>{formatCompactCurrencyINR(point.value)}</strong>
            </div>
            <div
              className="admin-dashboard__alloc-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(width)}
              aria-label={`${point.label} allocation`}
            >
              <span style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchAdminDashboard();
      setData(response);
    } catch {
      setErrorMessage("Unable to load dashboard information.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openProject = (projectId: number) => {
    navigateToProjectWorkspace(navigate, "admin", projectId, "overview");
  };

  const onScheduleShare = useMemo(() => {
    if (!data || data.kpis.total_projects === 0) {
      return "No projects yet";
    }
    const percent = Math.round(
      (data.kpis.on_schedule_projects / data.kpis.total_projects) * 100,
    );
    return `${percent}% of portfolio`;
  }, [data]);

  const recentActivity = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.recent_activity.slice(0, ACTIVITY_LIMIT);
  }, [data]);

  const upcomingMilestones = data?.upcoming_milestones ?? [];
  const inactiveUsers = data ? Math.max(0, data.team.total_users - data.team.active_users) : 0;

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__page-header">
        <p className="admin-dashboard__page-subtitle">
          Overview of project performance, financial health and recent activity.
        </p>
      </header>

      {errorMessage ? (
        <div className="admin-dashboard__error" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void loadDashboard()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-dashboard__skeleton-grid" aria-hidden="true">
          <div className="admin-dashboard__skeleton" />
          <div className="admin-dashboard__skeleton" />
          <div className="admin-dashboard__skeleton" />
          <div className="admin-dashboard__skeleton" />
        </div>
      ) : data ? (
        <>
          <StatCardRow className="admin-dashboard__kpi-row" aria-label="Key metrics">
            <StatCard
              icon={StatIcons.check}
              value={data.kpis.active_projects}
              label="Active Projects"
              meta="Currently in progress"
            />
            <StatCard
              icon={StatIcons.clock}
              value={data.kpis.on_schedule_projects}
              label="Projects On Schedule"
              meta={onScheduleShare}
            />
            <StatCard
              icon={StatIcons.milestone}
              value={data.kpis.milestones_due_soon}
              label="Milestones Due"
              meta={`${data.kpis.milestones_in_progress} in progress · next 14 days`}
            />
            <StatCard
              icon={StatIcons.budget}
              value={formatCompactCurrencyINR(data.kpis.portfolio_budget)}
              label="Portfolio Budget"
              meta={`${formatCompactCurrencyINR(data.kpis.active_budget)} in active projects`}
            />
          </StatCardRow>

          <section className="admin-dashboard__main-row">
            <article className="admin-dashboard__card">
              <div className="admin-dashboard__card-header">
                <h2 className="admin-dashboard__card-title">Project Performance</h2>
                <Link className="admin-dashboard__section-link" to="/admin/projects">
                  View all →
                </Link>
              </div>

              {data.project_performance.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <span className="admin-dashboard__empty-icon">
                    <EmptyStateIcon />
                  </span>
                  <span>No active projects yet.</span>
                </div>
              ) : (
                <div className="admin-dashboard__table-wrap">
                  <table className="admin-dashboard__table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Manager</th>
                        <th>Progress</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.project_performance.map((project) => (
                        <ProjectPerformanceRow
                          key={project.project_id}
                          project={project}
                          onView={() => openProject(project.project_id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="admin-dashboard__card" id="financial-overview">
              <div className="admin-dashboard__card-header">
                <h2 className="admin-dashboard__card-title">Financial Overview</h2>
              </div>
              <dl className="admin-dashboard__finance-metrics">
                <div className="admin-dashboard__finance-metric">
                  <dt>Portfolio Budget</dt>
                  <dd>{formatCurrencyINR(data.budget_overview.total_allocated)}</dd>
                </div>
                <div className="admin-dashboard__finance-metric">
                  <dt>Active Project Allocation</dt>
                  <dd>{formatCurrencyINR(data.budget_overview.active_allocated)}</dd>
                </div>
                <div className="admin-dashboard__finance-metric">
                  <dt>Completed Project Spend</dt>
                  <dd>{formatCurrencyINR(data.budget_overview.completed_allocated)}</dd>
                </div>
                <div className="admin-dashboard__finance-metric">
                  <dt>Planning Allocation</dt>
                  <dd>{formatCurrencyINR(data.budget_overview.planning_allocated)}</dd>
                </div>
              </dl>
              <AllocationBars points={data.budget_overview.chart} />
            </article>
          </section>

          <section className="admin-dashboard__attention">
            <h2 className="admin-dashboard__card-title">Needs Attention</h2>
            {data.attention_projects.length === 0 ? (
              <div className="admin-dashboard__attention-banner">
                <span className="admin-dashboard__attention-ok" aria-hidden="true">
                  <CheckCircleIcon />
                </span>
                <span>No projects currently require attention.</span>
              </div>
            ) : (
              <div className="admin-dashboard__attention-list">
                {data.attention_projects.map((project) => (
                  <div key={project.project_id} className="admin-dashboard__attention-item">
                    <div>
                      <p className="admin-dashboard__attention-title">
                        {formatDisplayTitle(project.project_name) || project.project_name}
                      </p>
                      <p className="admin-dashboard__attention-meta">
                        {project.attention_reasons[0] ?? project.health}
                        {" · "}
                        Progress {Math.round(project.progress_percentage)}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-dashboard__link-btn"
                      onClick={() => openProject(project.project_id)}
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="admin-dashboard__bottom-row">
            <article className="admin-dashboard__card admin-dashboard__card--accent">
              <div className="admin-dashboard__card-header">
                <h2 className="admin-dashboard__card-title">Recent Activity</h2>
                {data.recent_activity.length > ACTIVITY_LIMIT ? (
                  <Link className="admin-dashboard__section-link" to="/admin/projects">
                    View all activity →
                  </Link>
                ) : null}
              </div>
              {recentActivity.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <span className="admin-dashboard__empty-icon">
                    <EmptyStateIcon />
                  </span>
                  <span>No recent activity.</span>
                </div>
              ) : (
                <ul className="admin-dashboard__activity-list">
                  {recentActivity.map((item) => (
                    <ActivityRow key={`${item.type}-${item.timestamp}-${item.title}`} item={item} />
                  ))}
                </ul>
              )}
            </article>

            <div className="admin-dashboard__side-stack">
              <article className="admin-dashboard__card admin-dashboard__card--compact">
                <div className="admin-dashboard__card-header">
                  <h2 className="admin-dashboard__card-title">Team Snapshot</h2>
                  <Link className="admin-dashboard__section-link" to="/admin/users">
                    Manage Users →
                  </Link>
                </div>
                <p className="admin-dashboard__team-hero">
                  <strong>{data.team.active_users}</strong>
                  <span>Active Users</span>
                </p>
                <div className="admin-dashboard__team-metrics">
                  <div>
                    <span className="admin-dashboard__team-metric-label">Roles</span>
                    <strong className="admin-dashboard__team-metric-value">
                      {data.team.roles.length}
                    </strong>
                  </div>
                  <div>
                    <span className="admin-dashboard__team-metric-label">Inactive</span>
                    <strong className="admin-dashboard__team-metric-value">{inactiveUsers}</strong>
                  </div>
                </div>
              </article>

              <article className="admin-dashboard__card admin-dashboard__card--compact">
                <div className="admin-dashboard__card-header">
                  <h2 className="admin-dashboard__card-title">Quick Actions</h2>
                </div>
                <div className="admin-dashboard__actions-grid">
                  <Link
                    className="admin-dashboard__action-tile"
                    to="/admin/projects"
                    state={{ openCreate: true }}
                  >
                    + New Project
                  </Link>
                  <Link className="admin-dashboard__action-tile" to="/admin/users">
                    Manage Users
                  </Link>
                  <Link className="admin-dashboard__action-tile" to="/admin/projects">
                    View Reports
                  </Link>
                  <a className="admin-dashboard__action-tile" href="#financial-overview">
                    Financials
                  </a>
                </div>
              </article>

              <article className="admin-dashboard__card admin-dashboard__card--compact admin-dashboard__card--accent">
                <div className="admin-dashboard__card-header">
                  <h2 className="admin-dashboard__card-title">Upcoming Milestones</h2>
                </div>
                {upcomingMilestones.length === 0 ? (
                  <p className="admin-dashboard__side-empty">No upcoming milestones.</p>
                ) : (
                  <ul className="admin-dashboard__milestone-list">
                    {upcomingMilestones.map((milestone) => (
                      <UpcomingMilestoneRow
                        key={milestone.milestone_id}
                        milestone={milestone}
                        onOpen={() => openProject(milestone.project_id)}
                      />
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

const ProjectPerformanceRow = ({
  project,
  onView,
}: {
  project: DashboardProjectRow;
  onView: () => void;
}) => {
  const tone = getProgressTone(project.health_key);
  const progress = Math.max(0, Math.min(100, Math.round(project.progress_percentage)));
  const displayName = formatDisplayTitle(project.project_name) || project.project_name;

  return (
    <tr>
      <td>
        <span className="admin-dashboard__project-name">{displayName}</span>
        <span className="admin-dashboard__project-meta">
          {project.milestone_count} milestone{project.milestone_count === 1 ? "" : "s"}
        </span>
      </td>
      <td className="admin-dashboard__cell-muted">
        {project.project_manager?.name ?? "Unassigned"}
      </td>
      <td>
        <div className="admin-dashboard__progress">
          <span className="admin-dashboard__progress-label">{progress}%</span>
          <div
            className="admin-dashboard__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`${displayName} progress`}
          >
            <div
              className={`admin-dashboard__progress-fill admin-dashboard__progress-fill--${tone}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>
      <td className="admin-dashboard__cell-muted">
        {formatCompactCurrencyINR(project.initial_budget)}
      </td>
      <td>
        <StatusBadge
          className="status-badge--compact"
          label={project.health}
          tone={statusTone(project.health_key)}
        />
      </td>
      <td>
        <button type="button" className="admin-dashboard__link-btn" onClick={onView}>
          View →
        </button>
      </td>
    </tr>
  );
};

const ActivityRow = ({ item }: { item: DashboardActivityItem }) => {
  return (
    <li className="admin-dashboard__activity-item">
      <span className="admin-dashboard__activity-icon" aria-hidden="true">
        <ActivityIcon type={item.type} />
      </span>
      <div className="admin-dashboard__activity-copy">
        <p className="admin-dashboard__activity-title">{item.title}</p>
        <p className="admin-dashboard__activity-sub">
          {item.subtitle} · {formatRelativeTime(item.timestamp)}
        </p>
      </div>
    </li>
  );
};

const UpcomingMilestoneRow = ({
  milestone,
  onOpen,
}: {
  milestone: DashboardUpcomingMilestone;
  onOpen: () => void;
}) => {
  const projectName = formatDisplayTitle(milestone.project_name) || milestone.project_name;
  const title = formatDisplayTitle(milestone.title) || milestone.title;

  return (
    <li className="admin-dashboard__milestone-item">
      <button type="button" className="admin-dashboard__milestone-btn" onClick={onOpen}>
        <span className="admin-dashboard__milestone-title">{title}</span>
        <span className="admin-dashboard__milestone-meta">
          {projectName} · {formatDueIn(milestone.days_until_due)}
        </span>
      </button>
    </li>
  );
};

export default AdminDashboardPage;
