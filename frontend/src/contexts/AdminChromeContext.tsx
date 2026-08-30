import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminPrimaryAction = {
  label: string;
  onClick: () => void;
};

type AdminChromeContextValue = {
  primaryAction: AdminPrimaryAction | null;
  setPrimaryAction: (action: AdminPrimaryAction | null) => void;
  /** Muted breadcrumb shown in the top app bar (create flows). */
  topbarBreadcrumb: string | null;
  setTopbarBreadcrumb: (breadcrumb: string | null) => void;
  /** Explicit page title for workspace modules (e.g. Worker pages). */
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
};

const AdminChromeContext = createContext<AdminChromeContextValue | null>(null);

export const AdminChromeProvider = ({ children }: { children: ReactNode }) => {
  const [primaryAction, setPrimaryActionState] = useState<AdminPrimaryAction | null>(
    null,
  );
  const [topbarBreadcrumb, setTopbarBreadcrumbState] = useState<string | null>(null);
  const [pageTitle, setPageTitleState] = useState<string | null>(null);

  const setPrimaryAction = useCallback((action: AdminPrimaryAction | null) => {
    setPrimaryActionState(action);
  }, []);

  const setTopbarBreadcrumb = useCallback((breadcrumb: string | null) => {
    setTopbarBreadcrumbState(breadcrumb);
  }, []);

  const setPageTitle = useCallback((title: string | null) => {
    setPageTitleState(title);
  }, []);

  const value = useMemo(
    () => ({
      primaryAction,
      setPrimaryAction,
      topbarBreadcrumb,
      setTopbarBreadcrumb,
      pageTitle,
      setPageTitle,
    }),
    [
      primaryAction,
      setPrimaryAction,
      topbarBreadcrumb,
      setTopbarBreadcrumb,
      pageTitle,
      setPageTitle,
    ],
  );

  return (
    <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>
  );
};

export const useAdminChrome = (): AdminChromeContextValue => {
  const context = useContext(AdminChromeContext);

  if (!context) {
    throw new Error("useAdminChrome must be used within AdminChromeProvider.");
  }

  return context;
};

export const useOptionalAdminChrome = (): AdminChromeContextValue | null => {
  return useContext(AdminChromeContext);
};

/** Sets the top app bar breadcrumb for project create pages; clears on unmount. */
export const useProjectCreateChrome = (breadcrumb: string | null) => {
  const chrome = useOptionalAdminChrome();
  const setTopbarBreadcrumb = chrome?.setTopbarBreadcrumb;

  useEffect(() => {
    if (!setTopbarBreadcrumb) {
      return;
    }

    setTopbarBreadcrumb(breadcrumb);
    return () => {
      setTopbarBreadcrumb(null);
    };
  }, [breadcrumb, setTopbarBreadcrumb]);
};

/** Sets the workspace page title in the shared top bar; clears on unmount. */
export const useWorkspacePageTitle = (title: string | null) => {
  const chrome = useOptionalAdminChrome();
  const setPageTitle = chrome?.setPageTitle;

  useEffect(() => {
    if (!setPageTitle) {
      return;
    }

    setPageTitle(title);
    return () => {
      setPageTitle(null);
    };
  }, [title, setPageTitle]);
};
