from django.urls import path

from .views import (
    ForgotPasswordView,
    LoginView,
    LogoutView,
    RefreshView,
    ResetPasswordView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="auth-reset-password"),
]
