import { refreshTokenRequest } from "./authApi";
import { tokenStorage } from "./tokenStorage";

import type { AuthSession } from "../types/auth";

let activeRefreshPromise: Promise<AuthSession | null> | null = null;

const runRefresh = async (): Promise<AuthSession | null> => {
  const currentSession = tokenStorage.getSession();
  const refreshToken = currentSession?.tokens.refresh;

  if (!refreshToken) {
    tokenStorage.clearSession();
    return null;
  }

  try {
    const refreshedSession = await refreshTokenRequest(refreshToken);
    tokenStorage.setSession(
      refreshedSession,
      tokenStorage.shouldPersistSession(),
    );
    return refreshedSession;
  } catch {
    tokenStorage.clearSession();
    return null;
  }
};

export const refreshSession = async (): Promise<AuthSession | null> => {
  if (!activeRefreshPromise) {
    activeRefreshPromise = runRefresh().finally(() => {
      activeRefreshPromise = null;
    });
  }

  return activeRefreshPromise;
};
