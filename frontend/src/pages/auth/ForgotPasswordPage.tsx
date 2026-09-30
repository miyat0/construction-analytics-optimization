import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";

import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { useLiveFieldValidation } from "../../hooks/useLiveFieldValidation";
import { forgotPasswordRequest } from "../../services/authApi";
import { validateEmailField } from "../../utils/formValidation";

import type { ApiErrorResponse } from "../../types/auth";

import "./LoginPage.css";

const MailIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 22 22" width="18">
    <rect
      x="3"
      y="4"
      width="16"
      height="14"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="m4.8 6.3 5.1 4.1a1.8 1.8 0 0 0 2.2 0l5.1-4.1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetPath, setResetPath] = useState<string | null>(null);
  const { fieldErrors, touchAndValidate, validateSubmit, setFieldErrors, resetFieldValidation } =
    useLiveFieldValidation();

  const validateWith = (emailValue = email): Record<string, string> => {
    const message = validateEmailField(emailValue, {
      blankMessage: "Enter your account email.",
    });
    return message ? { email: message } : {};
  };

  const resetFormState = () => {
    setIsSuccess(false);
    setServerMessage(null);
    setResetPath(null);
    resetFieldValidation();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setResetPath(null);
    setIsSuccess(false);

    const nextErrors = validateSubmit(() => validateWith());
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const trimmed = email.trim();
    setIsSubmitting(true);
    try {
      const result = await forgotPasswordRequest(trimmed);
      setIsSuccess(true);
      setServerMessage(result.message);
      if (result.data?.reset_path) {
        setResetPath(result.data.reset_path);
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const emailError = error.response?.data?.errors?.email;
        const message = Array.isArray(emailError) ? emailError[0] : emailError;
        if (typeof message === "string") {
          setFieldErrors({ email: message });
        } else {
          setFieldErrors({});
        }
        setServerMessage(
          error.response?.data?.message ?? "Unable to start password reset right now.",
        );
      } else {
        setServerMessage("Unable to start password reset right now. Please try again.");
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
          <h2 className="login-page__heading">Forgot password</h2>
          <p className="login-page__subtitle">
            Enter your account email and we will help you set a new password.
          </p>
        </header>

        {serverMessage ? (
          <div
            className={`login-page__alert${isSuccess ? " login-page__alert--success" : ""}`}
            role="alert"
          >
            {serverMessage}
          </div>
        ) : null}

        {isSuccess && resetPath ? (
          <div className="login-page__dev-reset">
            <p>
              Local development link (email is printed in the backend console as well):
            </p>
            <Link className="btn w-100 login-page__submit" to={resetPath}>
              Continue to reset password
            </Link>
          </div>
        ) : null}

        {isSuccess && !resetPath ? (
          <button type="button" className="btn w-100 login-page__submit" onClick={resetFormState}>
            Try another email
          </button>
        ) : null}

        {!isSuccess ? (
          <form className="login-page__form" noValidate onSubmit={(event) => void onSubmit(event)}>
            <div className="login-page__field">
              <label className="login-page__form-label" htmlFor="forgot-email">
                Email
              </label>
              <div
                className={`login-page__input-group${
                  fieldErrors.email ? " login-page__input-group--error" : ""
                }`}
              >
                <span className="login-page__icon-shell" aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`form-control login-page__form-control${
                    fieldErrors.email ? " is-invalid" : ""
                  }`}
                  value={email}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEmail(value);
                    touchAndValidate("email", () => validateWith(value));
                  }}
                  onBlur={() => touchAndValidate("email", () => validateWith())}
                />
              </div>
              {fieldErrors.email ? (
                <div className="login-page__form-error">{fieldErrors.email}</div>
              ) : null}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn w-100 login-page__submit">
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        ) : null}

        <p className="login-page__support-note">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default ForgotPasswordPage;
