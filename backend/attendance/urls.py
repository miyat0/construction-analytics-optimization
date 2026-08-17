from django.urls import path

from .views import (
    WorkerAttendanceHistoryView,
    WorkerAttendanceStatusView,
    WorkerClockInView,
    WorkerClockOutView,
)

urlpatterns = [
    path("me/", WorkerAttendanceStatusView.as_view(), name="attendance-status"),
    path("clock-in/", WorkerClockInView.as_view(), name="attendance-clock-in"),
    path("clock-out/", WorkerClockOutView.as_view(), name="attendance-clock-out"),
    path("history/", WorkerAttendanceHistoryView.as_view(), name="attendance-history"),
    path("my-history/", WorkerAttendanceHistoryView.as_view(), name="attendance-my-history"),
]
