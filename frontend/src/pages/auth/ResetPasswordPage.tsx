import { useMemo, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { resetPasswordRequest } from "../../services/authApi";

import type { ApiErrorResponse } from "../../types/auth";

import "./LoginPage.css";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const hasValidLink = useMemo(() => Boolean(uid && token), [token, uid]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setPasswordError(null);
    setConfirmError(null);
    setIsSuccess(false);

    if (!hasValidLink) {
      setServerMessage("This password reset link is invalid or incomplete.");
      return;
    }

    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
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
        const passwordMessages = errors.password;
        const confirmMessages = errors.confirm_password;
        const tokenMessages = errors.token;

        if (Array.isArray(passwordMessages) && passwordMessages[0]) {
          setPasswordError(String(passwordMessages[0]));
        } else if (typeof passwordMessages === "string") {
          setPasswordError(passwordMessages);
        }

        if (Array.isArray(confirmMessages) && confirmMessages[0]) {
          setConfirmError(String(confirmMessages[0]));
        } else if (typeof confirmMessages === "string") {
          setConfirmError(confirmMessages);
        }

        setServerMessage(
          (Array.isArray(tokenMessages) ? tokenMessages[0] : undefined) ??
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
            Choose a new password for your FORTESITE account.
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
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={`form-control login-page__form-control${
                  passwordError ? " is-invalid" : ""
                }`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {passwordError ? (
                <div className="login-page__form-error">{passwordError}</div>
              ) : null}
            </div>

            <div className="login-page__field">
              <label className="login-page__form-label" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className={`form-control login-page__form-control${
                  confirmError ? " is-invalid" : ""
                }`}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {confirmError ? (
                <div className="login-page__form-error">{confirmError}</div>
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
