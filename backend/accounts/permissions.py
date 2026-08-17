from rest_framework.permissions import BasePermission

from .models import UserProfile


COMPANY_ADMIN_ROLE_NAME = "Company Administrator"
PROJECT_MANAGER_ROLE_NAME = "Project Manager"
SITE_ENGINEER_ROLE_NAME = "Site Engineer"
SUPERVISOR_ROLE_NAME = "Supervisor"
WORKER_ROLE_NAME = "Worker"
CLIENT_ROLE_NAME = "Client"

ALL_ROLE_NAMES = (
    COMPANY_ADMIN_ROLE_NAME,
    PROJECT_MANAGER_ROLE_NAME,
    SITE_ENGINEER_ROLE_NAME,
    SUPERVISOR_ROLE_NAME,
    WORKER_ROLE_NAME,
    CLIENT_ROLE_NAME,
)


def get_user_role_name(login_account):
    profile = getattr(login_account, "user", None)
    role = getattr(profile, "role", None)
    return getattr(role, "role_name", None)


def is_active_authorized_user(login_account):
    if not login_account or not getattr(login_account, "is_authenticated", False):
        return False

    profile = getattr(login_account, "user", None)
    role = getattr(profile, "role", None)

    if profile is None or role is None:
        return False

    return login_account.is_active and profile.status == UserProfile.STATUS_ACTIVE


def user_has_any_role(login_account, *allowed_roles):
    role_name = get_user_role_name(login_account)

    if role_name is None:
        return False

    return is_active_authorized_user(login_account) and role_name in allowed_roles


class RolePermission(BasePermission):
    allowed_roles = ()
    message = "You do not have permission to access this resource."

    def get_denied_message(self):
        if len(self.allowed_roles) == 1:
            return f"Only {self.allowed_roles[0]} can access this resource."

        return "You do not have permission to access this resource."

    def has_permission(self, request, view):
        login_account = request.user

        if not login_account or not getattr(login_account, "is_authenticated", False):
            return False

        profile = getattr(login_account, "user", None)
        role = getattr(profile, "role", None)

        if profile is None or role is None:
            self.message = "Your user profile is not configured correctly."
            return False

        if not login_account.is_active or profile.status != UserProfile.STATUS_ACTIVE:
            self.message = "Your account is inactive."
            return False

        if role.role_name not in self.allowed_roles:
            self.message = self.get_denied_message()
            return False

        return True


class IsCompanyAdministrator(RolePermission):
    allowed_roles = (COMPANY_ADMIN_ROLE_NAME,)
    message = "Only Company Administrator can access this resource."


class IsProjectManager(RolePermission):
    allowed_roles = (PROJECT_MANAGER_ROLE_NAME,)
    message = "Only Project Manager can access this resource."


class IsSiteEngineer(RolePermission):
    allowed_roles = (SITE_ENGINEER_ROLE_NAME,)
    message = "Only Site Engineer can access this resource."


class IsSupervisor(RolePermission):
    allowed_roles = (SUPERVISOR_ROLE_NAME,)
    message = "Only Supervisor can access this resource."


class IsWorker(RolePermission):
    allowed_roles = (WORKER_ROLE_NAME,)
    message = "Only Worker can access this resource."


class IsClient(RolePermission):
    allowed_roles = (CLIENT_ROLE_NAME,)
    message = "Only Client can access this resource."
