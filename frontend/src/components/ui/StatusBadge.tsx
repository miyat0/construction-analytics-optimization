import "./StatusBadge.css";

type StatusBadgeProps = {
  label: string;
  tone?:
    | "planning"
    | "planned"
    | "active"
    | "in_progress"
    | "completed"
    | "delayed"
    | "on_hold"
    | "cancelled"
    | "archived"
    | "neutral";
  className?: string;
};

const normalizeTone = (tone: string): StatusBadgeProps["tone"] => {
  const key = tone.toLowerCase().replace(/\s+/g, "_");
  if (
    key === "planning" ||
    key === "planned" ||
    key === "active" ||
    key === "in_progress" ||
    key === "completed" ||
    key === "delayed" ||
    key === "on_hold" ||
    key === "cancelled" ||
    key === "archived"
  ) {
    return key;
  }
  return "neutral";
};

export const StatusBadge = ({ label, tone = "neutral", className }: StatusBadgeProps) => {
  const resolvedTone = normalizeTone(tone);
  return (
    <span
      className={["status-badge", `status-badge--${resolvedTone}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
