import type { ProjectDetail } from "../../types/project";
import { formatCurrencyINR } from "../../utils/formatCurrency";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";
import { DetailField, DetailModal, DetailOverviewGrid } from "../ui/DetailModal";

import "./ProjectDetailsModal.css";

interface ProjectQuickViewModalProps {
  isOpen: boolean;
  project: ProjectDetail | null;
  isLoading?: boolean;
  milestoneCount?: number;
  documentCount?: number;
  onClose: () => void;
  onOpenProject: () => void;
  onEdit?: () => void;
}

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

export const ProjectQuickViewModal = ({
  isOpen,
  project,
  isLoading = false,
  milestoneCount = 0,
  documentCount = 0,
  onClose,
  onOpenProject,
  onEdit,
}: ProjectQuickViewModalProps) => {
  const statusLabel = project
    ? project.is_archived
      ? "Archived"
      : project.status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : null;

  const headerActions = (
    <>
      {onEdit && project ? (
        <button
          type="button"
          className="admin-btn admin-btn--secondary project-details-modal__edit-btn"
          onClick={onEdit}
        >
          Edit Project
        </button>
      ) : null}
      <button
        type="button"
        className="admin-btn admin-btn--primary"
        onClick={onOpenProject}
        disabled={!project}
      >
        Open Project
      </button>
    </>
  );

  return (
    <DetailModal
      className="project-details-modal"
      isOpen={isOpen}
      title={
        formatDisplayTitle(project?.project_name) ||
        project?.project_name ||
        "Project Quick View"
      }
      titleId="project-quick-view-title"
      statusLabel={statusLabel}
      statusVariant={project?.is_archived ? "archived" : "default"}
      headerActions={headerActions}
      onClose={onClose}
      isLoading={isLoading && !project}
      loadingLabel="Loading project..."
      size="md"
    >
      {project ? (
        <div className="detail-overview">
          <DetailOverviewGrid>
            <DetailField
              label="Project Manager"
              value={project.project_manager?.name ?? "Unassigned"}
            />
            <DetailField label="Client" value={project.client?.name ?? "Unassigned"} />
            <DetailField label="Start Date" value={formatDate(project.start_date)} />
            <DetailField label="End Date" value={formatDate(project.end_date)} />
            <DetailField label="Budget" value={formatCurrencyINR(project.initial_budget)} />
            <DetailField
              label="Progress"
              value={`${Number(project.progress_percentage || 0).toFixed(0)}%`}
            />
            <DetailField
              label="Site Engineers"
              value={
                (project.site_engineers?.length
                  ? project.site_engineers
                  : project.site_engineer
                    ? [project.site_engineer]
                    : []
                )
                  .map((member) => member.name)
                  .join(", ") || "Not assigned"
              }
            />
            <DetailField
              label="Supervisors"
              value={
                (project.supervisors?.length
                  ? project.supervisors
                  : project.supervisor
                    ? [project.supervisor]
                    : []
                )
                  .map((member) => member.name)
                  .join(", ") || "Not assigned"
              }
            />
            <DetailField label="Milestones" value={milestoneCount} />
            <DetailField label="Documents" value={documentCount} />
          </DetailOverviewGrid>
        </div>
      ) : null}
    </DetailModal>
  );
};

export default ProjectQuickViewModal;
