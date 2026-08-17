import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthSplitLayout } from "../../components/auth/AuthSplitLayout";
import { resolvePostLoginRoute } from "../../config/roleRoutes";
import { useAuth } from "../../hooks/useAuth";

import { loginSchema, type LoginFormValues } from "./loginSchema";

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

const getFirstErrorMessage = (
  value?: string | string[],
): string | undefined => {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, status, user } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const requestedPath = useMemo(() => {
    const routeState = location.state as
      | {
          from?: {
            pathname?: string;
          };
        }
      | undefined;

    return routeState?.from?.pathname ?? null;
  }, [location.state]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    resolver: yupResolver(loginSchema),
  });

  useEffect(() => {
    if (status === "authenticated" && isAuthenticated) {
      navigate(resolvePostLoginRoute(user?.role.role_name, requestedPath), {
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, requestedPath, status, user?.role.role_name]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerMessage(null);

    try {
      const session = await login(
        {
          email: values.email,
          password: values.password,
        },
        {
          rememberMe: values.rememberMe,
        },
      );

      navigate(
        resolvePostLoginRoute(session.user.role.role_name, requestedPath),
        { replace: true },
      );
    } catch (error) {
      if (isAxiosError<ApiErrorResponse>(error)) {
        const apiError = error.response?.data;
        const emailMessage = getFirstErrorMessage(
          apiError?.errors?.email as string | string[] | undefined,
        );
        const passwordMessage = getFirstErrorMessage(
          apiError?.errors?.password as string | string[] | undefined,
        );
        const credentialsMessage = getFirstErrorMessage(
          apiError?.errors?.credentials as string | string[] | undefined,
        );

        if (emailMessage) {
          setError("email", { type: "server", message: emailMessage });
        }

        if (passwordMessage) {
          setError("password", { type: "server", message: passwordMessage });
        }

        if (credentialsMessage) {
          setError("password", { type: "server", message: credentialsMessage });
        }

        setServerMessage(apiError?.message ?? "Unable to sign in right now.");
        return;
      }

      setServerMessage("Unable to sign in right now. Please try again.");
    }
  };

  return (
    <AuthSplitLayout contentClassName="login-page__content">
      <div className="login-page__card">
        <header className="login-page__card-header">
          <h2 className="login-page__heading">Login to your account</h2>
        </header>

        {serverMessage ? (
          <div className="login-page__alert" role="alert">
            {serverMessage}
          </div>
        ) : null}

        <form className="login-page__form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="login-page__field">
            <label className="login-page__form-label" htmlFor="email">
              Email
            </label>
            <div
              className={`login-page__input-group ${
                errors.email ? "login-page__input-group--error" : ""
              }`}
            >
              <span className="login-page__icon-shell" aria-hidden="true">
                <MailIcon />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                aria-invalid={Boolean(errors.email)}
                className={`form-control login-page__form-control ${
                  errors.email ? "is-invalid" : ""
                }`}
                {...register("email")}
              />
            </div>
            {errors.email?.message ? (
              <div className="login-page__form-error">{errors.email.message}</div>
            ) : null}
          </div>

          <div className="login-page__field">
            <label className="login-page__form-label" htmlFor="password">
              Password
            </label>
            <div
              className={`login-page__input-group ${
                errors.password ? "login-page__input-group--error" : ""
              }`}
            >
              <span className="login-page__icon-shell" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                id="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                className={`form-control login-page__form-control ${
                  errors.password ? "is-invalid" : ""
                }`}
                {...register("password")}
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
            {errors.password?.message ? (
              <div className="login-page__form-error">{errors.password.message}</div>
            ) : null}
          </div>

          <div className="login-page__remember-row">
            <div className="form-check login-page__remember">
              <input
                id="rememberMe"
                type="checkbox"
                className="form-check-input"
                {...register("rememberMe")}
              />
              <label className="form-check-label" htmlFor="rememberMe">
                Remember me
              </label>
            </div>
            <Link className="login-page__forgot-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 login-page__submit"
          >
            {isSubmitting ? (
              <span className="login-page__submit-loading">
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="login-page__support-note">
          Need access? Contact your Company Administrator.
        </p>
      </div>
    </AuthSplitLayout>
  );
};

export default LoginPage;
