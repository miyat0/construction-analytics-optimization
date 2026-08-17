from django.urls import path

from .user_views import (
    UserActivateView,
    UserDeactivateView,
    UserDetailView,
    UserListCreateView,
    UserRoleFilterView,
    UserSearchView,
)

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),
    path("search/", UserSearchView.as_view(), name="user-search"),
    path("filter-by-role/", UserRoleFilterView.as_view(), name="user-filter-by-role"),
    path("<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path("<int:user_id>/activate/", UserActivateView.as_view(), name="user-activate"),
    path("<int:user_id>/deactivate/", UserDeactivateView.as_view(), name="user-deactivate"),
]
