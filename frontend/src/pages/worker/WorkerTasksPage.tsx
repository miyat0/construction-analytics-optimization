import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { WorkerTaskBoard } from "../../components/projects/WorkerTaskBoard";
import { WorkerEmptyState } from "../../components/worker/WorkerEmptyState";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import {
  createTaskAssignmentUpdate,
  listMyTaskAssignments,
} from "../../services/projectApi";

import type { ApiErrorResponse } from "../../types/auth";
import type { DailyTaskUpdatePayload, TaskAssignment } from "../../types/project";

import "./WorkerPages.css";

type TaskFilter = "all" | "pending" | "in_progress" | "completed";

const IconClipboard = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="24" height="24" fill="none">
    <path
      d="M7.5 4.5h5M8 3h4a1 1 0 0 1 1 1v1.5H7V4a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M6.5 5.5h7A1.5 1.5 0 0 1 15 7v8.5A1.5 1.5 0 0 1 13.5 17h-7A1.5 1.5 0 0 1 5 15.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const matchesFilter = (assignment: TaskAssignment, filter: TaskFilter): boolean => {
  if (filter === "all") {
    return true;
  }

  const status = (
    assignment.latest_update?.status ?? assignment.task.status ?? ""
  ).toLowerCase();

  if (filter === "pending") {
    return status === "not_started" || status === "planned" || status === "pending";
  }
  if (filter === "in_progress") {
    return status === "in_progress";
  }
  return status === "completed";
};

export const WorkerTasksPage = () => {
  useWorkspacePageTitle("Tasks");
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTasks = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listMyTaskAssignments();
      setTaskAssignments(response.results);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(error.response?.data?.message ?? "Unable to load tasks.");
      } else {
        setErrorMessage("Unable to load tasks.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const hasTasks = taskAssignments.length > 0;
  const filteredAssignments = useMemo(
    () => taskAssignments.filter((assignment) => matchesFilter(assignment, filter)),
    [filter, taskAssignments],
  );

  const handleTaskUpdateSubmit = async (
    assignmentId: number,
    payload: DailyTaskUpdatePayload,
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createTaskAssignmentUpdate(assignmentId, payload);
      setSuccessMessage("Daily work update submitted.");
      await loadTasks();
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(error.response?.data?.message ?? "Unable to submit the daily update.");
      } else {
        setErrorMessage("Unable to submit the daily update.");
      }
      throw error;
    }
  };

  return (
    <main className="worker-page">
      <div className="worker-page-content">
        {errorMessage ? (
          <div className="alert alert-danger worker-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="alert alert-success worker-page__alert" role="alert">
            {successMessage}
          </div>
        ) : null}

        <header className="worker-page__intro">
          <p className="worker-page__support">View and update your assigned work.</p>
        </header>

        {isLoading ? (
          <div className="worker-card worker-page__loading">Loading tasks...</div>
        ) : !hasTasks ? (
          <WorkerEmptyState
            icon={<IconClipboard />}
            title="No tasks assigned yet"
            description="New assignments will appear here."
          />
        ) : (
          <>
            <div className="worker-page__filters" role="tablist" aria-label="Task filters">
              {(
                [
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["in_progress", "In Progress"],
                  ["completed", "Completed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={`worker-page__filter${
                    filter === value ? " worker-page__filter--active" : ""
                  }`}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <WorkerTaskBoard
              assignments={filteredAssignments}
              onSubmitUpdate={handleTaskUpdateSubmit}
              showHeader={false}
              title="Tasks"
            />
          </>
        )}
      </div>
    </main>
  );
};

export default WorkerTasksPage;
