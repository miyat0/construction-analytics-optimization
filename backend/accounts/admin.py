from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import LoginAccountChangeForm, LoginAccountCreationForm
from .models import LoginAccount, Role, UserProfile


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("role_id", "role_name", "created_at", "updated_at")
    search_fields = ("role_name",)
    ordering = ("role_name",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user_id",
        "name",
        "email",
        "phone_number",
        "role",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = ("role", "status")
    search_fields = ("name", "email", "phone_number")
    ordering = ("name",)


@admin.register(LoginAccount)
class LoginAccountAdmin(UserAdmin):
    add_form = LoginAccountCreationForm
    form = LoginAccountChangeForm
    model = LoginAccount
    list_display = (
        "login_id",
        "email",
        "user",
        "is_active",
        "is_staff",
        "last_login",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "groups")
    search_fields = ("email", "user__name", "user__email")
    ordering = ("email",)
    readonly_fields = ("last_login", "created_at", "updated_at")
    fieldsets = (
        ("Authentication", {"fields": ("email", "password")}),
        ("Linked User", {"fields": ("user",)}),
        (
            "Access",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important Dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            "Create Login Account",
            {
                "classes": ("wide",),
                "fields": ("user", "email", "password1", "password2", "is_active", "is_staff"),
            },
        ),
    )
