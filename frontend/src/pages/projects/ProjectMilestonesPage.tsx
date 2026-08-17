import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AddMilestoneModal } from "../../components/projects/AddMilestoneModal";
import { MilestoneManager } from "../../components/projects/MilestoneManager";
import { useProjectDetail } from "../../components/projects/ProjectDetailLayout";
import { getProjectMilestonePath } from "../../utils/projectCreateRoutes";
import { formatDisplayTitle } from "../../utils/formatDisplayTitle";

export const ProjectMilestonesPage = () => {
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const {
    scope,
    projectId,
    project,
    milestones,
    handleCreateMilestone,
    handleUpdateMilestone,
    handleDeleteMilestone,
  } = useProjectDetail();

  return (
    <div>
      <div className="project-detail-layout__section-header">
        <div>
          <h2 className="project-detail-layout__section-title">Milestones</h2>
          <p className="project-detail-layout__section-subtitle">
            Track major phases and completion progress
            {project ? ` for ${formatDisplayTitle(project.project_name)}` : ""}.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => setIsAddOpen(true)}
        >
          <span className="admin-btn__plus" aria-hidden="true">
            +
          </span>{" "}
          Add Milestone
        </button>
      </div>

      <MilestoneManager
        milestones={milestones}
        canManage={true}
        listOnly
        hideChrome
        onCreate={handleCreateMilestone}
        onUpdate={handleUpdateMilestone}
        onDelete={handleDeleteMilestone}
        onSelectMilestone={(milestoneId) =>
          navigate(getProjectMilestonePath(scope, projectId, milestoneId), {
            state: { projectId },
          })
        }
        onRequestCreate={() => setIsAddOpen(true)}
      />

      <AddMilestoneModal
        isOpen={isAddOpen}
        projectName={formatDisplayTitle(project?.project_name) || project?.project_name}
        milestones={milestones}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreateMilestone}
      />
    </div>
  );
};

export default ProjectMilestonesPage;
