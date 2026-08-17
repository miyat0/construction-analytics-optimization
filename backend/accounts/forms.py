from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import LoginAccount


class LoginAccountCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Password", strip=False, widget=forms.PasswordInput)
    password2 = forms.CharField(
        label="Password confirmation",
        strip=False,
        widget=forms.PasswordInput,
    )

    class Meta:
        model = LoginAccount
        fields = ("user", "email", "is_active", "is_staff")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")

        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords do not match.")

        return password2

    def save(self, commit=True):
        login_account = super().save(commit=False)
        login_account.set_password(self.cleaned_data["password1"])

        if commit:
            login_account.save()

        return login_account


class LoginAccountChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        help_text=(
            "Raw passwords are not stored, so there is no way to view this "
            "user's password."
        )
    )

    class Meta:
        model = LoginAccount
        fields = "__all__"

    def clean_password(self):
        return self.initial["password"]
