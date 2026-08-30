import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";

import { WorkerEmptyState } from "../../components/worker/WorkerEmptyState";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import { useAuth } from "../../hooks/useAuth";
import {
  clockInWorker,
  clockOutWorker,
  fetchWorkerAttendanceDashboard,
} from "../../services/attendanceApi";
import { listMyTaskAssignments } from "../../services/projectApi";

import type { ApiErrorResponse } from "../../types/auth";
import type { WorkerAttendanceDashboardData } from "../../types/attendance";
import type { TaskAssignment } from "../../types/project";

import {
  formatDisplayHours,
  formatDuration,
  formatHeaderDate,
  formatLoggedHours,
  formatStartedAt,
  getElapsedSeconds,
  getFirstErrorMessage,
  getGreeting,
} from "./workerFormatters";

import "./WorkerPages.css";

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

export const WorkerDashboardPage = () => {
  useWorkspacePageTitle("Worker Dashboard");
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<WorkerAttendanceDashboardData | null>(null);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClockOutDialogOpen, setIsClockOutDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const loadDashboard = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [attendanceResponse, assignmentResponse] = await Promise.all([
        fetchWorkerAttendanceDashboard(),
        listMyTaskAssignments(),
      ]);
      setDashboard(attendanceResponse);
      setTaskAssignments(assignmentResponse.results);
      setCurrentTime(new Date(attendanceResponse.server_time).getTime());
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(error.response?.data?.message ?? "Unable to load dashboard.");
        return;
      }
      setErrorMessage("Unable to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const currentShift = dashboard?.attendance.current_shift ?? null;
  const isClockedIn = dashboard?.attendance.is_clocked_in ?? false;

  useEffect(() => {
    if (!isClockedIn || !currentShift) {
      return undefined;
    }

    setCurrentTime(Date.now());
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentShift, isClockedIn]);

  const elapsedSeconds = useMemo(() => {
    if (!currentShift || !isClockedIn) {
      return 0;
    }
    return getElapsedSeconds(currentShift.clock_in_at, currentTime);
  }, [currentShift, currentTime, isClockedIn]);

  const summary = dashboard?.attendance.summary;
  const workerName = dashboard?.worker?.name ?? user?.name ?? "Worker";
  const completedShifts = summary?.completed_shift_count ?? 0;
  const totalHoursDisplay = formatDisplayHours(summary?.recorded_total_hours ?? 0);
  const todayLabel = formatHeaderDate(new Date());
  const greeting = getGreeting();
  const previewTasks = taskAssignments.slice(0, 3);

  const handleClockIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const activeAssignments = taskAssignments.filter((assignment) => assignment.is_active);
      const assignmentId =
        activeAssignments.length === 1 ? activeAssignments[0].assignment_id : undefined;
      await clockInWorker(assignmentId);
      setSuccessMessage("Clocked in.");
      await loadDashboard();
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(
          getFirstErrorMessage(error.response?.data?.errors?.attendance) ??
            error.response?.data?.message ??
            "Unable to clock in.",
        );
      } else {
        setErrorMessage("Unable to clock in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await clockOutWorker();
      setSuccessMessage(`Shift ended — ${formatLoggedHours(response.man_hour.total_hours)} logged`);
      setIsClockOutDialogOpen(false);
      await loadDashboard();
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(
          getFirstErrorMessage(error.response?.data?.errors?.attendance) ??
            error.response?.data?.message ??
            "Unable to clock out.",
        );
      } else {
        setErrorMessage("Unable to clock out.");
      }
    } finally {
      setIsSubmitting(false);
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

        <header className="worker-page__intro worker-page__intro--dashboard">
          <div>
            <div className="worker-page__intro-row">
              <p className="worker-page__greeting">
                {greeting}, {workerName}
              </p>
              <p className="worker-page__date">{todayLabel}</p>
            </div>
            <p className="worker-page__support">Here&apos;s what you need for today.</p>
          </div>
        </header>

        <section className="worker-card worker-page__shift-card" aria-label="Today's shift">
          <div className="worker-page__shift-heading">Today&apos;s Shift</div>
          <div className="worker-page__shift-grid">
            <div className="worker-page__shift-block">
              <div
                className={`worker-page__status-badge worker-page__status-badge--${
                  isClockedIn ? "on" : "off"
                }`}
              >
                <span className="worker-page__status-dot" aria-hidden="true" />
                <span>{isClockedIn ? "On Shift" : "Off Shift"}</span>
              </div>
              {isClockedIn && currentShift ? (
                <span className="worker-page__started">
                  Started {formatStartedAt(currentShift.clock_in_at)}
                </span>
              ) : null}
            </div>

            <div className="worker-page__shift-block worker-page__shift-block--center">
              <strong className="worker-page__timer" aria-live="polite">
                {isClockedIn ? formatDuration(elapsedSeconds) : "00:00:00"}
              </strong>
              <span className="worker-page__label">Shift Timer</span>
            </div>

            <div className="worker-page__shift-action">
              <button
                type="button"
                className={`worker-page__clock-btn worker-page__clock-btn--${
                  isClockedIn ? "out" : "in"
                }`}
                disabled={isSubmitting || isLoading}
                onClick={() => {
                  if (isClockedIn) {
                    setIsClockOutDialogOpen(true);
                    return;
                  }
                  void handleClockIn();
                }}
              >
                {isSubmitting ? "Saving..." : isClockedIn ? "Clock Out" : "Clock In"}
              </button>
            </div>
          </div>
        </section>

        <section className="worker-page__section">
          <div className="worker-page__section-header">
            <h3 className="worker-page__section-title">Today&apos;s Tasks</h3>
            <Link className="worker-page__section-link" to="/worker/tasks">
              Tasks →
            </Link>
          </div>
          {isLoading ? (
            <div className="worker-card worker-page__loading">Loading tasks...</div>
          ) : previewTasks.length === 0 ? (
            <WorkerEmptyState
              className="worker-empty-state--compact"
              icon={<IconClipboard />}
              title="No tasks for today"
              description="New assignments will appear here."
            />
          ) : (
            <div className="worker-card worker-page__task-preview">
              {previewTasks.map((assignment) => (
                <article key={assignment.assignment_id} className="worker-page__task-row">
                  <div>
                    <strong>{assignment.task.title}</strong>
                    <span>
                      {assignment.task.project_name}
                      {assignment.task.milestone_title
                        ? ` · ${assignment.task.milestone_title}`
                        : ""}
                    </span>
                  </div>
                  <span className="worker-page__chip">
                    {(assignment.latest_update?.status ?? assignment.task.status).replace(
                      /_/g,
                      " ",
                    )}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="worker-page__stats worker-page__stats--two" aria-label="Work summary">
          <article className="worker-card worker-page__stat">
            <span className="worker-page__label">Completed Shifts</span>
            <strong className="worker-page__stat-value">
              {isLoading ? "—" : completedShifts}
            </strong>
          </article>
          <article className="worker-card worker-page__stat">
            <span className="worker-page__label">Total Hours</span>
            <strong className="worker-page__stat-value">
              {isLoading ? "—" : totalHoursDisplay}
            </strong>
          </article>
        </section>
      </div>

      {isClockOutDialogOpen ? (
        <div className="worker-page__dialog-backdrop" role="presentation">
          <div
            className="worker-page__dialog"
            aria-labelledby="worker-clock-out-title"
            aria-modal="true"
            role="dialog"
          >
            <h2 id="worker-clock-out-title">End shift?</h2>
            <p>Clock out and end the current shift?</p>
            <div className="worker-page__dialog-actions">
              <button
                type="button"
                className="worker-page__dialog-btn worker-page__dialog-btn--secondary"
                disabled={isSubmitting}
                onClick={() => setIsClockOutDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="worker-page__dialog-btn worker-page__dialog-btn--primary"
                disabled={isSubmitting}
                onClick={() => void handleClockOut()}
              >
                {isSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default WorkerDashboardPage;
