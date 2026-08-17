import type { ReactNode } from "react";

import "./SectionHeader.css";

interface SectionHeaderProps {
  title: string;
  count?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const SectionHeader = ({ title, count, action, className }: SectionHeaderProps) => {
  const rootClass = ["section-header", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="section-header__title-row">
        <h2 className="section-header__title">{title}</h2>
        {count != null && count !== "" ? (
          <span className="section-header__count">{count}</span>
        ) : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
};

export default SectionHeader;
