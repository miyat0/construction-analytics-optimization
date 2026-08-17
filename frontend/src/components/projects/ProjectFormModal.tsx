import type { ReactNode } from "react";

import { DetailModal } from "../ui/DetailModal";

import "./ProjectFormModal.css";

interface ProjectFormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const ProjectFormModal = ({
  isOpen,
  title,
  onClose,
  children,
}: ProjectFormModalProps) => {
  return (
    <DetailModal
      className="project-form-modal"
      isOpen={isOpen}
      title={title}
      titleId="project-form-modal-title"
      onClose={onClose}
      size="md"
    >
      {children}
    </DetailModal>
  );
};

export default ProjectFormModal;
