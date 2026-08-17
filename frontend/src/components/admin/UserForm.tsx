import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type Resolver } from "react-hook-form";
import { Link } from "react-router-dom";

import { getDefaultUserFormValues, getUserFormSchema } from "./userFormSchema";

import type { ApiErrorResponse } from "../../types/auth";
import type { RoleOption, UserFormValues } from "../../types/userManagement";

import "./UserForm.css";

interface UserFormProps {
  mode: "create" | "edit";
  roles: RoleOption[];
  initialValues?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => Promise<void>;
  submitLabel: string;
  busyLabel: string;
  cancelTo?: string;
  onCancel?: () => void;
  formKey?: string | number;
}

const getFirstErrorMessage = (
  value?: string | string[],
): string | undefined => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

const USER_FORM_FIELDS: Array<keyof UserFormValues> = [
  "name",
  "email",
  "phone_number",
  "role_id",
  "password",
];

export const UserForm = ({
  mode,
  roles,
  initialValues,
  onSubmit,
  submitLabel,
  busyLabel,
  cancelTo = "/admin/users",
  onCancel,
  formKey,
}: UserFormProps) => {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const defaultValues = useMemo(() => {
    return {
      ...getDefaultUserFormValues(),
      ...initialValues,
      password: initialValues?.password ?? "",
    };
  }, [initialValues]);

  const resolver = yupResolver(
    getUserFormSchema(mode),
  ) as unknown as Resolver<UserFormValues>;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    defaultValues,
    resolver,
  });

  useEffect(() => {
    reset(defaultValues);
    setIsPasswordVisible(false);
    setServerMessage(null);
  }, [defaultValues, formKey, reset]);

  const handleApiErrors = (apiError?: ApiErrorResponse) => {
    let mappedFieldError = false;

    USER_FORM_FIELDS.forEach((fieldName) => {
      const message = getFirstErrorMessage(apiError?.errors?.[fieldName]);

      if (!message) {
        return;
      }

      mappedFieldError = true;
      setError(fieldName, { type: "server", message });
    });

    setServerMessage(
      apiError?.message ??
        (mappedFieldError
          ? "Please review the highlighted fields and try again."
          : "Unable to save the user right now."),
    );
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    setServerMessage(null);

    try {
      await onSubmit(values);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        handleApiErrors(error.response?.data);
        return;
      }

      setServerMessage("Unable to save the user right now. Please try again.");
    }
  };

  return (
    <div className="user-form">
      <div className="user-form__surface">
        {serverMessage ? (
          <div className="alert alert-danger" role="alert">
            {serverMessage}
          </div>
        ) : null}

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="row g-4">
            <div className="col-md-6">
              <label className="user-form__label" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className={`form-control user-form__control ${errors.name ? "is-invalid" : ""}`}
                placeholder="Enter full name"
                {...register("name")}
              />
              {errors.name?.message ? (
                <div className="user-form__error">{errors.name.message}</div>
              ) : null}
            </div>

            <div className="col-md-6">
              <label className="user-form__label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={`form-control user-form__control ${errors.email ? "is-invalid" : ""}`}
                placeholder="name@company.com"
                {...register("email")}
              />
              {errors.email?.message ? (
                <div className="user-form__error">{errors.email.message}</div>
              ) : null}
            </div>

            <div className="col-md-6">
              <label className="user-form__label" htmlFor="phone_number">
                Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                className={`form-control user-form__control ${errors.phone_number ? "is-invalid" : ""}`}
                placeholder="Enter 10-digit phone number"
                {...register("phone_number")}
              />
              {errors.phone_number?.message ? (
                <div className="user-form__error">{errors.phone_number.message}</div>
              ) : null}
            </div>

            <div className="col-md-6">
              <label className="user-form__label" htmlFor="role_id">
                Role
              </label>
              <select
                id="role_id"
                className={`form-select user-form__select ${errors.role_id ? "is-invalid" : ""}`}
                {...register("role_id", {
                  setValueAs: (value) => {
                    return value === "" ? undefined : Number(value);
                  },
                })}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
              {errors.role_id?.message ? (
                <div className="user-form__error">{errors.role_id.message}</div>
              ) : null}
            </div>

            <div className="col-12">
              <label className="user-form__label" htmlFor="password">
                Password
              </label>
              <div className="user-form__password-field">
                <input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  className={`form-control user-form__control user-form__password-input ${errors.password ? "is-invalid" : ""}`}
                  placeholder={
                    mode === "create"
                      ? "Create a strong password"
                      : "Leave blank to keep the current password"
                  }
                  {...register("password")}
                />
                <button
                  type="button"
                  className="user-form__password-toggle"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                >
                  {isPasswordVisible ? "Hide" : "Show"}
                </button>
              </div>
              <div className="user-form__hint">
                Use at least 8 characters, including uppercase, lowercase, number,
                and special character.
              </div>
              {errors.password?.message ? (
                <div className="user-form__error">{errors.password.message}</div>
              ) : null}
            </div>
          </div>

          <div className="user-form__actions">
            {onCancel ? (
              <button
                type="button"
                className="user-form__secondary-action"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            ) : (
              <Link className="user-form__secondary-action" to={cancelTo}>
                Cancel
              </Link>
            )}
            <button type="submit" disabled={isSubmitting} className="user-form__submit">
              {isSubmitting ? busyLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
