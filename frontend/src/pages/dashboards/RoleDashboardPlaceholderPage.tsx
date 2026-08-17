import "./RoleDashboardPlaceholderPage.css";

interface RoleDashboardPlaceholderPageProps {
  title: string;
  description: string;
}

export const RoleDashboardPlaceholderPage = ({
  title,
  description,
}: RoleDashboardPlaceholderPageProps) => {
  return (
    <section className="role-dashboard-placeholder">
      <div className="role-dashboard-placeholder__card">
        <span className="role-dashboard-placeholder__eyebrow">Role Dashboard</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="role-dashboard-placeholder__note">
          This protected workspace shell is ready, and the role-specific tools can be added here
          later without changing the shared login or authorization flow.
        </div>
      </div>
    </section>
  );
};

export default RoleDashboardPlaceholderPage;
