from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .permissions import IsCompanyAdministrator
from .responses import error_response, success_response
from .user_serializers import (
    UserCreateSerializer,
    UserListQuerySerializer,
    UserRoleFilterSerializer,
    UserSearchSerializer,
    UserUpdateSerializer,
)
from .user_services import UserManagementService, UserManagementServiceError


class CompanyAdminAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdministrator]

    def handle_exception(self, exc):
        if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            return error_response(
                message="Authentication credentials were not provided or are invalid.",
                errors={"authentication": ["Authentication credentials were not provided or are invalid."]},
                status_code=status.HTTP_401_UNAUTHORIZED,
                error_code="not_authenticated",
            )

        if isinstance(exc, PermissionDenied):
            return error_response(
                message="Only Company Administrator can manage users.",
                errors={"permission": ["Only Company Administrator can manage users."]},
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="permission_denied",
            )

        return super().handle_exception(exc)


class UserListCreateView(CompanyAdminAPIView):
    def get(self, request):
        serializer = UserListQuerySerializer(data=request.query_params)

        if not serializer.is_valid():
            return error_response(
                message="User list request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        users_data = UserManagementService.list_users(**serializer.validated_data)
        return success_response(message="Users retrieved successfully.", data=users_data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="User creation validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            user_data = UserManagementService.create_user(**serializer.validated_data)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while creating the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(
            message="User created successfully.",
            data=user_data,
            status_code=status.HTTP_201_CREATED,
        )


class UserDetailView(CompanyAdminAPIView):
    def get(self, request, user_id):
        try:
            user_data = UserManagementService.get_user(user_id=user_id)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while retrieving the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(message="User retrieved successfully.", data=user_data)

    def put(self, request, user_id):
        try:
            profile = UserManagementService._get_profile(user_id)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        serializer = UserUpdateSerializer(instance=profile, data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="User update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            user_data = UserManagementService.update_user(user_id=user_id, **serializer.validated_data)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while updating the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(message="User updated successfully.", data=user_data)

    def delete(self, request, user_id):
        try:
            result = UserManagementService.delete_user(user_id=user_id)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while deleting the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(message="User deleted successfully.", data=result)


class UserActivateView(CompanyAdminAPIView):
    def patch(self, request, user_id):
        try:
            user_data = UserManagementService.activate_user(user_id=user_id)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while activating the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(message="User activated successfully.", data=user_data)


class UserDeactivateView(CompanyAdminAPIView):
    def patch(self, request, user_id):
        try:
            user_data = UserManagementService.deactivate_user(user_id=user_id)
        except UserManagementServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except Exception:
            return error_response(
                message="An unexpected error occurred while deactivating the user.",
                errors={"server": ["Please try again later."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="user_management_error",
            )

        return success_response(message="User deactivated successfully.", data=user_data)


class UserSearchView(CompanyAdminAPIView):
    def get(self, request):
        serializer = UserSearchSerializer(data=request.query_params)

        if not serializer.is_valid():
            return error_response(
                message="User search validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        users_data = UserManagementService.list_users(search=serializer.validated_data["query"])
        return success_response(message="Users retrieved successfully.", data=users_data)


class UserRoleFilterView(CompanyAdminAPIView):
    def get(self, request):
        serializer = UserRoleFilterSerializer(data=request.query_params)

        if not serializer.is_valid():
            return error_response(
                message="Role filter validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        users_data = UserManagementService.list_users(**serializer.validated_data)
        return success_response(message="Users retrieved successfully.", data=users_data)
