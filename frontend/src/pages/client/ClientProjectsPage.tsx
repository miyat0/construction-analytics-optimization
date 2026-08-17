import axios from "axios";
import { useEffect, useState } from "react";

import {
  getProject,
  listProjectDocuments,
  listProjectMilestones,
  listProjects,
} from "../../services/projectApi";
import type {
  Milestone,
  ProjectDetail,
  ProjectDocument,
  ProjectSummary,
} from "../../types/project";
import { ProjectTimeline } from "../../components/projects/ProjectTimeline";

import "./ClientProjectsPage.css";

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallbackMessage;
  }

  return fallbackMessage;
};

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

export const ClientProjectsPage = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProjectBundle = async (projectId: number) => {
    setIsDetailLoading(true);

    try {
      const [project, milestoneData, documentData] = await Promise.all([
        getProject(projectId),
        listProjectMilestones(projectId),
        listProjectDocuments(projectId),
      ]);

      setSelectedProject(project);
      setMilestones(milestoneData.results);
      setDocuments(documentData.results);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load the selected client project right now."),
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const loadProjects = async (preferredProjectId?: number | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const projectData = await listProjects();
      setProjects(projectData.results);

      const nextProjectId =
        preferredProjectId && projectData.results.some((project) => project.project_id === preferredProjectId)
          ? preferredProjectId
          : projectData.results[0]?.project_id ?? null;

      setSelectedProjectId(nextProjectId);

      if (nextProjectId) {
        await loadProjectBundle(nextProjectId);
      } else {
        setSelectedProject(null);
        setMilestones([]);
        setDocuments([]);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to load your shared projects right now."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleSelectProject = async (projectId: number) => {
    setSelectedProjectId(projectId);
    await loadProjectBundle(projectId);
  };

  return (
    <main className="client-projects-page">
      <section className="client-projects-page__hero">
        <h1>Projects</h1>
      </section>

      {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}

      <div className="client-projects-page__grid">
        <section className="client-projects-page__surface">
          <div className="client-projects-page__surface-header">
            <div>
              <h2>Your Projects</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="client-projects-page__empty">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="client-projects-page__empty">
              No projects shared yet.
            </div>
          ) : (
            <div className="client-projects-page__project-list">
              {projects.map((project) => (
                <button
                  key={project.project_id}
                  type="button"
                  className={`client-projects-page__project-card ${
                    selectedProjectId === project.project_id
                      ? "client-projects-page__project-card--active"
                      : ""
                  }`}
                  onClick={() => void handleSelectProject(project.project_id)}
                >
                  <strong>{project.project_name}</strong>
                  <span>{project.status.replace(/_/g, " ")}</span>
                  <small>
                    Milestones: {project.milestone_count} | Documents: {project.document_count}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="client-projects-page__details">
          <section className="client-projects-page__surface">
            <div className="client-projects-page__surface-header">
              <div>
                <h2>Overview</h2>
              </div>
            </div>

            {isDetailLoading ? (
              <div className="client-projects-page__empty">Loading project details...</div>
            ) : !selectedProject ? (
              <div className="client-projects-page__empty">
                Select a project.
              </div>
            ) : (
              <div className="client-projects-page__overview">
                <div className="client-projects-page__overview-header">
                  <div>
                    <h3>{selectedProject.project_name}</h3>
                    <p>{selectedProject.description || "No description"}</p>
                  </div>
                  <span className="client-projects-page__badge">
                    {selectedProject.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="client-projects-page__meta-grid">
                  <div>
                    <span>Start Date</span>
                    <strong>{formatDate(selectedProject.start_date)}</strong>
                  </div>
                  <div>
                    <span>End Date</span>
                    <strong>{formatDate(selectedProject.end_date)}</strong>
                  </div>
                  <div>
                    <span>Project Manager</span>
                    <strong>{selectedProject.project_manager?.name ?? "Not assigned"}</strong>
                  </div>
                  <div>
                    <span>Site Engineer</span>
                    <strong>{selectedProject.site_engineer?.name ?? "Not assigned"}</strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          {selectedProject ? (
            <section className="client-projects-page__surface">
              <ProjectTimeline milestones={milestones} />
            </section>
          ) : null}

          {selectedProject ? (
            <section className="client-projects-page__surface">
              <div className="client-projects-page__surface-header">
                <div>
                  <h2>Documents</h2>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="client-projects-page__empty">
                  No documents yet.
                </div>
              ) : (
                <div className="client-projects-page__document-list">
                  {documents.map((document) => (
                    <article
                      key={document.document_id}
                      className="client-projects-page__document-card"
                    >
                      <div>
                        <h3>{document.title}</h3>
                        <p>{document.description || "No notes"}</p>
                      </div>
                      <div className="client-projects-page__document-meta">
                        <span>{document.document_type.replace(/_/g, " ")}</span>
                        <span>{document.milestone_title ?? "Project level"}</span>
                        <span>{document.file_name ?? "File unavailable"}</span>
                      </div>
                      {document.file_url ? (
                        <a href={document.file_url} target="_blank" rel="noreferrer">
                          Open Document
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default ClientProjectsPage;
