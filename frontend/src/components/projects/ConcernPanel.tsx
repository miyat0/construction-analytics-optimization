import { useState } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import type { DailyTaskUpdate } from "../../types/project";

import "./ConcernPanel.css";

interface ConcernPanelProps {
  title: string;
  description: string;
  concerns: DailyTaskUpdate[];
  canResolve?: boolean;
  onResolve?: (updateId: number, resolved: boolean) => Promise<void>;
}

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const ConcernPanel = ({
  title,
  description,
  concerns,
  canResolve = false,
  onResolve,
}: ConcernPanelProps) => {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleResolve = async (updateId: number, resolved: boolean) => {
    if (!onResolve) {
      return;
    }

    setProcessingId(updateId);
    try {
      await onResolve(updateId, resolved);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="concern-panel">
      {title ? <SectionHeader title={title} /> : null}
      {description ? <p className="concern-panel__description">{description}</p> : null}

      {concerns.length === 0 ? (
        <EmptyState title="No concerns raised." />
      ) : (
        <div className="concern-panel__list">
          {concerns.map((concern) => (
            <article key={concern.update_id} className="concern-panel__card">
              <div className="concern-panel__card-header">
                <div>
                  <h3>{concern.task_title}</h3>
                  <span>
                    {concern.worker?.name ?? "Worker"} | {concern.milestone_title}
                  </span>
                </div>
                <span className="concern-panel__date">{formatDate(concern.work_date)}</span>
              </div>

              <div className="concern-panel__flags">
                {concern.has_safety_issue ? (
                  <span className="concern-panel__flag concern-panel__flag--danger">
                    Safety Issue
                  </span>
                ) : null}
                <span
                  className={`concern-panel__flag${
                    concern.concern_resolved ? " concern-panel__flag--resolved" : ""
                  }`}
                >
                  {concern.concern_resolved ? "Resolved" : "Open"}
                </span>
                {concern.supervisor_review_status !== "pending" ? (
                  <span className="concern-panel__flag">
                    Supervisor: {concern.supervisor_review_status}
                  </span>
                ) : null}
                {concern.engineer_review_status !== "pending" ? (
                  <span className="concern-panel__flag">
                    Engineer: {concern.engineer_review_status}
                  </span>
                ) : null}
              </div>

              <p>{concern.concern_text || concern.remark || "No details"}</p>

              {canResolve && onResolve ? (
                <div className="concern-panel__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    disabled={processingId === concern.update_id}
                    onClick={() =>
                      void handleResolve(concern.update_id, !concern.concern_resolved)
                    }
                  >
                    {concern.concern_resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ConcernPanel;
