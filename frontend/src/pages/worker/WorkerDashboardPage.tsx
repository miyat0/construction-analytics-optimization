import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { WorkerTaskBoard } from "../../components/projects/WorkerTaskBoard";
import { useAuth } from "../../hooks/useAuth";
import {
  clockInWorker,
  clockOutWorker,
  fetchWorkerAttendanceDashboard,
} from "../../services/attendanceApi";
import {
  createTaskAssignmentUpdate,
  listMyTaskAssignments,
} from "../../services/projectApi";

import type { ApiErrorResponse } from "../../types/auth";
import type {
  AttendanceShiftRecord,
  WorkerAttendanceDashboardData,
} from "../../types/attendance";
import type { DailyTaskUpdatePayload, TaskAssignment } from "../../types/project";

import "./WorkerDashboardPage.css";

const IconCheck = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none">
    <path
      d="M7.5 10.5 9.2 12.2 12.8 8.2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconClock = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none">
    <path
      d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconClipboard = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none">
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

const IconCalendar = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none">
    <path
      d="M6 3.5v2M14 3.5v2M4.5 7h11M5.5 4.5h9A1.5 1.5 0 0 1 16 6v9.5A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const formatDuration = (totalSeconds: number): string => {
  const normalizedSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

const formatLoggedHours = (totalHours: string): string => {
  const totalMinutes = Math.round(Number(totalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatHeaderDate = (value: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(value);
};

const formatCompactDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const formatTimeOnly = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatStartedAt = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

/** Presentation-only. Does not alter backend values. */
const formatDisplayHours = (hoursValue: string | number | null | undefined): string => {
  const hours = Number(hoursValue);
  if (!Number.isFinite(hours) || hours <= 0) {
    return "—";
  }

  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) {
    return `${Math.max(totalMinutes, 1)} min`;
  }

  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
};

const formatRecordHours = (record: AttendanceShiftRecord): string => {
  if (record.clock_out_at) {
    const elapsedMs =
      new Date(record.clock_out_at).getTime() - new Date(record.clock_in_at).getTime();
    const totalSeconds = Math.max(elapsedMs / 1000, 0);
    if (totalSeconds > 0) {
      const storedHours = Number(record.total_hours);
      if (Number.isFinite(storedHours) && storedHours > 0) {
        return formatDisplayHours(storedHours);
      }
      return formatDisplayHours(totalSeconds / 3600);
    }
  }

  if (record.total_hours && Number(record.total_hours) > 0) {
    return formatDisplayHours(record.total_hours);
  }

  return record.status === "clocked_in" ? "In progress" : "—";
};

const getElapsedSeconds = (clockInAt: string, currentTime: number): number => {
  const startedAt = new Date(clockInAt).getTime();
  return Math.max(Math.floor((currentTime - startedAt) / 1000), 0);
};

const getFirstErrorMessage = (value?: string | string[]): string | undefined => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

export const WorkerDashboardPage = () => {
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
  const history = dashboard?.attendance.history ?? [];
  const workerName = dashboard?.worker?.name ?? user?.name ?? "Worker";
  const workerInitial = workerName.trim().charAt(0).toUpperCase() || "W";
  const assignedTaskCount = taskAssignments.filter((assignment) => assignment.is_active).length;
  const completedShifts = summary?.completed_shift_count ?? 0;
  const totalHoursDisplay = formatDisplayHours(summary?.recorded_total_hours ?? 0);
  const todayLabel = formatHeaderDate(new Date());

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

  const handleTaskUpdateSubmit = async (
    assignmentId: number,
    payload: DailyTaskUpdatePayload,
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createTaskAssignmentUpdate(assignmentId, payload);
      setSuccessMessage("Daily work update submitted.");
      await loadDashboard();
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(error.response?.data?.message ?? "Unable to submit update.");
      } else {
        setErrorMessage("Unable to submit update.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="worker-dashboard">
      <div className="worker-dashboard-content">
        {errorMessage ? (
          <div className="alert alert-danger worker-dashboard__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="alert alert-success worker-dashboard__alert" role="alert">
            {successMessage}
          </div>
        ) : null}

        <header className="worker-dashboard__header">
          <div className="worker-dashboard__header-main">
            <h1 className="worker-dashboard__title">Worker Dashboard</h1>
            <div className="worker-dashboard__welcome">
              <span className="worker-dashboard__avatar" aria-hidden="true">
                {workerInitial}
              </span>
              <p className="worker-dashboard__subtitle">Welcome back, {workerName}.</p>
            </div>
          </div>
          <p className="worker-dashboard__date">{todayLabel}</p>
        </header>

        <section className="worker-dashboard__shift-card" aria-label="Today's shift">
          <div className="worker-dashboard__shift-heading">Today&apos;s Shift</div>
          <div className="worker-dashboard__shift-grid">
            <div className="worker-dashboard__shift-block">
              <span className="worker-dashboard__label">Status</span>
              <div
                className={`worker-dashboard__status-badge worker-dashboard__status-badge--${
                  isClockedIn ? "on" : "off"
                }`}
              >
                <span className="worker-dashboard__status-dot" aria-hidden="true" />
                <span>{isClockedIn ? "On Shift" : "Off Shift"}</span>
                {isClockedIn ? (
                  <span className="worker-dashboard__live-tag">Live</span>
                ) : null}
              </div>
              {isClockedIn && currentShift ? (
                <span className="worker-dashboard__started">
                  Started {formatStartedAt(currentShift.clock_in_at)}
                </span>
              ) : null}
            </div>

            <div className="worker-dashboard__shift-block worker-dashboard__shift-block--center">
              <strong className="worker-dashboard__timer" aria-live="polite">
                {isClockedIn ? formatDuration(elapsedSeconds) : "00:00:00"}
              </strong>
              <span className="worker-dashboard__label">Shift Timer</span>
            </div>

            <div className="worker-dashboard__shift-action">
              <button
                type="button"
                className={`worker-dashboard__clock-btn worker-dashboard__clock-btn--${
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

        <section className="worker-dashboard__stats" aria-label="Shift statistics">
          <article className="worker-dashboard__stat">
            <span className="worker-dashboard__stat-icon" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="worker-dashboard__label">Completed Shifts</span>
            <strong className="worker-dashboard__stat-value">
              {isLoading ? "—" : completedShifts}
            </strong>
          </article>
          <article className="worker-dashboard__stat worker-dashboard__stat--accent">
            <span className="worker-dashboard__stat-icon worker-dashboard__stat-icon--accent" aria-hidden="true">
              <IconClock />
            </span>
            <span className="worker-dashboard__label">Total Hours</span>
            <strong className="worker-dashboard__stat-value">
              {isLoading ? "—" : totalHoursDisplay}
            </strong>
          </article>
          <article className="worker-dashboard__stat">
            <span className="worker-dashboard__stat-icon" aria-hidden="true">
              <IconClipboard />
            </span>
            <span className="worker-dashboard__label">Assigned Tasks</span>
            <strong className="worker-dashboard__stat-value">
              {isLoading ? "—" : assignedTaskCount}
            </strong>
          </article>
        </section>

        <section className="worker-dashboard__section">
          <WorkerTaskBoard
            assignments={taskAssignments}
            onSubmitUpdate={handleTaskUpdateSubmit}
          />
        </section>

        <section className="worker-dashboard__section">
          <div className="worker-dashboard__section-header">
            <h2 className="worker-dashboard__section-title">
              <IconCalendar />
              <span>Recent Attendance</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="worker-dashboard__empty">Loading attendance...</div>
          ) : history.length === 0 ? (
            <div className="worker-dashboard__empty worker-dashboard__empty--centered">
              <span className="worker-dashboard__empty-icon" aria-hidden="true">
                <IconCalendar />
              </span>
              <span>No attendance records yet.</span>
            </div>
          ) : (
            <>
              <div className="worker-dashboard__table-wrap worker-dashboard__table-wrap--desktop">
                <table className="worker-dashboard__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record: AttendanceShiftRecord) => (
                      <tr key={record.attendance_id}>
                        <td>
                          <span className="worker-dashboard__row-status">
                            {record.status === "clocked_out" ? (
                              <span
                                className="worker-dashboard__row-dot worker-dashboard__row-dot--done"
                                aria-hidden="true"
                              />
                            ) : (
                              <span
                                className="worker-dashboard__row-dot worker-dashboard__row-dot--live"
                                aria-hidden="true"
                              />
                            )}
                            {formatCompactDate(record.attendance_date)}
                          </span>
                        </td>
                        <td>{formatTimeOnly(record.clock_in_at)}</td>
                        <td>{formatTimeOnly(record.clock_out_at)}</td>
                        <td>{formatRecordHours(record)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="worker-dashboard__mobile-list">
                {history.map((record: AttendanceShiftRecord) => (
                  <article key={record.attendance_id} className="worker-dashboard__mobile-item">
                    <strong>{formatCompactDate(record.attendance_date)}</strong>
                    <span>
                      {formatTimeOnly(record.clock_in_at)} → {formatTimeOnly(record.clock_out_at)}
                    </span>
                    <span className="worker-dashboard__mobile-hours">
                      {formatRecordHours(record)}
                    </span>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {isClockOutDialogOpen ? (
        <div className="worker-dashboard__dialog-backdrop" role="presentation">
          <div
            className="worker-dashboard__dialog"
            aria-labelledby="worker-clock-out-title"
            aria-modal="true"
            role="dialog"
          >
            <h2 id="worker-clock-out-title">End shift?</h2>
            <p>Clock out and end the current shift?</p>
            <div className="worker-dashboard__dialog-actions">
              <button
                type="button"
                className="worker-dashboard__dialog-btn worker-dashboard__dialog-btn--secondary"
                disabled={isSubmitting}
                onClick={() => setIsClockOutDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="worker-dashboard__dialog-btn worker-dashboard__dialog-btn--primary"
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
