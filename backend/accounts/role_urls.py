from django.urls import path

from .role_views import RoleListView

urlpatterns = [
    path("", RoleListView.as_view(), name="role-list"),
]
