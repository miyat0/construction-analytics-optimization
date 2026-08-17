import type { AuthSession, AuthTokens, AuthUser } from "../types/auth";

const STORAGE_KEYS = {
  accessToken: "construction.auth.access-token",
  refreshToken: "construction.auth.refresh-token",
  user: "construction.auth.user",
} as const;

const AUTH_STORAGE_EVENT = "construction:auth-storage-changed";

const isBrowser = typeof window !== "undefined";

const getLocalStorage = (): Storage | null => {
  if (!isBrowser) {
    return null;
  }

  return window.localStorage;
};

const getSessionStorage = (): Storage | null => {
  if (!isBrowser) {
    return null;
  }

  return window.sessionStorage;
};

const getAvailableStorages = (): Storage[] => {
  return [getLocalStorage(), getSessionStorage()].filter(
    (storage): storage is Storage => storage !== null,
  );
};

const emitStorageChange = (): void => {
  if (!isBrowser) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readStoredValue = (
  key: (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS],
): string | null => {
  for (const storage of getAvailableStorages()) {
    const value = storage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
};

const clearStoredKeys = (): void => {
  for (const storage of getAvailableStorages()) {
    storage.removeItem(STORAGE_KEYS.accessToken);
    storage.removeItem(STORAGE_KEYS.refreshToken);
    storage.removeItem(STORAGE_KEYS.user);
  }
};

const getAccessToken = (): string | null => {
  return readStoredValue(STORAGE_KEYS.accessToken);
};

const getRefreshToken = (): string | null => {
  return readStoredValue(STORAGE_KEYS.refreshToken);
};

const getUser = (): AuthUser | null => {
  return parseJson<AuthUser>(readStoredValue(STORAGE_KEYS.user));
};

const getTokens = (): AuthTokens | null => {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  if (!access || !refresh) {
    return null;
  }

  return {
    access,
    refresh,
  };
};

const getSession = (): AuthSession | null => {
  const tokens = getTokens();
  const user = getUser();

  if (!tokens || !user) {
    return null;
  }

  return {
    tokens,
    user,
  };
};

const shouldPersistSession = (): boolean => {
  const localStorage = getLocalStorage();

  if (!localStorage) {
    return true;
  }

  return Boolean(localStorage.getItem(STORAGE_KEYS.accessToken));
};

const setSession = (session: AuthSession, persist = true): void => {
  const storage = persist ? getLocalStorage() : getSessionStorage();

  if (!storage) {
    return;
  }

  clearStoredKeys();
  storage.setItem(STORAGE_KEYS.accessToken, session.tokens.access);
  storage.setItem(STORAGE_KEYS.refreshToken, session.tokens.refresh);
  storage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
  emitStorageChange();
};

const clearSession = (): void => {
  clearStoredKeys();
  emitStorageChange();
};

const subscribe = (listener: () => void): (() => void) => {
  if (!isBrowser) {
    return () => undefined;
  }

  const onStorageChange = (event: StorageEvent): void => {
    if (
      event.key === null ||
      event.key === STORAGE_KEYS.accessToken ||
      event.key === STORAGE_KEYS.refreshToken ||
      event.key === STORAGE_KEYS.user
    ) {
      listener();
    }
  };

  const onCustomStorageChange = (): void => {
    listener();
  };

  window.addEventListener("storage", onStorageChange);
  window.addEventListener(AUTH_STORAGE_EVENT, onCustomStorageChange);

  return () => {
    window.removeEventListener("storage", onStorageChange);
    window.removeEventListener(AUTH_STORAGE_EVENT, onCustomStorageChange);
  };
};

export const tokenStorage = {
  getAccessToken,
  getRefreshToken,
  getTokens,
  getUser,
  getSession,
  shouldPersistSession,
  setSession,
  clearSession,
  subscribe,
};
