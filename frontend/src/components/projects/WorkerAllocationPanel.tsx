import type { MilestoneTask } from "../../types/project";

import "./WorkerAllocationPanel.css";

interface WorkerAllocationPanelProps {
  tasks: MilestoneTask[];
}

export const WorkerAllocationPanel = ({ tasks }: WorkerAllocationPanelProps) => {
  const rows = tasks.map((task) => {
    const requested = task.required_worker_count;
    const assigned = task.active_assignment_count;
    const remaining = Math.max(requested - assigned, 0);
    const filled = requested > 0 ? Math.min(100, Math.round((assigned / requested) * 100)) : 0;

    return { task, requested, assigned, remaining, filled };
  });

  return (
    <section className="worker-allocation-panel">
      <div className="worker-allocation-panel__header">
        <h2>Worker Allocation</h2>
      </div>

      {rows.length === 0 ? (
        <div className="detail-empty">
          <p className="detail-empty__title">No tasks to allocate.</p>
        </div>
      ) : (
        <div className="worker-allocation-panel__list">
          {rows.map(({ task, requested, assigned, remaining, filled }) => (
            <article key={task.task_id} className="worker-allocation-panel__card">
              <div className="worker-allocation-panel__card-header">
                <h3>{task.title}</h3>
                <span className="status-pill worker-allocation-panel__status">
                  {assigned >= requested ? "Filled" : "Needs workers"}
                </span>
              </div>
              <div className="worker-allocation-panel__meta">
                <span>Requested: {requested}</span>
                <span>Assigned: {assigned}</span>
                <span>Remaining: {remaining}</span>
              </div>
              <div
                className="worker-allocation-panel__bar"
                role="progressbar"
                aria-valuenow={filled}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${filled}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default WorkerAllocationPanel;
