import type { AttendanceShiftRecord } from "../../types/attendance";

export const formatDuration = (totalSeconds: number): string => {
  const normalizedSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

export const formatLoggedHours = (totalHours: string): string => {
  const totalMinutes = Math.round(Number(totalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatHeaderDate = (value: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(value);
};

export const formatCompactDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export const formatTimeOnly = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatStartedAt = (value: string): string => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

/** Presentation-only. Does not alter backend values. */
export const formatDisplayHours = (
  hoursValue: string | number | null | undefined,
): string => {
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

export const formatRecordHours = (record: AttendanceShiftRecord): string => {
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

export const getElapsedSeconds = (clockInAt: string, currentTime: number): number => {
  const startedAt = new Date(clockInAt).getTime();
  return Math.max(Math.floor((currentTime - startedAt) / 1000), 0);
};

export const getFirstErrorMessage = (value?: string | string[]): string | undefined => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

export const getGreeting = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
};
