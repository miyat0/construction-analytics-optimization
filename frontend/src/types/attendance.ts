export type AttendanceShiftStatus = "clocked_in" | "clocked_out";

export interface WorkerProfileSummary {
  user_id: number;
  name: string;
  email: string;
  phone_number: string;
  role: {
    role_id: number;
    role_name: string;
    description: string;
  };
}

export interface AttendanceShiftRecord {
  attendance_id: number;
  attendance_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: AttendanceShiftStatus;
  task_assignment_id?: number | null;
  task_id?: number | null;
  task_title?: string | null;
  total_minutes: number | null;
  total_hours: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManHourSummary {
  man_hour_id: number;
  work_date: string;
  total_minutes: number;
  total_hours: string;
}

export interface WorkerAttendanceSummary {
  completed_shift_count: number;
  recorded_total_minutes: number;
  recorded_total_hours: string;
}

export interface WorkerAttendanceState {
  is_clocked_in: boolean;
  current_shift: AttendanceShiftRecord | null;
  latest_man_hour: ManHourSummary | null;
  history: AttendanceShiftRecord[];
  summary: WorkerAttendanceSummary;
}

export interface WorkerAttendanceDashboardData {
  worker: WorkerProfileSummary;
  attendance: WorkerAttendanceState;
  server_time: string;
}

export interface AttendanceHistoryData {
  count: number;
  results: AttendanceShiftRecord[];
}

export interface AttendanceClockInData {
  worker: WorkerProfileSummary;
  attendance: AttendanceShiftRecord;
  server_time: string;
}

export interface AttendanceClockOutData {
  worker: WorkerProfileSummary;
  attendance: AttendanceShiftRecord;
  man_hour: ManHourSummary;
  server_time: string;
}
