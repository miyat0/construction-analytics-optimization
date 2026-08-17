import { useState } from "react";

import { ProjectDocumentManager } from "../../components/projects/ProjectDocumentManager";
import { useProjectDetail } from "../../components/projects/ProjectDetailLayout";
import { UploadDocumentModal } from "../../components/projects/UploadDocumentModal";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

export const ProjectDocumentsPage = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const {
    project,
    documents,
    milestones,
    handleCreateDocument,
    handleUpdateDocument,
    handleDeleteDocument,
  } = useProjectDetail();

  return (
    <div>
      <div className="project-detail-layout__section-header">
        <div>
          <h2 className="project-detail-layout__section-title">Documents</h2>
          <p className="project-detail-layout__section-subtitle">
            Store and review files related to
            {project ? ` ${formatDisplayTitle(project.project_name)}` : " this project"}.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => setIsUploadOpen(true)}
        >
          <span className="admin-btn__plus" aria-hidden="true">
            +
          </span>{" "}
          Upload Document
        </button>
      </div>

      <ProjectDocumentManager
        documents={documents}
        milestones={milestones}
        canManage={true}
        hideChrome
        onCreate={handleCreateDocument}
        onUpdate={handleUpdateDocument}
        onDelete={handleDeleteDocument}
        onRequestCreate={() => setIsUploadOpen(true)}
      />

      <UploadDocumentModal
        isOpen={isUploadOpen}
        projectName={formatDisplayTitle(project?.project_name) || project?.project_name}
        milestones={milestones}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={handleCreateDocument}
      />
    </div>
  );
};

export default ProjectDocumentsPage;
