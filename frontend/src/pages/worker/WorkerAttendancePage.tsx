import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import { WorkerEmptyState } from "../../components/worker/WorkerEmptyState";
import { useWorkspacePageTitle } from "../../contexts/AdminChromeContext";
import { fetchWorkerAttendanceDashboard } from "../../services/attendanceApi";

import type { ApiErrorResponse } from "../../types/auth";
import type {
  AttendanceShiftRecord,
  WorkerAttendanceDashboardData,
} from "../../types/attendance";

import {
  formatCompactDate,
  formatDisplayHours,
  formatRecordHours,
  formatTimeOnly,
} from "./workerFormatters";

import "./WorkerPages.css";

const IconClock = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="24" height="24" fill="none">
    <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const WorkerAttendancePage = () => {
  useWorkspacePageTitle("Attendance");
  const [dashboard, setDashboard] = useState<WorkerAttendanceDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetchWorkerAttendanceDashboard();
        setDashboard(response);
      } catch (error) {
        if (isAxiosError<ApiErrorResponse>(error)) {
          setErrorMessage(error.response?.data?.message ?? "Unable to load attendance.");
        } else {
          setErrorMessage("Unable to load attendance.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const summary = dashboard?.attendance.summary;
  const history = dashboard?.attendance.history ?? [];

  return (
    <main className="worker-page">
      <div className="worker-page-content">
        {errorMessage ? (
          <div className="alert alert-danger worker-page__alert" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <header className="worker-page__intro">
          <p className="worker-page__support">
            Review your shift and attendance history.
          </p>
        </header>

        <section className="worker-page__stats worker-page__stats--two" aria-label="Attendance summary">
          <article className="worker-card worker-page__stat">
            <span className="worker-page__label">Completed Shifts</span>
            <strong className="worker-page__stat-value">
              {isLoading ? "—" : summary?.completed_shift_count ?? 0}
            </strong>
          </article>
          <article className="worker-card worker-page__stat">
            <span className="worker-page__label">Total Hours</span>
            <strong className="worker-page__stat-value">
              {isLoading
                ? "—"
                : formatDisplayHours(summary?.recorded_total_hours ?? 0)}
            </strong>
          </article>
        </section>

        <section className="worker-page__section">
          <div className="worker-page__section-header">
            <h3 className="worker-page__section-title">Attendance History</h3>
          </div>

          {isLoading ? (
            <div className="worker-card worker-page__loading">Loading attendance...</div>
          ) : history.length === 0 ? (
            <WorkerEmptyState
              icon={<IconClock />}
              title="No attendance records yet"
              description="Completed shifts will appear in your history here."
            />
          ) : (
            <div className="worker-card worker-page__table-wrap">
              <table className="worker-page__table">
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
                      <td className="worker-page__table-date">
                        {formatCompactDate(record.attendance_date)}
                      </td>
                      <td>{formatTimeOnly(record.clock_in_at)}</td>
                      <td>{formatTimeOnly(record.clock_out_at)}</td>
                      <td className="worker-page__table-hours">
                        {formatRecordHours(record)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default WorkerAttendancePage;
