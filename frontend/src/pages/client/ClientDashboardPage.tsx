import { useAuth } from "../../hooks/useAuth";

import "./ClientDashboardPage.css";

export const ClientDashboardPage = () => {
  const { user } = useAuth();

  return (
    <main className="client-dashboard">
      <div className="client-dashboard__shell">
        <section className="client-dashboard__hero">
          <span className="client-dashboard__eyebrow">Client Project Info</span>
          <h1>Welcome, {user?.name ?? "Client"}</h1>
          <p>
            We will make everything work correctly for you. Your project visibility matters to us,
            and we want your experience to feel safe, clear, and supported from the very start.
          </p>
        </section>

        <section className="client-dashboard__grid">
          <article className="client-dashboard__card">
            <h2>Your project information center</h2>
            <p>
              All the project info will be available soon. Thank you for your choice and for
              trusting us with your project journey.
            </p>
          </article>

          <article className="client-dashboard__card">
            <h2>What you can expect next</h2>
            <ul>
              <li>Project progress snapshots will appear here.</li>
              <li>Financial and milestone visibility will be added soon.</li>
              <li>We will keep everything organized and easy to follow for you.</li>
            </ul>
          </article>

          <article className="client-dashboard__card client-dashboard__card--accent">
            <h2>Message for you</h2>
            <p>
              We care about making this experience smooth. We will make everything work correctly,
              and your upcoming project updates will be shared here as soon as they are ready.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
};

export default ClientDashboardPage;
