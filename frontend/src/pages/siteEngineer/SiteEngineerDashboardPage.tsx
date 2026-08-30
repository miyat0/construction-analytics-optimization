import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import { useAuth } from "../../hooks/useAuth";
import {
  listProjectDailyUpdates,
  listProjectMilestones,
  listProjects,
} from "../../services/projectApi";
import type { DailyTaskUpdate, Milestone, ProjectSummary } from "../../types/project";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";
import { formatHeaderDate, getGreeting } from "../worker/workerFormatters";
import { StatusBadge } from "../../components/ui/StatusBadge";

import "./SiteEngineerPages.css";

type MilestoneRow = Milestone & { project_name: string; project_id: number };

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

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

export const SiteEngineerDashboardPage = () => {
  useWorkspacePageTitle("Site Engineer Dashboard");
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<DailyTaskUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const projectData = await listProjects();
        setProjects(projectData.results);

        const milestoneBundles = await Promise.all(
          projectData.results.map(async (project) => {
            const [milestoneData, updateData] = await Promise.all([
              listProjectMilestones(project.project_id),
              listProjectDailyUpdates(project.project_id),
            ]);
            return {
              project,
              milestones: milestoneData.results.map((milestone) => ({
                ...milestone,
                project_name: project.project_name,
                project_id: project.project_id,
              })),
              updates: updateData.results,
            };
          }),
        );

        setMilestones(milestoneBundles.flatMap((bundle) => bundle.milestones));
        setPendingUpdates(
          milestoneBundles
            .flatMap((bundle) => bundle.updates)
            .filter(
              (update) =>
                update.supervisor_review_status === "approved" &&
                update.engineer_review_status === "pending",
            ),
        );
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Unable to load the Site Engineer dashboard right now."),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const behindCount = useMemo(
    () => milestones.filter((item) => item.schedule_status === "behind_schedule").length,
    [milestones],
  );

  const previewMilestones = milestones.slice(0, 8);

  return (
    <main className="site-engineer-page">
      <div className="site-engineer-page-content">
        {errorMessage ? (
          <div className="alert alert-danger site-engineer-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <header className="site-engineer-page__intro">
          <div className="site-engineer-page__intro-row">
            <div>
              <p className="site-engineer-page__greeting">
                {getGreeting()}, {user?.name ?? "Site Engineer"}
              </p>
              <p className="site-engineer-page__support">
                Monitor milestones, design tasks, and verify supervisor-approved progress.
              </p>
            </div>
            <p className="site-engineer-page__date">{formatHeaderDate(new Date())}</p>
          </div>
        </header>

        <section className="site-engineer-stats" aria-label="Workspace summary">
          <article className="site-engineer-stat">
            <span className="site-engineer-stat__label">Projects</span>
            <strong className="site-engineer-stat__value">
              {isLoading ? "—" : projects.length}
            </strong>
          </article>
          <article className="site-engineer-stat">
            <span className="site-engineer-stat__label">Milestones</span>
            <strong className="site-engineer-stat__value">
              {isLoading ? "—" : milestones.length}
            </strong>
          </article>
          <article className="site-engineer-stat">
            <span className="site-engineer-stat__label">Pending Verifications</span>
            <strong className="site-engineer-stat__value">
              {isLoading ? "—" : pendingUpdates.length}
            </strong>
          </article>
          <article className="site-engineer-stat">
            <span className="site-engineer-stat__label">Behind Schedule</span>
            <strong className="site-engineer-stat__value">
              {isLoading ? "—" : behindCount}
            </strong>
          </article>
        </section>

        <section className="site-engineer-quick-links" aria-label="Quick links">
          <Link className="site-engineer-quick-link" to="/site-engineer/projects">
            <strong>Projects &amp; Milestones</strong>
            <span>Review authorized schedules and progress</span>
          </Link>
          <Link className="site-engineer-quick-link" to="/site-engineer/tasks">
            <strong>Task Management</strong>
            <span>Break milestones into expected work</span>
          </Link>
          <Link className="site-engineer-quick-link" to="/site-engineer/verifications">
            <strong>Verification Queue</strong>
            <span>
              {pendingUpdates.length} update{pendingUpdates.length === 1 ? "" : "s"} awaiting review
            </span>
          </Link>
        </section>

        <section className="site-engineer-card">
          <div className="site-engineer-card__header">
            <h2 className="site-engineer-card__title">Milestone Schedule</h2>
            <Link className="site-engineer-card__link" to="/site-engineer/projects">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="site-engineer-empty">Loading milestones...</div>
          ) : previewMilestones.length === 0 ? (
            <div className="site-engineer-empty">No milestones on assigned projects yet.</div>
          ) : (
            <div className="site-engineer-milestone-table-wrap">
              <table className="site-engineer-milestone-table">
                <thead>
                  <tr>
                    <th>Project / Milestone</th>
                    <th>Timeline</th>
                    <th>Planned %</th>
                    <th>Actual %</th>
                    <th>Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMilestones.map((milestone) => {
                    const planned = Number(milestone.expected_progress_percentage || 0);
                    const actual = Number(milestone.progress_percentage || 0);
                    return (
                      <tr key={`${milestone.project_id}-${milestone.milestone_id}`}>
                        <td>
                          {formatDisplayTitle(milestone.title) || milestone.title}
                          <span className="meta">
                            {formatDisplayTitle(milestone.project_name) || milestone.project_name}
                          </span>
                        </td>
                        <td>
                          {formatDate(milestone.planned_start_date)} →{" "}
                          {formatDate(milestone.effective_end_date || milestone.planned_end_date)}
                          <span className="meta">
                            Original: {formatDate(milestone.planned_end_date)}
                          </span>
                        </td>
                        <td>{planned.toFixed(0)}%</td>
                        <td>{actual.toFixed(0)}%</td>
                        <td>
                          <StatusBadge
                            className="status-badge--compact"
                            label={milestone.schedule_status_label || "On Schedule"}
                            tone={
                              milestone.schedule_status === "behind_schedule"
                                ? "delayed"
                                : milestone.schedule_status === "ahead_of_schedule"
                                  ? "active"
                                  : milestone.schedule_status === "completed"
                                    ? "completed"
                                    : "planning"
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default SiteEngineerDashboardPage;
