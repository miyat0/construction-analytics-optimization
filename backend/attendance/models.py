from decimal import Decimal

from django.db import models

from accounts.models import TimeStampedModel, UserProfile


class AttendanceRecord(TimeStampedModel):
    STATUS_CLOCKED_IN = "clocked_in"
    STATUS_CLOCKED_OUT = "clocked_out"
    STATUS_CHOICES = (
        (STATUS_CLOCKED_IN, "Clocked In"),
        (STATUS_CLOCKED_OUT, "Clocked Out"),
    )

    attendance_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        db_column="user_id",
    )
    attendance_date = models.DateField()
    clock_in_at = models.DateTimeField()
    clock_out_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CLOCKED_IN,
    )
    task_assignment = models.ForeignKey(
        "projects.TaskWorkerAssignment",
        on_delete=models.SET_NULL,
        related_name="attendance_records",
        db_column="task_assignment_id",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "tbl_attendance"
        ordering = ("-clock_in_at", "-attendance_id")
        constraints = [
            models.UniqueConstraint(
                fields=("user",),
                condition=models.Q(status="clocked_in"),
                name="unique_open_attendance_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user.name} - {self.attendance_date}"


class ManHourRecord(TimeStampedModel):
    man_hour_id = models.BigAutoField(primary_key=True)
    attendance = models.OneToOneField(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="man_hour_record",
        db_column="attendance_id",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="man_hour_records",
        db_column="user_id",
    )
    work_date = models.DateField()
    total_minutes = models.PositiveIntegerField()
    total_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        db_table = "tbl_man_hour"
        ordering = ("-work_date", "-man_hour_id")

    def __str__(self):
        return f"{self.user.name} - {self.total_hours} hours"

