import { apiClient } from "./axios";

import type { ApiSuccessResponse } from "../types/auth";
import type {
  AttendanceClockInData,
  AttendanceClockOutData,
  AttendanceHistoryData,
  WorkerAttendanceDashboardData,
} from "../types/attendance";

export const fetchWorkerAttendanceDashboard = async (
  limit = 10,
): Promise<WorkerAttendanceDashboardData> => {
  const response = await apiClient.get<ApiSuccessResponse<WorkerAttendanceDashboardData>>(
    "/attendance/me/",
    {
      params: { limit },
    },
  );

  return response.data.data;
};

export const clockInWorker = async (
  assignmentId?: number | null,
): Promise<AttendanceClockInData> => {
  const response = await apiClient.post<ApiSuccessResponse<AttendanceClockInData>>(
    "/attendance/clock-in/",
    assignmentId != null ? { assignment_id: assignmentId } : {},
  );

  return response.data.data;
};

export const clockOutWorker = async (): Promise<AttendanceClockOutData> => {
  const response = await apiClient.post<ApiSuccessResponse<AttendanceClockOutData>>(
    "/attendance/clock-out/",
  );

  return response.data.data;
};

export const fetchWorkerAttendanceHistory = async (
  limit = 10,
): Promise<AttendanceHistoryData> => {
  const response = await apiClient.get<ApiSuccessResponse<AttendanceHistoryData>>(
    "/attendance/history/",
    {
      params: { limit },
    },
  );

  return response.data.data;
};
