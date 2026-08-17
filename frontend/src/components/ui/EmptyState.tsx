import type { ReactNode } from "react";

import "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <div className="fs-empty-state">
      <p className="fs-empty-state__title">{title}</p>
      {description ? <p className="fs-empty-state__description">{description}</p> : null}
      {action ? <div className="fs-empty-state__action">{action}</div> : null}
    </div>
  );
};

export default EmptyState;
