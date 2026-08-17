interface ProjectCreatePageHeaderProps {
  title: string;
  contextLine?: string | null;
  /** Optional legacy back control — prefer page breadcrumbs instead. */
  backLabel?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export const ProjectCreatePageHeader = ({
  title,
  contextLine,
  backLabel,
  onBack,
  showBack = false,
}: ProjectCreatePageHeaderProps) => {
  return (
    <header className="project-create-page__intro">
      {showBack && backLabel && onBack ? (
        <button type="button" className="project-create-page__back" onClick={onBack}>
          {backLabel}
        </button>
      ) : null}
      <h1 className="project-create-page__title">{title}</h1>
      {contextLine ? <p className="project-create-page__meta">{contextLine}</p> : null}
    </header>
  );
};

export default ProjectCreatePageHeader;
