from django.contrib.auth.base_user import BaseUserManager


class LoginAccountManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, user, email, password=None, **extra_fields):
        if user is None:
            raise ValueError("A linked user profile is required.")
        if not email:
            raise ValueError("An email address is required.")

        user_model = self.model._meta.get_field("user").remote_field.model
        if not isinstance(user, user_model):
            user = user_model.objects.get(pk=user)

        normalized_email = self.normalize_email(email)
        login_account = self.model(user=user, email=normalized_email, **extra_fields)
        login_account.set_password(password)
        login_account.save(using=self._db)
        return login_account

    def create_superuser(self, user, email, password=None, **extra_fields):
        if not password:
            raise ValueError("Superuser must have a password.")

        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(user=user, email=email, password=password, **extra_fields)
