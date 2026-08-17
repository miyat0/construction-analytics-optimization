import { ProjectWorkspace } from "../../components/projects/ProjectWorkspace";

import "./ProjectManagerPages.css";

export const ProjectManagerProjectsPage = () => {
  return (
    <div className="project-manager-projects-page">
      <ProjectWorkspace scope="project-manager" />
    </div>
  );
};

export default ProjectManagerProjectsPage;
