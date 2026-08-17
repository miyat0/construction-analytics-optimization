from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework import status
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import LoginAccount, UserProfile


class AuthenticationServiceError(Exception):
    def __init__(self, message, error_code, status_code, errors=None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.errors = errors or {}


class AuthenticationService:
    @staticmethod
    def _get_login_account(login_id):
        try:
            return LoginAccount.objects.select_related("user__role").get(pk=login_id)
        except LoginAccount.DoesNotExist as exc:
            raise AuthenticationServiceError(
                message="Authentication account was not found.",
                error_code="account_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"account": ["Authentication account was not found."]},
            ) from exc

    @staticmethod
    def _ensure_account_is_active(login_account):
        if not login_account.is_active:
            raise AuthenticationServiceError(
                message="This login account is inactive.",
                error_code="inactive_login_account",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"account": ["This login account is inactive."]},
            )

        if login_account.user.status != UserProfile.STATUS_ACTIVE:
            raise AuthenticationServiceError(
                message="This user profile is not active.",
                error_code="inactive_user_profile",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"user": ["This user profile is not active."]},
            )

    @staticmethod
    def _build_user_payload(login_account):
        profile = login_account.user
        role = profile.role

        return {
            "login_id": login_account.login_id,
            "user_id": profile.user_id,
            "name": profile.name,
            "email": profile.email,
            "login_email": login_account.email,
            "phone_number": profile.phone_number,
            "status": profile.status,
            "is_active": login_account.is_active,
            "role": {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
            },
        }

    @staticmethod
    def _build_token_payload(refresh_token):
        token_payload = {
            "access": str(refresh_token.access_token),
        }

        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    refresh_token.blacklist()
                except AttributeError:
                    pass

            refresh_token.set_jti()
            refresh_token.set_exp()
            refresh_token.set_iat()

        token_payload["refresh"] = str(refresh_token)
        return token_payload

    @classmethod
    def login(cls, *, email, password, request=None):
        login_account = authenticate(request=request, email=email, password=password)

        if login_account is None:
            raise AuthenticationServiceError(
                message="Invalid email or password.",
                error_code="invalid_credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
                errors={"credentials": ["Invalid email or password."]},
            )

        login_account = cls._get_login_account(login_account.pk)
        cls._ensure_account_is_active(login_account)

        refresh_token = RefreshToken.for_user(login_account)
        update_last_login(None, login_account)

        return {
            "tokens": {
                "access": str(refresh_token.access_token),
                "refresh": str(refresh_token),
            },
            "user": cls._build_user_payload(login_account),
        }

    @classmethod
    def refresh(cls, *, refresh):
        try:
            refresh_token = RefreshToken(refresh)
        except TokenError as exc:
            raise AuthenticationServiceError(
                message="Invalid or expired refresh token.",
                error_code="invalid_refresh_token",
                status_code=status.HTTP_401_UNAUTHORIZED,
                errors={"refresh": ["Invalid or expired refresh token."]},
            ) from exc

        login_account = cls._get_login_account(refresh_token["user_id"])
        cls._ensure_account_is_active(login_account)

        return {
            "tokens": cls._build_token_payload(refresh_token),
            "user": cls._build_user_payload(login_account),
        }

    @staticmethod
    def logout(*, refresh):
        try:
            refresh_token = RefreshToken(refresh)
            refresh_token.blacklist()
        except TokenError as exc:
            raise AuthenticationServiceError(
                message="Invalid or expired refresh token.",
                error_code="invalid_refresh_token",
                status_code=status.HTTP_401_UNAUTHORIZED,
                errors={"refresh": ["Invalid or expired refresh token."]},
            ) from exc

        return {"logged_out": True}
