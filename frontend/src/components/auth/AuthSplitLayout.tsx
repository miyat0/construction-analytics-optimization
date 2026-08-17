import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { FortesiteMark } from "../branding/FortesiteMark";

/** Replace this file to update the login hero image. */
import loginHeroImage from "../../assets/images/landing-blueprint-engineer.jpeg";

import "./AuthSplitLayout.css";

interface AuthSplitLayoutProps {
  visualTitle?: string;
  visualDescription?: string;
  visualFooter?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}

const ChevronLeftIcon = () => (
  <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
    <path
      d="M8.75 3.5 5.25 7l3.5 3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const AuthSplitLayout = ({
  visualTitle = "Build with clarity.\nDeliver with control.",
  visualDescription = "Manage projects, budgets and field progress from one connected workspace.",
  visualFooter,
  contentClassName = "",
  children,
}: AuthSplitLayoutProps) => {
  const contentClasses = [
    "auth-split-layout__panel",
    "auth-split-layout__panel--form",
    contentClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const titleLines = visualTitle.split("\n");

  return (
    <main className="auth-split-layout">
      <section
        className="auth-split-layout__panel auth-split-layout__panel--hero"
        style={{ backgroundImage: `url(${loginHeroImage})` }}
        aria-label="FORTESITE construction workspace"
      >
        <div className="auth-split-layout__hero-overlay" aria-hidden="true" />

        <div className="auth-split-layout__hero-inner">
          <FortesiteMark
            className="auth-split-layout__hero-brand"
            size="sm"
          />

          <div className="auth-split-layout__hero-copy">
            <h1 className="auth-split-layout__hero-title">
              {titleLines.map((line, index) => (
                <span
                  key={line}
                  className={
                    index === titleLines.length - 1 && titleLines.length > 1
                      ? "auth-split-layout__hero-title-line auth-split-layout__hero-title-line--accent"
                      : "auth-split-layout__hero-title-line"
                  }
                >
                  {line}
                </span>
              ))}
            </h1>
            {visualDescription ? (
              <p className="auth-split-layout__hero-description">{visualDescription}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={contentClasses}>
        <div className="auth-split-layout__auth-area">
          <div className="auth-split-layout__auth-wrapper">
            {visualFooter ? (
              <div className="auth-split-layout__top-nav">{visualFooter}</div>
            ) : (
              <Link className="auth-split-layout__back-link" to="/">
                <ChevronLeftIcon />
                Back to website
              </Link>
            )}

            <div className="auth-split-layout__brand-block">
              <FortesiteMark className="auth-split-layout__brand" size="md" />
              <p className="auth-split-layout__brand-tagline">
                Construction project management
              </p>
            </div>

            {children}
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthSplitLayout;
