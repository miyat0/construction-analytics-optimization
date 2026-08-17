const SELECTED_PROJECT_ID_KEY = "fortesite.selectedProjectId";

export const setSelectedProjectId = (projectId: number): void => {
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return;
  }
  sessionStorage.setItem(SELECTED_PROJECT_ID_KEY, String(projectId));
};

export const getSelectedProjectId = (): number | null => {
  const raw = sessionStorage.getItem(SELECTED_PROJECT_ID_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const clearSelectedProjectId = (): void => {
  sessionStorage.removeItem(SELECTED_PROJECT_ID_KEY);
};

export type SelectedProjectLocationState = {
  projectId?: number;
};
