import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import {
  getSelectedProjectId,
  setSelectedProjectId,
  type SelectedProjectLocationState,
} from "./selectedProjectSession";

/**
 * Resolves the active project ID from navigation state or sessionStorage.
 * Never reads the project ID from the URL.
 */
export const useSelectedProjectId = (): number | null => {
  const location = useLocation();

  return useMemo(() => {
    const state = location.state as SelectedProjectLocationState | null;
    const fromState = state?.projectId;

    if (typeof fromState === "number" && Number.isFinite(fromState) && fromState > 0) {
      setSelectedProjectId(fromState);
      return fromState;
    }

    return getSelectedProjectId();
  }, [location.state, location.key]);
};
