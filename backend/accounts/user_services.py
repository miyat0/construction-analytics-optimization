from django.db import transaction
from django.db.models import Q
from rest_framework import status

from .models import LoginAccount, UserProfile
from .permissions import COMPANY_ADMIN_ROLE_NAME


class UserManagementServiceError(Exception):
    def __init__(self, message, error_code, status_code, errors=None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.errors = errors or {}


class UserManagementService:
    @staticmethod
    def _base_queryset():
        return UserProfile.objects.select_related("role", "login_account").order_by("name", "user_id")

    @classmethod
    def _get_profile(cls, user_id):
        try:
            return cls._base_queryset().get(pk=user_id)
        except UserProfile.DoesNotExist as exc:
            raise UserManagementServiceError(
                message="User was not found.",
                error_code="user_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"user": ["User was not found."]},
            ) from exc

    @staticmethod
    def _get_login_account(profile):
        try:
            return profile.login_account
        except LoginAccount.DoesNotExist:
            return None

    @classmethod
    def _require_login_account(cls, profile, action):
        login_account = cls._get_login_account(profile)

        if login_account is None:
            raise UserManagementServiceError(
                message=f"Cannot {action} this user because the login account does not exist.",
                error_code="missing_login_account",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"account": [f"Cannot {action} this user because the login account does not exist."]},
            )

        return login_account

    @staticmethod
    def _should_be_staff(profile):
        return profile.role.role_name == COMPANY_ADMIN_ROLE_NAME

    @classmethod
    def _build_user_payload(cls, profile):
        login_account = cls._get_login_account(profile)
        role = profile.role

        return {
            "user_id": profile.user_id,
            "login_id": login_account.login_id if login_account else None,
            "name": profile.name,
            "email": profile.email,
            "login_email": login_account.email if login_account else None,
            "phone_number": profile.phone_number,
            "status": profile.status,
            "is_active": login_account.is_active if login_account else False,
            "has_login_account": login_account is not None,
            "role": {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
            },
            "last_login": login_account.last_login.isoformat() if login_account and login_account.last_login else None,
            "created_at": profile.created_at.isoformat(),
            "updated_at": profile.updated_at.isoformat(),
        }

    @classmethod
    def list_users(cls, *, search=None, role_id=None, role_name=None):
        queryset = cls._base_queryset()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(role__role_name__icontains=search)
                | Q(login_account__email__icontains=search)
            ).distinct()

        if role_id:
            queryset = queryset.filter(role_id=role_id)

        if role_name:
            queryset = queryset.filter(role__role_name__iexact=role_name)

        users = [cls._build_user_payload(profile) for profile in queryset]

        return {
            "count": len(users),
            "results": users,
        }

    @classmethod
    def get_user(cls, *, user_id):
        profile = cls._get_profile(user_id)
        return cls._build_user_payload(profile)

    @classmethod
    @transaction.atomic
    def create_user(cls, *, name, email, phone_number, role_id, password):
        profile = UserProfile.objects.create(
            name=name,
            email=email,
            phone_number=phone_number,
            role=role_id,
            status=UserProfile.STATUS_ACTIVE,
        )

        LoginAccount.objects.create_user(
            user=profile,
            email=email,
            password=password,
            is_active=True,
            is_staff=role_id.role_name == COMPANY_ADMIN_ROLE_NAME,
        )

        profile = cls._get_profile(profile.user_id)
        return cls._build_user_payload(profile)

    @classmethod
    @transaction.atomic
    def update_user(cls, *, user_id, **validated_data):
        profile = cls._get_profile(user_id)
        login_account = cls._get_login_account(profile)

        if "name" in validated_data:
            profile.name = validated_data["name"]

        if "phone_number" in validated_data:
            profile.phone_number = validated_data["phone_number"]

        if "role_id" in validated_data:
            profile.role = validated_data["role_id"]

        if "email" in validated_data:
            profile.email = validated_data["email"]
            if login_account is not None:
                login_account.email = validated_data["email"]

        profile.save()

        password = validated_data.get("password")

        if login_account is None and password:
            login_account = LoginAccount.objects.create_user(
                user=profile,
                email=profile.email,
                password=password,
                is_active=profile.status == UserProfile.STATUS_ACTIVE,
                is_staff=cls._should_be_staff(profile),
            )
        elif login_account is not None:
            login_account.is_staff = cls._should_be_staff(profile)

            if "email" in validated_data:
                login_account.email = profile.email

            if password:
                login_account.set_password(password)

            login_account.save()

        profile = cls._get_profile(profile.user_id)
        return cls._build_user_payload(profile)

    @classmethod
    @transaction.atomic
    def delete_user(cls, *, user_id):
        profile = cls._get_profile(user_id)
        deleted_user_id = profile.user_id
        profile.delete()

        return {
            "deleted": True,
            "user_id": deleted_user_id,
        }

    @classmethod
    @transaction.atomic
    def activate_user(cls, *, user_id):
        profile = cls._get_profile(user_id)
        login_account = cls._require_login_account(profile, "activate")

        profile.status = UserProfile.STATUS_ACTIVE
        profile.save(update_fields=["status", "updated_at"])

        login_account.is_active = True
        login_account.is_staff = cls._should_be_staff(profile)
        login_account.save(update_fields=["is_active", "is_staff", "updated_at"])

        profile = cls._get_profile(profile.user_id)
        return cls._build_user_payload(profile)

    @classmethod
    @transaction.atomic
    def deactivate_user(cls, *, user_id):
        profile = cls._get_profile(user_id)
        login_account = cls._require_login_account(profile, "deactivate")

        profile.status = UserProfile.STATUS_INACTIVE
        profile.save(update_fields=["status", "updated_at"])

        login_account.is_active = False
        login_account.save(update_fields=["is_active", "updated_at"])

        profile = cls._get_profile(profile.user_id)
        return cls._build_user_payload(profile)
