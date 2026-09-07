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
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

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

const formatStatus = (status: string): string => status.replace(/_/g, " ");

const formatPeople = (
  people: Array<{ name: string }> | null | undefined,
  fallbackName?: string | null,
): string => {
  const names = (people ?? []).map((person) => person.name).filter(Boolean);
  if (names.length > 0) {
    return names.join(", ");
  }
  return fallbackName?.trim() || "Not assigned";
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
        preferredProjectId &&
        projectData.results.some((project) => project.project_id === preferredProjectId)
          ? preferredProjectId
          : (projectData.results[0]?.project_id ?? null);

      setSelectedProjectId(nextProjectId);

      if (nextProjectId) {
        await loadProjectBundle(nextProjectId);
      } else {
        setSelectedProject(null);
        setMilestones([]);
        setDocuments([]);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load your shared projects right now."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleSelectProject = async (projectId: number) => {
    if (projectId === selectedProjectId) {
      return;
    }
    setSelectedProjectId(projectId);
    setErrorMessage(null);
    await loadProjectBundle(projectId);
  };

  return (
    <main className="client-projects-page">
      <header className="client-projects-page__intro">
        <div>
          <p className="client-projects-page__eyebrow">Client workspace</p>
          <h1 className="client-projects-page__title">Your projects</h1>
          <p className="client-projects-page__subtitle">
            Review progress, milestones, and shared documents for projects assigned to you.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div className="alert alert-danger client-projects-page__alert" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <section className="client-projects-page__surface client-projects-page__chooser">
        <div className="client-projects-page__surface-header">
          <h2>Select project</h2>
          <span className="client-projects-page__count">
            {isLoading ? "…" : `${projects.length} total`}
          </span>
        </div>

        {isLoading ? (
          <div className="client-projects-page__empty">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="client-projects-page__empty">
            No projects have been shared with you yet.
          </div>
        ) : (
          <div className="client-projects-page__project-list" role="list">
            {projects.map((project) => {
              const isActive = selectedProjectId === project.project_id;
              return (
                <button
                  key={project.project_id}
                  type="button"
                  role="listitem"
                  className={`client-projects-page__project-card${
                    isActive ? " client-projects-page__project-card--active" : ""
                  }`}
                  aria-pressed={isActive}
                  onClick={() => void handleSelectProject(project.project_id)}
                >
                  <span className="client-projects-page__project-card-top">
                    <strong>
                      {formatDisplayTitle(project.project_name) || project.project_name}
                    </strong>
                    <span className="client-projects-page__badge">
                      {formatStatus(project.status)}
                    </span>
                  </span>
                  <span className="client-projects-page__project-card-meta">
                    {project.milestone_count} milestones · {project.document_count} documents
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="client-projects-page__details">
        <section className="client-projects-page__surface">
          <div className="client-projects-page__surface-header">
            <h2>Overview</h2>
          </div>

          {isDetailLoading ? (
            <div className="client-projects-page__empty">Loading project details…</div>
          ) : !selectedProject ? (
            <div className="client-projects-page__empty">Select a project to view details.</div>
          ) : (
            <div className="client-projects-page__overview">
              <div className="client-projects-page__overview-header">
                <div className="client-projects-page__overview-copy">
                  <h3>
                    {formatDisplayTitle(selectedProject.project_name) ||
                      selectedProject.project_name}
                  </h3>
                  <p>
                    {selectedProject.description?.trim()
                      ? selectedProject.description
                      : "No description provided for this project."}
                  </p>
                </div>
                <span className="client-projects-page__badge client-projects-page__badge--lg">
                  {formatStatus(selectedProject.status)}
                </span>
              </div>

              <div className="client-projects-page__meta-grid">
                <div className="client-projects-page__meta-item">
                  <span className="client-projects-page__meta-label">Start date</span>
                  <strong className="client-projects-page__meta-value">
                    {formatDate(selectedProject.start_date)}
                  </strong>
                </div>
                <div className="client-projects-page__meta-item">
                  <span className="client-projects-page__meta-label">End date</span>
                  <strong className="client-projects-page__meta-value">
                    {formatDate(selectedProject.end_date)}
                  </strong>
                </div>
                <div className="client-projects-page__meta-item">
                  <span className="client-projects-page__meta-label">Project manager</span>
                  <strong className="client-projects-page__meta-value">
                    {selectedProject.project_manager?.name ?? "Not assigned"}
                  </strong>
                </div>
                <div className="client-projects-page__meta-item">
                  <span className="client-projects-page__meta-label">Site engineer</span>
                  <strong className="client-projects-page__meta-value">
                    {formatPeople(
                      selectedProject.site_engineers,
                      selectedProject.site_engineer?.name,
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>

        {selectedProject ? (
          <section className="client-projects-page__surface client-projects-page__timeline">
            <ProjectTimeline milestones={milestones} />
          </section>
        ) : null}

        {selectedProject ? (
          <section className="client-projects-page__surface">
            <div className="client-projects-page__surface-header">
              <h2>Documents</h2>
              <span className="client-projects-page__count">{documents.length}</span>
            </div>

            {documents.length === 0 ? (
              <div className="client-projects-page__empty">
                No documents have been shared yet.
              </div>
            ) : (
              <div className="client-projects-page__document-list">
                {documents.map((document) => (
                  <article
                    key={document.document_id}
                    className="client-projects-page__document-card"
                  >
                    <div className="client-projects-page__document-copy">
                      <h3>{formatDisplayTitle(document.title) || document.title}</h3>
                      <p>{document.description?.trim() || "No notes"}</p>
                    </div>
                    <div className="client-projects-page__document-meta">
                      <span>{formatStatus(document.document_type)}</span>
                      <span>{document.milestone_title ?? "Project level"}</span>
                      <span>{document.file_name ?? "File unavailable"}</span>
                    </div>
                    {document.file_url ? (
                      <a
                        className="client-projects-page__document-link"
                        href={document.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open document
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default ClientProjectsPage;
