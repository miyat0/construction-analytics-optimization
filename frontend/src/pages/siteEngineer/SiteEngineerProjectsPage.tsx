import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ProjectTimeline } from "../../components/projects/ProjectTimeline";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  getProject,
  listProjectMilestones,
  listProjects,
} from "../../services/projectApi";
import type { Milestone, ProjectDetail, ProjectSummary } from "../../types/project";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

import "./SiteEngineerPages.css";

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

export const SiteEngineerProjectsPage = () => {
  useWorkspacePageTitle("Projects & Milestones");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProject = async (projectId: number) => {
    setIsDetailLoading(true);
    setErrorMessage(null);
    try {
      const [project, milestoneData] = await Promise.all([
        getProject(projectId),
        listProjectMilestones(projectId),
      ]);
      setSelectedProject(project);
      setMilestones(milestoneData.results);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load project milestones right now."));
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const projectData = await listProjects();
        setProjects(projectData.results);
        const nextId = projectData.results[0]?.project_id ?? null;
        setSelectedProjectId(nextId);
        if (nextId) {
          await loadProject(nextId);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Unable to load assigned projects right now."));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const handleSelectProject = async (projectId: number) => {
    setSelectedProjectId(projectId);
    await loadProject(projectId);
  };

  return (
    <main className="site-engineer-page">
      <div className="site-engineer-page-content">
        <header>
          <h1 className="site-engineer-page__title">Projects &amp; Milestones</h1>
          <p className="site-engineer-page__subtitle">
            Review authorized project schedules, deadlines, and planned vs verified progress.
          </p>
        </header>

        {errorMessage ? (
          <div className="alert alert-danger site-engineer-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="site-engineer-page-content" style={{ gap: 16, padding: 0 }}>
          <section className="site-engineer-card">
            <div className="site-engineer-card__header">
              <h2 className="site-engineer-card__title">Assigned Projects</h2>
              <Link className="site-engineer-card__link" to="/site-engineer/tasks">
                Manage tasks
              </Link>
            </div>

            {isLoading ? (
              <div className="site-engineer-empty">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="site-engineer-empty">No projects assigned to you.</div>
            ) : (
              <div className="site-engineer-project-grid">
                {projects.map((project) => (
                  <button
                    key={project.project_id}
                    type="button"
                    className={`site-engineer-project-card${
                      selectedProjectId === project.project_id
                        ? " site-engineer-project-card--active"
                        : ""
                    }`}
                    onClick={() => void handleSelectProject(project.project_id)}
                  >
                    <strong>
                      {formatDisplayTitle(project.project_name) || project.project_name}
                    </strong>
                    <span>{project.status.replace(/_/g, " ")}</span>
                    <small>
                      {project.milestone_count} milestones · Progress{" "}
                      {Number(project.progress_percentage || 0).toFixed(0)}%
                    </small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="site-engineer-card">
            <div className="site-engineer-card__header">
              <h2 className="site-engineer-card__title">
                {selectedProject
                  ? formatDisplayTitle(selectedProject.project_name) ||
                    selectedProject.project_name
                  : "Milestone Details"}
              </h2>
            </div>

            {isDetailLoading ? (
              <div className="site-engineer-empty">Loading milestones...</div>
            ) : !selectedProject ? (
              <div className="site-engineer-empty">Select a project to view milestones.</div>
            ) : (
              <>
                <p className="site-engineer-page__support" style={{ marginBottom: 14 }}>
                  {selectedProject.description || "No project description."} PM:{" "}
                  {selectedProject.project_manager?.name ?? "Unassigned"} · Supervisors:{" "}
                  {(selectedProject.supervisors?.length
                    ? selectedProject.supervisors
                    : selectedProject.supervisor
                      ? [selectedProject.supervisor]
                      : []
                  )
                    .map((member) => member.name)
                    .join(", ") || "Unassigned"}
                </p>

                {milestones.length === 0 ? (
                  <div className="site-engineer-empty">No milestones for this project.</div>
                ) : (
                  <div className="site-engineer-milestone-table-wrap">
                    <table className="site-engineer-milestone-table">
                      <thead>
                        <tr>
                          <th>Milestone</th>
                          <th>Start</th>
                          <th>Original Deadline</th>
                          <th>Current Deadline</th>
                          <th>Planned %</th>
                          <th>Actual Verified %</th>
                          <th>Schedule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestones.map((milestone) => (
                          <tr key={milestone.milestone_id}>
                            <td>
                              {formatDisplayTitle(milestone.title) || milestone.title}
                              {milestone.description ? (
                                <span className="meta">{milestone.description}</span>
                              ) : null}
                            </td>
                            <td>{formatDate(milestone.planned_start_date)}</td>
                            <td>{formatDate(milestone.planned_end_date)}</td>
                            <td>
                              {formatDate(
                                milestone.effective_end_date || milestone.planned_end_date,
                              )}
                            </td>
                            <td>
                              {Number(milestone.expected_progress_percentage || 0).toFixed(0)}%
                            </td>
                            <td>{Number(milestone.progress_percentage || 0).toFixed(0)}%</td>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: 18 }}>
                  <ProjectTimeline milestones={milestones} hideTitle />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default SiteEngineerProjectsPage;
