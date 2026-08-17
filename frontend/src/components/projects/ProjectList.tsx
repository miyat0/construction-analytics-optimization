import type { FormEvent } from "react";

import type { ProjectSummary } from "../../types/project";
import { PROJECT_STATUS_OPTIONS } from "../../types/project";
import { EmptyState } from "../ui/EmptyState";
import { FilterBar, PageToolbar } from "../ui/PageToolbar";
import { ProjectCard } from "./ProjectCard";

import "./ProjectList.css";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...PROJECT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  { value: "archived", label: "Archived" },
];

interface ProjectListProps {
  projects: ProjectSummary[];
  selectedProjectId?: number | null;
  isLoading?: boolean;
  showNewProjectButton?: boolean;
  searchValue: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onNewProject: () => void;
  onView: (project: ProjectSummary) => void;
  onEdit: (project: ProjectSummary) => void;
  onDelete: (project: ProjectSummary) => void;
}

export const ProjectList = ({
  projects,
  selectedProjectId = null,
  isLoading = false,
  showNewProjectButton = true,
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSearchSubmit,
  onResetFilters,
  onNewProject,
  onView,
  onEdit,
  onDelete,
}: ProjectListProps) => {
  return (
    <section className="page-list project-list">
      <PageToolbar
        action={
          showNewProjectButton ? (
            <button type="button" className="admin-btn admin-btn--primary" onClick={onNewProject}>
              New Project
              <span className="admin-btn__plus" aria-hidden="true">
                +
              </span>
            </button>
          ) : undefined
        }
        filter={
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search projects by name, manager, or client..."
            onSearchChange={onSearchChange}
            selectValue={statusFilter}
            selectAriaLabel="Filter by status"
            selectOptions={STATUS_FILTER_OPTIONS}
            onSelectChange={onStatusFilterChange}
            onSubmit={onSearchSubmit}
            onReset={onResetFilters}
          />
        }
      />

      {isLoading ? (
        <div className="project-list__empty">Loading projects...</div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects match the current filters."
          description="Try adjusting search or create a new project."
          action={
            showNewProjectButton ? (
              <button type="button" className="admin-btn admin-btn--primary" onClick={onNewProject}>
                New Project
                <span className="admin-btn__plus" aria-hidden="true">
                  +
                </span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="page-list__items project-list__items">
          {projects.map((project) => (
            <ProjectCard
              key={project.project_id}
              project={project}
              isActive={selectedProjectId === project.project_id}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectList;
