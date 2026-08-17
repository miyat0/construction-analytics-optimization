from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .responses import error_response, success_response
from .serializers import LoginSerializer, LogoutSerializer, RefreshSerializer
from .services import AuthenticationService, AuthenticationServiceError


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Login request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            login_data = AuthenticationService.login(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
                request=request,
            )
        except AuthenticationServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected authentication error occurred during login.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="authentication_error",
            )

        return success_response(message="Login successful.", data=login_data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Logout request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            logout_data = AuthenticationService.logout(refresh=serializer.validated_data["refresh"])
        except AuthenticationServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected authentication error occurred during logout.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="authentication_error",
            )

        return success_response(message="Logout successful.", data=logout_data)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Refresh request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            refresh_data = AuthenticationService.refresh(refresh=serializer.validated_data["refresh"])
        except AuthenticationServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected authentication error occurred during token refresh.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="authentication_error",
            )

        return success_response(message="Token refreshed successfully.", data=refresh_data)
