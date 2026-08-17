import type { ReactNode } from "react";
import { useEffect, useId } from "react";

import "./DetailModal.css";

export type DetailModalTab = {
  id: string;
  label: string;
};

export type DetailModalSize = "md" | "lg" | "sm";

interface DetailModalProps {
  isOpen: boolean;
  title: string;
  titleId?: string;
  statusLabel?: string | null;
  statusVariant?: "default" | "archived" | "muted";
  description?: string | null;
  headerActions?: ReactNode;
  tabs?: DetailModalTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  loadingLabel?: string;
  size?: DetailModalSize;
  children: ReactNode;
  className?: string;
}

export const DetailModal = ({
  isOpen,
  title,
  titleId,
  statusLabel,
  statusVariant = "default",
  description,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  isLoading = false,
  loadingLabel = "Loading...",
  size = "lg",
  children,
  className,
}: DetailModalProps) => {
  const generatedId = useId();
  const headingId = titleId ?? `detail-modal-title-${generatedId}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = "hidden";
    const scrollRoots = document.querySelectorAll<HTMLElement>(
      ".admin-layout__body, .user-workspace-layout__body",
    );
    scrollRoots.forEach((node) => {
      node.dataset.prevOverflow = node.style.overflow;
      node.style.overflow = "hidden";
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      scrollRoots.forEach((node) => {
        node.style.overflow = node.dataset.prevOverflow || "";
        delete node.dataset.prevOverflow;
      });
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const rootClass = ["detail-modal", `detail-modal--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="presentation">
      <button
        type="button"
        className="detail-modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="detail-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="detail-modal__header">
          <div className="detail-modal__heading">
            <div className="detail-modal__title-row">
              <h2 id={headingId} className="detail-modal__title">
                {title}
              </h2>
              {statusLabel ? (
                <span
                  className={`status-pill detail-modal__badge detail-modal__badge--${statusVariant}`}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>
            {description ? <p className="detail-modal__description">{description}</p> : null}
          </div>
          <div className="detail-modal__header-actions">
            {headerActions}
            <button
              type="button"
              className="detail-modal__close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {tabs && tabs.length > 0 ? (
          <div className="detail-modal__tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`detail-modal__tab${
                  activeTab === tab.id ? " detail-modal__tab--active" : ""
                }`}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="detail-modal__body">
          {isLoading ? <div className="detail-modal__loading">{loadingLabel}</div> : children}
        </div>
      </div>
    </div>
  );
};

interface DetailFieldProps {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

export const DetailField = ({ label, value, fullWidth = false }: DetailFieldProps) => (
  <div className={`detail-overview__item${fullWidth ? " detail-overview__item--full" : ""}`}>
    <span className="detail-overview__label">{label}</span>
    <span className="detail-overview__value">{value}</span>
  </div>
);

interface DetailOverviewGridProps {
  children: ReactNode;
}

export const DetailOverviewGrid = ({ children }: DetailOverviewGridProps) => (
  <div className="detail-overview__grid">{children}</div>
);

interface DetailSectionProps {
  title?: string;
  children: ReactNode;
}

export const DetailSection = ({ title, children }: DetailSectionProps) => (
  <div className="detail-overview__section">
    {title ? <h3 className="detail-overview__section-title">{title}</h3> : null}
    {children}
  </div>
);

export default DetailModal;
