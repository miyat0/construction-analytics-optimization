import type { FormEvent, ReactNode } from "react";

interface PageToolbarProps {
  action?: ReactNode;
  filter?: ReactNode;
}

/** Shared admin list toolbar: primary action row + optional filter bar. */
export const PageToolbar = ({ action, filter }: PageToolbarProps) => {
  return (
    <div className="page-toolbar">
      {action ? <div className="page-toolbar__action">{action}</div> : null}
      {filter}
    </div>
  );
};

export type FilterBarOption = {
  value: string;
  label: string;
};

interface FilterBarProps {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  selectValue: string;
  selectAriaLabel: string;
  selectOptions: FilterBarOption[];
  onSelectChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}

/** Shared search + dropdown + Search/Reset controls for admin list pages. */
export const FilterBar = ({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  selectValue,
  selectAriaLabel,
  selectOptions,
  onSelectChange,
  onSubmit,
  onReset,
}: FilterBarProps) => {
  return (
    <form className="filter-bar" onSubmit={onSubmit}>
      <input
        type="search"
        className="admin-control filter-bar__input"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label={searchPlaceholder}
      />
      <select
        className="admin-control filter-bar__select"
        value={selectValue}
        onChange={(event) => onSelectChange(event.target.value)}
        aria-label={selectAriaLabel}
      >
        {selectOptions.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="filter-bar__actions">
        <button type="submit" className="admin-btn admin-btn--primary">
          Search
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={onReset}>
          Reset
        </button>
      </div>
    </form>
  );
};

export default PageToolbar;
