import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import LoginAccount, Role, UserProfile


PASSWORD_PATTERN_ERRORS = (
    (r"[A-Z]", "Password must contain at least one uppercase letter."),
    (r"[a-z]", "Password must contain at least one lowercase letter."),
    (r"[0-9]", "Password must contain at least one digit."),
    (r"[^A-Za-z0-9]", "Password must contain at least one special character."),
)
PHONE_NUMBER_PATTERN = r"^\d{10}$"
PHONE_NUMBER_ERROR_MESSAGE = "Phone number must contain exactly 10 digits."


def validate_strong_password(password):
    validate_password(password)

    for pattern, message in PASSWORD_PATTERN_ERRORS:
        if not re.search(pattern, password):
            raise serializers.ValidationError(message)

    return password


def normalize_phone_number(phone_number):
    normalized_phone = phone_number.strip()

    if not re.fullmatch(PHONE_NUMBER_PATTERN, normalized_phone):
        raise serializers.ValidationError(PHONE_NUMBER_ERROR_MESSAGE)

    return normalized_phone


class UserListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=False, max_length=150)
    role_id = serializers.IntegerField(required=False, min_value=1)
    role_name = serializers.CharField(required=False, allow_blank=False, max_length=100)


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=10)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        normalized_email = value.lower()

        if UserProfile.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        if LoginAccount.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A login account with this email already exists.")

        return normalized_email

    def validate_phone_number(self, value):
        normalized_phone = normalize_phone_number(value)

        if UserProfile.objects.filter(phone_number=normalized_phone).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")

        return normalized_phone

    def validate_password(self, value):
        return validate_strong_password(value)


class UserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(max_length=10, required=False)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=False)
    password = serializers.CharField(
        max_length=128,
        trim_whitespace=False,
        write_only=True,
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")

        return attrs

    def validate_email(self, value):
        normalized_email = value.lower()
        instance = self.instance
        current_login_account = None

        if instance is not None:
            try:
                current_login_account = instance.login_account
            except LoginAccount.DoesNotExist:
                current_login_account = None

        profile_queryset = UserProfile.objects.filter(email__iexact=normalized_email)
        login_queryset = LoginAccount.objects.filter(email__iexact=normalized_email)

        if instance is not None:
            profile_queryset = profile_queryset.exclude(pk=instance.pk)

        if current_login_account is not None:
            login_queryset = login_queryset.exclude(pk=current_login_account.pk)

        if profile_queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")

        if login_queryset.exists():
            raise serializers.ValidationError("A login account with this email already exists.")

        return normalized_email

    def validate_phone_number(self, value):
        normalized_phone = normalize_phone_number(value)
        instance = self.instance
        phone_queryset = UserProfile.objects.filter(phone_number=normalized_phone)

        if instance is not None:
            phone_queryset = phone_queryset.exclude(pk=instance.pk)

        if phone_queryset.exists():
            raise serializers.ValidationError("A user with this phone number already exists.")

        return normalized_phone

    def validate_password(self, value):
        return validate_strong_password(value)


class UserSearchSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=150, allow_blank=False)


class UserRoleFilterSerializer(serializers.Serializer):
    role_id = serializers.IntegerField(required=False, min_value=1)
    role_name = serializers.CharField(required=False, allow_blank=False, max_length=100)

    def validate(self, attrs):
        if not attrs.get("role_id") and not attrs.get("role_name"):
            raise serializers.ValidationError("Either role_id or role_name is required.")

        return attrs
