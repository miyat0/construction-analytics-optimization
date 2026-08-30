import type { ReactNode } from "react";

interface WorkerEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const WorkerEmptyState = ({
  icon,
  title,
  description,
  className = "",
}: WorkerEmptyStateProps) => {
  return (
    <div className={`worker-empty-state ${className}`.trim()}>
      {icon ? (
        <span className="worker-empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <strong className="worker-empty-state__title">{title}</strong>
      <p className="worker-empty-state__description">{description}</p>
    </div>
  );
};

export default WorkerEmptyState;
