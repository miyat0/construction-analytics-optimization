import { useCallback, useRef, useState } from "react";

/**
 * Live field validation: show errors after a field is touched (change/blur),
 * and show all errors after a failed submit. Errors clear as the user fixes them.
 */
export const useLiveFieldValidation = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const touchedRef = useRef(new Set<string>());
  const showAllRef = useRef(false);

  const syncVisibleErrors = useCallback((allErrors: Record<string, string>) => {
    if (showAllRef.current) {
      setFieldErrors(allErrors);
      return allErrors;
    }

    const visible: Record<string, string> = {};
    for (const [key, message] of Object.entries(allErrors)) {
      if (touchedRef.current.has(key)) {
        visible[key] = message;
      }
    }
    setFieldErrors(visible);
    return allErrors;
  }, []);

  const touchAndValidate = useCallback(
    (fields: string | string[], validate: () => Record<string, string>) => {
      const list = Array.isArray(fields) ? fields : [fields];
      list.forEach((field) => touchedRef.current.add(field));
      return syncVisibleErrors(validate());
    },
    [syncVisibleErrors],
  );

  const validateSubmit = useCallback((validate: () => Record<string, string>) => {
    showAllRef.current = true;
    const allErrors = validate();
    setFieldErrors(allErrors);
    return allErrors;
  }, []);

  const resetFieldValidation = useCallback(() => {
    touchedRef.current = new Set();
    showAllRef.current = false;
    setFieldErrors({});
  }, []);

  return {
    fieldErrors,
    touchAndValidate,
    validateSubmit,
    resetFieldValidation,
    setFieldErrors,
  };
};
