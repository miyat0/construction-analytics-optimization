import { useState } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import type { MilestoneTask } from "../../types/project";

import "./PendingTaskApprovals.css";

interface PendingTaskApprovalsProps {
  tasks: MilestoneTask[];
  isLoading?: boolean;
  onApprove: (task: MilestoneTask) => Promise<void>;
  onReject: (task: MilestoneTask, note: string) => Promise<void>;
  /** When true and there are no pending tasks, hide the section entirely. */
  hideWhenEmpty?: boolean;
}

export const PendingTaskApprovals = ({
  tasks,
  isLoading = false,
  onApprove,
  onReject,
  hideWhenEmpty = false,
}: PendingTaskApprovalsProps) => {
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  const handleApprove = async (task: MilestoneTask) => {
    setProcessingTaskId(task.task_id);
    try {
      await onApprove(task);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleReject = async (task: MilestoneTask) => {
    setProcessingTaskId(task.task_id);
    try {
      await onReject(task, rejectNotes[task.task_id]?.trim() || "Rejected");
      setRejectNotes((current) => {
        const next = { ...current };
        delete next[task.task_id];
        return next;
      });
    } finally {
      setProcessingTaskId(null);
    }
  };

  if (!isLoading && hideWhenEmpty && tasks.length === 0) {
    return null;
  }

  return (
    <section className="pending-task-approvals">
      <SectionHeader title="Pending Approvals" count={`${tasks.length} pending`} />

      {isLoading ? (
        <EmptyState title="Loading pending tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks awaiting approval." />
      ) : (
        <div className="pending-task-approvals__list">
          {tasks.map((task) => (
            <article key={task.task_id} className="pending-task-approvals__card">
              <div className="pending-task-approvals__card-header">
                <div>
                  <h3>{task.title}</h3>
                  <span>
                    {task.milestone.title} · Workers needed: {task.required_worker_count}
                    {task.daily_target_percentage
                      ? ` · Daily target: ${task.daily_target_percentage}%`
                      : ""}
                  </span>
                </div>
                <span className="status-pill pending-task-approvals__badge">Pending</span>
              </div>
              {task.description ? <p>{task.description}</p> : null}
              <input
                className="admin-control pending-task-approvals__note"
                placeholder="Optional rejection note"
                value={rejectNotes[task.task_id] ?? ""}
                onChange={(event) =>
                  setRejectNotes((current) => ({
                    ...current,
                    [task.task_id]: event.target.value,
                  }))
                }
              />
              <div className="pending-task-approvals__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={processingTaskId === task.task_id}
                  onClick={() => void handleReject(task)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  disabled={processingTaskId === task.task_id}
                  onClick={() => void handleApprove(task)}
                >
                  Approve
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default PendingTaskApprovals;
