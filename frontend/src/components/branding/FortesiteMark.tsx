import { Link } from "react-router-dom";

import "./FortesiteMark.css";

interface FortesiteMarkProps {
  className?: string;
  to?: string;
  size?: "sm" | "md";
}

/** Transparent brand mark (icon + wordmark) — avoids the PNG's solid black plate. */
export const FortesiteMark = ({
  className = "",
  to = "/",
  size = "md",
}: FortesiteMarkProps) => {
  const classes = ["fortesite-mark", `fortesite-mark--${size}`, className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <svg
        className="fortesite-mark__icon"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" fill="#2B3138" />
        <path
          d="M7.5 24V12.8L11.2 9.6h2.1v14.4H7.5Z"
          fill="#C9CFD6"
        />
        <path
          d="M18.7 24V9.6h2.1L24.5 12.8V24H18.7Z"
          fill="#C9CFD6"
        />
        <path d="M13.2 24V8.2h5.6V24H13.2Z" fill="#FF5A1F" />
        <path d="M16 10.6 17.35 12.2H14.65L16 10.6Z" fill="#F4F7FA" />
      </svg>
      <span className="fortesite-mark__word">FORTESITE</span>
    </>
  );

  if (to) {
    return (
      <Link className={classes} to={to} aria-label="FORTESITE">
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} role="img" aria-label="FORTESITE">
      {content}
    </span>
  );
};

export default FortesiteMark;
