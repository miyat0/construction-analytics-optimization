import { Link } from "react-router-dom";

import { BrandLogo } from "../../components/branding/BrandLogo";
import heroSiteImage from "../../assets/images/landing-hero-dusk.jpeg";
import blueprintImage from "../../assets/images/landing-blueprint-engineer.jpeg";

import "./LandingPage.css";

const ArrowRightIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
    <path
      d="M3.75 9h10.5M9.75 4.5 14.25 9l-4.5 4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const FeatureIcon = ({ name }: { name: "control" | "budget" | "access" }) => {
  if (name === "budget") {
    return (
      <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 10h17M8 5.5V4M16 5.5V4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M8.5 14.5h3M14.5 14.5h1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "access") {
    return (
      <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
        <path
          d="M12 3.5 19 6.25v4.4c0 4.2-2.85 7.95-7 9.1-4.15-1.15-7-4.9-7-9.1v-4.4L12 3.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path d="M9.5 12.1 11.2 13.8 14.8 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M4 19V5h7.2L10 8.2 11.2 11.4H4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M14 8h6M14 12h6M14 16h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
};

const Crosshair = () => (
  <>
    <span className="landing-page__crosshair landing-page__crosshair--tl" aria-hidden="true" />
    <span className="landing-page__crosshair landing-page__crosshair--tr" aria-hidden="true" />
    <span className="landing-page__crosshair landing-page__crosshair--bl" aria-hidden="true" />
    <span className="landing-page__crosshair landing-page__crosshair--br" aria-hidden="true" />
  </>
);

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Platform", href: "#platform" },
  { label: "Contact", href: "#contact" },
];

const FEATURE_CARDS = [
  {
    title: "Live project control",
    description: "Track milestones, tasks, and field progress from one clear workspace.",
    icon: "control" as const,
  },
  {
    title: "Budget visibility",
    description: "Watch spend in real time and catch cost drift before it becomes overrun.",
    icon: "budget" as const,
  },
  {
    title: "Secure team access",
    description: "Give admins, managers, engineers, and field crews the right view.",
    icon: "access" as const,
  },
];

const PLATFORM_POINTS = [
  "One system for projects, documents, and daily updates",
  "Clear ownership across office and site roles",
  "Built to scale with your portfolio",
];

const HERO_STATS = [
  { code: "01", label: "Projects", detail: "Milestones & tasks" },
  { code: "02", label: "Budgets", detail: "Live cost tracking" },
  { code: "03", label: "Field", detail: "Daily site updates" },
];

export const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-page__header">
        <div className="container landing-page__header-inner">
          <Link className="landing-page__brand-link" to="/">
            <BrandLogo theme="light" className="landing-page__brand-logo" />
          </Link>

          <nav className="landing-page__nav" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => (
              <a key={link.href} className="landing-page__nav-link" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-page__header-actions">
            <Link className="landing-page__button landing-page__button--ghost" to="/login">
              Login
            </Link>
            <Link className="landing-page__button landing-page__button--primary" to="/login">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-page__hero">
          <div
            className="landing-page__hero-media"
            style={{ backgroundImage: `url(${heroSiteImage})` }}
            aria-hidden="true"
          />
          <div className="landing-page__hero-veil" aria-hidden="true" />
          <div className="landing-page__grid-overlay" aria-hidden="true" />
          <div className="container landing-page__hero-content">
            <div className="landing-page__hero-copy">
              <span className="landing-page__eyebrow landing-page__eyebrow--hero">
                Construction Management Software
              </span>
              <h1 className="landing-page__title">
                Build with clarity.
                <span className="landing-page__title-accent"> Deliver with control.</span>
              </h1>
              <p className="landing-page__description">
                FORTESITE helps construction teams manage projects, budgets, and field
                progress in one secure platform.
              </p>
              <div className="landing-page__cta-group">
                <Link
                  className="landing-page__button landing-page__button--primary landing-page__button--large"
                  to="/login"
                >
                  Get Started
                  <ArrowRightIcon />
                </Link>
                <a
                  className="landing-page__button landing-page__button--ghost landing-page__button--large"
                  href="#features"
                >
                  View Features
                </a>
              </div>

              <div className="landing-page__hero-stats" aria-label="Platform highlights">
                {HERO_STATS.map((stat) => (
                  <div key={stat.code} className="landing-page__hero-stat">
                    <span className="landing-page__hero-stat-code">{stat.code}</span>
                    <strong>{stat.label}</strong>
                    <span>{stat.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__feature-section" id="features">
          <div className="landing-page__grid-overlay landing-page__grid-overlay--soft" aria-hidden="true" />
          <div className="container">
            <div className="landing-page__section-heading landing-page__section-heading--center">
              <span className="landing-page__eyebrow">Features</span>
              <h2>Built for modern construction teams</h2>
              <p>
                Clear tools for planning, budgeting, and site coordination — without clutter.
              </p>
            </div>

            <div className="landing-page__feature-grid">
              {FEATURE_CARDS.map((card) => (
                <article key={card.title} className="landing-page__feature-card">
                  <Crosshair />
                  <span className="landing-page__feature-icon" aria-hidden="true">
                    <FeatureIcon name={card.icon} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-page__platform-section" id="platform">
          <div className="container landing-page__platform-grid">
            <div className="landing-page__platform-media">
              <Crosshair />
              <div className="landing-page__platform-frame">
                <img
                  className="landing-page__platform-image"
                  src={blueprintImage}
                  alt="Site engineer reviewing construction blueprints"
                />
                <span className="landing-page__platform-tint" aria-hidden="true" />
              </div>
            </div>

            <div className="landing-page__platform-copy">
              <span className="landing-page__eyebrow">Platform</span>
              <h2>From blueprint to site execution</h2>
              <p>
                Keep planning, budgets, and field activity connected so every role works
                from the same source of truth.
              </p>
              <ul className="landing-page__platform-list">
                {PLATFORM_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link className="landing-page__button landing-page__button--primary" to="/login">
                Access Workspace
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-page__contact-section" id="contact">
          <div className="landing-page__grid-overlay landing-page__grid-overlay--soft" aria-hidden="true" />
          <div className="container">
            <div className="landing-page__contact-panel">
              <Crosshair />
              <div className="landing-page__contact-copy">
                <span className="landing-page__eyebrow">Contact</span>
                <h2>Talk to the FORTESITE team</h2>
                <p>
                  Need access for your company, a product walkthrough, or support with
                  onboarding? Reach out and we will help you get set up.
                </p>
              </div>

              <div className="landing-page__contact-grid">
                <article className="landing-page__contact-card">
                  <span>Email</span>
                  <a href="mailto:info@fortesite.com">info@fortesite.com</a>
                </article>
                <article className="landing-page__contact-card">
                  <span>Phone</span>
                  <a href="tel:+910000000000">+91 00000 00000</a>
                </article>
                <article className="landing-page__contact-card">
                  <span>Support</span>
                  <p>Mon–Fri, 9:00 AM – 6:00 PM IST</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__cta-section">
          <div className="container">
            <div className="landing-page__cta-band">
              <Crosshair />
              <div>
                <span className="landing-page__eyebrow">Get started</span>
                <h2>Run your next project with FORTESITE</h2>
              </div>
              <Link
                className="landing-page__button landing-page__button--primary landing-page__button--large"
                to="/login"
              >
                Login
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-page__footer">
        <div className="container landing-page__footer-bar">
          <div className="landing-page__footer-brand-block">
            <Link className="landing-page__footer-brand" to="/">
              <BrandLogo theme="light" />
            </Link>
            <p>Construction project management & profit control.</p>
          </div>
          <div className="landing-page__footer-links">
            <a href="#features">Features</a>
            <a href="#platform">Platform</a>
            <a href="#contact">Contact</a>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
