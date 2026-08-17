from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import LoginAccountManager


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Role(TimeStampedModel):
    role_id = models.BigAutoField(primary_key=True)
    role_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "tbl_role"
        ordering = ("role_name",)

    def __str__(self):
        return self.role_name


class UserProfile(TimeStampedModel):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_SUSPENDED = "suspended"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_SUSPENDED, "Suspended"),
    )

    user_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        db_column="role_id",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    class Meta:
        db_table = "tbl_user"
        ordering = ("name",)

    def __str__(self):
        return self.name


class LoginAccount(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    login_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="login_account",
        db_column="user_id",
    )
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["user"]

    objects = LoginAccountManager()

    class Meta:
        db_table = "tbl_login"
        ordering = ("email",)

    def __str__(self):
        return self.email
