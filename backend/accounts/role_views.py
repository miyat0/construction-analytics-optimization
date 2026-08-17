from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import Role
from .permissions import IsCompanyAdministrator
from .responses import error_response, success_response


class RoleListView(APIView):
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
                message="Only Company Administrator can access roles.",
                errors={"permission": ["Only Company Administrator can access roles."]},
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="permission_denied",
            )

        return super().handle_exception(exc)

    def get(self, request):
        roles = [
            {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
            }
            for role in Role.objects.order_by("role_name")
        ]

        return success_response(
            message="Roles retrieved successfully.",
            data={
                "count": len(roles),
                "results": roles,
            },
        )
