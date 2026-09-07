import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";

import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { forgotPasswordRequest } from "../../services/authApi";

import type { ApiErrorResponse } from "../../types/auth";

import "./LoginPage.css";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetPath, setResetPath] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setFieldError(null);
    setResetPath(null);
    setIsSuccess(false);

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Enter your account email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forgotPasswordRequest(trimmed);
      setIsSuccess(true);
      setServerMessage(result.message);
      if (result.data.reset_path) {
        setResetPath(result.data.reset_path);
      }
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const emailError = error.response?.data?.errors?.email;
        const message = Array.isArray(emailError) ? emailError[0] : emailError;
        setFieldError(typeof message === "string" ? message : null);
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
            <button
              type="button"
              className="btn w-100 login-page__submit"
              onClick={() => navigate(resetPath)}
            >
              Continue to reset password
            </button>
          </div>
        ) : null}

        {!isSuccess ? (
          <form className="login-page__form" noValidate onSubmit={(event) => void onSubmit(event)}>
            <div className="login-page__field">
              <label className="login-page__form-label" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className={`form-control login-page__form-control${
                  fieldError ? " is-invalid" : ""
                }`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {fieldError ? <div className="login-page__form-error">{fieldError}</div> : null}
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
