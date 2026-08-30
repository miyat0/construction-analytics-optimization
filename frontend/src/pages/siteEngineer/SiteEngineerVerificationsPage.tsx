import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { DailyUpdateBoard } from "../../components/projects/DailyUpdateBoard";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  listProjectDailyUpdates,
  listProjects,
  reviewTaskUpdateByEngineer,
} from "../../services/projectApi";
import type {
  DailyTaskReviewPayload,
  DailyTaskUpdate,
  ProjectSummary,
} from "../../types/project";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

import "./SiteEngineerPages.css";

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }
  return fallbackMessage;
};

export const SiteEngineerVerificationsPage = () => {
  useWorkspacePageTitle("Verification Queue");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">("all");
  const [updates, setUpdates] = useState<DailyTaskUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUpdates = async (projectFilter: number | "all" = selectedProjectId) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const projectData = await listProjects();
      setProjects(projectData.results);

      const targetProjects =
        projectFilter === "all"
          ? projectData.results
          : projectData.results.filter((project) => project.project_id === projectFilter);

      const updateBundles = await Promise.all(
        targetProjects.map((project) => listProjectDailyUpdates(project.project_id)),
      );
      setUpdates(updateBundles.flatMap((bundle) => bundle.results));
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load supervisor-verified updates right now."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUpdates("all");
  }, []);

  const pendingCount = useMemo(
    () =>
      updates.filter(
        (update) =>
          update.supervisor_review_status === "approved" &&
          update.engineer_review_status === "pending",
      ).length,
    [updates],
  );

  const handleReview = async (updateId: number, payload: DailyTaskReviewPayload) => {
    try {
      await reviewTaskUpdateByEngineer(updateId, payload);
      setNoticeMessage(
        payload.review_status === "approved"
          ? "Update verified. Official progress recalculated."
          : "Update rejected and returned for correction.",
      );
      setErrorMessage(null);
      await loadUpdates(selectedProjectId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to review the daily update right now."));
      throw error;
    }
  };

  return (
    <main className="site-engineer-page">
      <div className="site-engineer-page-content">
        <header>
          <h1 className="site-engineer-page__title">Verification Queue</h1>
          <p className="site-engineer-page__subtitle">
            Review supervisor-verified daily updates. Only your approval makes progress official.
          </p>
        </header>

        {noticeMessage ? (
          <div className="alert alert-success site-engineer-page__alert">{noticeMessage}</div>
        ) : null}
        {errorMessage ? (
          <div className="alert alert-danger site-engineer-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="site-engineer-toolbar">
          <label>
            <span>Project filter</span>
            <select
              value={selectedProjectId === "all" ? "all" : String(selectedProjectId)}
              onChange={(event) => {
                const value = event.target.value;
                const nextFilter = value === "all" ? "all" : Number(value);
                setSelectedProjectId(nextFilter);
                void loadUpdates(nextFilter);
              }}
            >
              <option value="all">All assigned projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {formatDisplayTitle(project.project_name) || project.project_name}
                </option>
              ))}
            </select>
          </label>
          <p className="site-engineer-page__support" style={{ alignSelf: "center" }}>
            {pendingCount} pending verification{pendingCount === 1 ? "" : "s"}
          </p>
        </div>

        <section className="site-engineer-card">
          {isLoading ? (
            <div className="site-engineer-empty">Loading verification queue...</div>
          ) : (
            <DailyUpdateBoard
              title="Supervisor-Verified Updates"
              description="Approve to lock official task progress, or reject with a reason for resubmission."
              updates={updates}
              mode="site-engineer"
              onReview={handleReview}
            />
          )}
        </section>

        <section className="site-engineer-card">
          <div className="site-engineer-card__header">
            <h2 className="site-engineer-card__title">Recent Update History</h2>
          </div>
          {isLoading ? (
            <div className="site-engineer-empty">Loading history...</div>
          ) : updates.length === 0 ? (
            <div className="site-engineer-empty">No daily updates found for this filter.</div>
          ) : (
            <div className="site-engineer-milestone-table-wrap">
              <table className="site-engineer-milestone-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Worker / Task</th>
                    <th>Completion</th>
                    <th>Supervisor</th>
                    <th>Site Engineer</th>
                  </tr>
                </thead>
                <tbody>
                  {updates.slice(0, 25).map((update) => (
                    <tr key={update.update_id}>
                      <td>{update.work_date}</td>
                      <td>
                        {update.worker?.name ?? "Worker"} · {update.task_title}
                        <span className="meta">
                          {update.project_name} / {update.milestone_title}
                        </span>
                      </td>
                      <td>
                        {Number(update.completion_percentage).toFixed(0)}% ·{" "}
                        {update.status.replace(/_/g, " ")}
                      </td>
                      <td>
                        {update.supervisor_review_status}
                        {update.supervisor_reviewed_at ? (
                          <span className="meta">
                            {new Date(update.supervisor_reviewed_at).toLocaleString()}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {update.engineer_review_status}
                        {update.engineer_reviewed_at ? (
                          <span className="meta">
                            {new Date(update.engineer_reviewed_at).toLocaleString()}
                          </span>
                        ) : null}
                        {update.engineer_review_note ? (
                          <span className="meta">{update.engineer_review_note}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default SiteEngineerVerificationsPage;
