import type { ReactNode } from "react";

import type { ProjectDetail } from "../../types/project";
import { DetailModal } from "../ui/DetailModal";

import "./ProjectDetailsModal.css";

export type ProjectDetailsTab = "overview" | "milestones" | "documents";

interface ProjectDetailsModalProps {
  isOpen: boolean;
  project: ProjectDetail | null;
  isLoading?: boolean;
  activeTab: ProjectDetailsTab;
  onTabChange: (tab: ProjectDetailsTab) => void;
  onClose: () => void;
  onEdit?: () => void;
  overviewContent: ReactNode;
  milestonesContent: ReactNode;
  documentsContent: ReactNode;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "documents", label: "Documents" },
] as const;

export const ProjectDetailsModal = ({
  isOpen,
  project,
  isLoading = false,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  overviewContent,
  milestonesContent,
  documentsContent,
}: ProjectDetailsModalProps) => {
  const statusLabel = project
    ? project.is_archived
      ? "Archived"
      : project.status
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
    : null;

  const headerActions =
    onEdit && project ? (
      <button
        type="button"
        className="admin-btn admin-btn--secondary project-details-modal__edit-btn"
        onClick={onEdit}
      >
        Edit Project
      </button>
    ) : null;

  return (
    <DetailModal
      className="project-details-modal"
      isOpen={isOpen}
      title={project?.project_name ?? "Project Details"}
      titleId="project-details-modal-title"
      statusLabel={statusLabel}
      statusVariant={project?.is_archived ? "archived" : "default"}
      headerActions={headerActions}
      tabs={[...TABS]}
      activeTab={activeTab}
      onTabChange={(tabId) => onTabChange(tabId as ProjectDetailsTab)}
      onClose={onClose}
      isLoading={isLoading && !project}
      loadingLabel="Loading project details..."
      size="lg"
    >
      {activeTab === "overview" ? overviewContent : null}
      {activeTab === "milestones" ? milestonesContent : null}
      {activeTab === "documents" ? documentsContent : null}
    </DetailModal>
  );
};

export default ProjectDetailsModal;
