import { useMemo, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import { resetPasswordRequest } from "../../services/authApi";
import { validatePasswordConfirmFields } from "../../utils/formValidation";

import type { ApiErrorResponse } from "../../types/auth";

import "./LoginPage.css";

const LockIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 22 22" width="18">
    <path
      d="M7 9V7.3A4 4 0 0 1 11 3.5a4 4 0 0 1 4 3.8V9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
    <rect
      x="5"
      y="9"
      width="12"
      height="10"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 22 22" width="18">
    <path
      d="M2.8 11s3-5 8.2-5 8.2 5 8.2 5-3 5-8.2 5-8.2-5-8.2-5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <circle cx="11" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    {visible ? null : (
      <path
        d="m4 18 14-14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    )}
  </svg>
);

const getErrorMessage = (value?: string | string[]): string | undefined => {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
};

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { fieldErrors, touchAndValidate, validateSubmit, setFieldErrors } =
    useLiveFieldValidation();

  const hasValidLink = useMemo(() => Boolean(uid && token), [token, uid]);

  const validateWith = (overrides: { password?: string; confirmPassword?: string } = {}) =>
    validatePasswordConfirmFields(
      overrides.password ?? password,
      overrides.confirmPassword ?? confirmPassword,
    );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setIsSuccess(false);

    if (!hasValidLink) {
      setServerMessage("This password reset link is invalid or incomplete.");
      return;
    }

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await resetPasswordRequest({
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      });
      setIsSuccess(true);
      setServerMessage(message);
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const errors = error.response?.data?.errors ?? {};
        const nextFieldErrors: Record<string, string> = {};
        const passwordMessage = getErrorMessage(errors.password);
        const confirmMessage = getErrorMessage(errors.confirm_password);
        const tokenMessage = getErrorMessage(errors.token);

        if (passwordMessage) {
          nextFieldErrors.password = passwordMessage;
        }
        if (confirmMessage) {
          nextFieldErrors.confirm_password = confirmMessage;
        }

        setFieldErrors(nextFieldErrors);

        setServerMessage(
          tokenMessage ??
            error.response?.data?.message ??
            "Unable to reset the password right now.",
        );
      } else {
        setServerMessage("Unable to reset the password right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      contentClassName="login-page__content"
      visualFooter={
        <Link className="auth-split-layout__return-link" to="/login">
          Back to Login
        </Link>
      }
    >
      <div className="login-page__card">
        <header className="login-page__card-header">
          <h2 className="login-page__heading">Reset password</h2>
          <p className="login-page__subtitle">
            Use at least 8 characters with uppercase, lowercase, a number, and a special
            character.
          </p>
        </header>

        {!hasValidLink ? (
          <div className="login-page__alert" role="alert">
            This reset link is missing required details. Request a new one from the login page.
          </div>
        ) : null}

        {serverMessage ? (
          <div
            className={`login-page__alert${isSuccess ? " login-page__alert--success" : ""}`}
            role="alert"
          >
            {serverMessage}
          </div>
        ) : null}

        {isSuccess ? (
          <button
            type="button"
            className="btn w-100 login-page__submit"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to login
          </button>
        ) : hasValidLink ? (
          <form className="login-page__form" noValidate onSubmit={(event) => void onSubmit(event)}>
            <div className="login-page__field">
              <label className="login-page__form-label" htmlFor="new-password">
                New password
              </label>
              <div
                className={`login-page__input-group${
                  fieldErrors.password ? " login-page__input-group--error" : ""
                }`}
              >
                <span className="login-page__icon-shell" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="new-password"
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`form-control login-page__form-control${
                    fieldErrors.password ? " is-invalid" : ""
                  }`}
                  value={password}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPassword(value);
                    touchAndValidate(["password", "confirm_password"], () =>
                      validateWith({ password: value }),
                    );
                  }}
                  onBlur={() =>
                    touchAndValidate(["password", "confirm_password"], () => validateWith())
                  }
                />
                <button
                  type="button"
                  className="login-page__password-toggle"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                >
                  <EyeIcon visible={isPasswordVisible} />
                </button>
              </div>
              {fieldErrors.password ? (
                <div className="login-page__form-error">{fieldErrors.password}</div>
              ) : null}
            </div>

            <div className="login-page__field">
              <label className="login-page__form-label" htmlFor="confirm-password">
                Confirm password
              </label>
              <div
                className={`login-page__input-group${
                  fieldErrors.confirm_password ? " login-page__input-group--error" : ""
                }`}
              >
                <span className="login-page__icon-shell" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="confirm-password"
                  type={isConfirmVisible ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  aria-invalid={Boolean(fieldErrors.confirm_password)}
                  className={`form-control login-page__form-control${
                    fieldErrors.confirm_password ? " is-invalid" : ""
                  }`}
                  value={confirmPassword}
                  onChange={(event) => {
                    const value = event.target.value;
                    setConfirmPassword(value);
                    touchAndValidate(["password", "confirm_password"], () =>
                      validateWith({ confirmPassword: value }),
                    );
                  }}
                  onBlur={() =>
                    touchAndValidate(["password", "confirm_password"], () => validateWith())
                  }
                />
                <button
                  type="button"
                  className="login-page__password-toggle"
                  aria-label={isConfirmVisible ? "Hide password" : "Show password"}
                  onClick={() => setIsConfirmVisible((visible) => !visible)}
                >
                  <EyeIcon visible={isConfirmVisible} />
                </button>
              </div>
              {fieldErrors.confirm_password ? (
                <div className="login-page__form-error">{fieldErrors.confirm_password}</div>
              ) : null}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn w-100 login-page__submit">
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : (
          <Link className="auth-split-layout__message-action" to="/forgot-password">
            Request a new reset link
          </Link>
        )}

        <p className="login-page__support-note">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default ResetPasswordPage;
