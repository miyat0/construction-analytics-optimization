import type { ReactNode } from "react";

import "./StatCard.css";

export type StatCardProps = {
  value: string | number;
  label: string;
  icon?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export const StatCard = ({ value, label, icon, meta, className }: StatCardProps) => {
  return (
    <article className={`stat-card${className ? ` ${className}` : ""}`}>
      {icon ? (
        <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__label">{label}</p>
      {meta ? <p className="stat-card__meta">{meta}</p> : null}
    </article>
  );
};

export const StatCardRow = ({
  children,
  className,
  "aria-label": ariaLabel = "Summary statistics",
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) => {
  return (
    <div
      className={`stat-card-row${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

const iconProps = {
  "aria-hidden": true as const,
  fill: "none",
  height: 14,
  viewBox: "0 0 16 16",
  width: 14,
};

export const StatIcons = {
  folder: (
    <svg {...iconProps}>
      <path
        d="M2.5 4.25A1.75 1.75 0 0 1 4.25 2.5h1.9c.4 0 .78.16 1.06.44l.6.6c.12.12.28.19.45.19h3.49A1.75 1.75 0 0 1 13.5 5.48v6.27A1.75 1.75 0 0 1 11.75 13.5H4.25A1.75 1.75 0 0 1 2.5 11.75V4.25Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  ),
  check: (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 8.1 7.2 9.8 10.5 6.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
  clock: (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3.25L10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  ),
  archive: (
    <svg {...iconProps}>
      <path
        d="M2.75 4.25h10.5v1.5H2.75v-1.5ZM3.5 5.75h9v6.5A1.25 1.25 0 0 1 11.25 13.5h-6.5A1.25 1.25 0 0 1 3.5 12.25v-6.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path d="M6.5 8.5h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  ),
  person: (
    <svg {...iconProps}>
      <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.5 13c.7-2 2.2-3 4.5-3s3.8 1 4.5 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
  xCircle: (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m6 6 4 4M10 6l-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
  shield: (
    <svg {...iconProps}>
      <path
        d="M8 2.75 12.25 4.5v3.4c0 2.55-1.7 4.85-4.25 5.6-2.55-.75-4.25-3.05-4.25-5.6V4.5L8 2.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
  milestone: (
    <svg {...iconProps}>
      <path
        d="M3 13V3h6.2L8.5 5.5 9.2 8H3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
  budget: (
    <svg {...iconProps}>
      <path
        d="M8 2.75v10.5M10.25 5.25c0-1-.9-1.75-2.25-1.75S5.75 4.25 5.75 5.25 6.65 7 8 7s2.25.75 2.25 1.75S9.35 10.5 8 10.5s-2.25-.75-2.25-1.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  ),
};

export default StatCard;
