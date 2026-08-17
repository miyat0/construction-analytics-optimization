from django.contrib import admin

from .models import AttendanceRecord, ManHourRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "attendance_id",
        "user",
        "attendance_date",
        "status",
        "clock_in_at",
        "clock_out_at",
    )
    list_filter = ("status", "attendance_date")
    search_fields = ("user__name", "user__email", "user__phone_number")
    ordering = ("-clock_in_at",)


@admin.register(ManHourRecord)
class ManHourRecordAdmin(admin.ModelAdmin):
    list_display = (
        "man_hour_id",
        "user",
        "work_date",
        "total_minutes",
        "total_hours",
    )
    list_filter = ("work_date",)
    search_fields = ("user__name", "user__email")
    ordering = ("-work_date",)
