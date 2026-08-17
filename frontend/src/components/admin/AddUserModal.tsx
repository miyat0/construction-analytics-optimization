import type { ReactNode } from "react";

import { DetailModal } from "../ui/DetailModal";

import "./AddUserModal.css";

interface AddUserModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
}

export const AddUserModal = ({
  isOpen,
  title = "Add User",
  description = "Assign a role and set login details.",
  titleId = "add-user-modal-title",
  onClose,
  children,
}: AddUserModalProps) => {
  return (
    <DetailModal
      className="add-user-modal"
      isOpen={isOpen}
      title={title}
      titleId={titleId}
      description={description}
      onClose={onClose}
      size="sm"
    >
      {children}
    </DetailModal>
  );
};

export default AddUserModal;
