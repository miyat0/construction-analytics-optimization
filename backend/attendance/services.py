from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework import status

from accounts.permissions import WORKER_ROLE_NAME
from projects.manpower_services import resolve_clock_in_assignment

from .models import AttendanceRecord, ManHourRecord


class AttendanceServiceError(Exception):
    def __init__(self, message, error_code, status_code, errors=None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.errors = errors or {}


class AttendanceService:
    @staticmethod
    def _get_profile(login_account):
        profile = getattr(login_account, "user", None)

        if profile is None:
            raise AttendanceServiceError(
                message="Your user profile is not configured correctly.",
                error_code="invalid_user_profile",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"user": ["Your user profile is not configured correctly."]},
            )

        return profile

    @classmethod
    def _require_worker_profile(cls, login_account):
        profile = cls._get_profile(login_account)

        if profile.role.role_name != WORKER_ROLE_NAME:
            raise AttendanceServiceError(
                message="Only Worker can manage attendance.",
                error_code="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"permission": ["Only Worker can manage attendance."]},
            )

        return profile

    @staticmethod
    def _base_queryset():
        return AttendanceRecord.objects.select_related(
            "user",
            "user__role",
            "man_hour_record",
            "task_assignment",
            "task_assignment__task",
        ).order_by("-clock_in_at", "-attendance_id")

    @classmethod
    def _get_open_attendance(cls, profile):
        return cls._base_queryset().filter(
            user=profile,
            status=AttendanceRecord.STATUS_CLOCKED_IN,
        ).first()

    @staticmethod
    def _duration_from_timestamps(clock_in_at, clock_out_at):
        """Derive minutes/hours from exact elapsed seconds (never accept client values)."""
        total_seconds = max((clock_out_at - clock_in_at).total_seconds(), 0.0)
        # Round to nearest minute; any positive duration under 30s still counts as 1 minute.
        total_minutes = int(Decimal(str(total_seconds)) / Decimal("60") + Decimal("0.5"))
        if total_seconds > 0 and total_minutes == 0:
            total_minutes = 1

        total_hours = (Decimal(str(total_seconds)) / Decimal("3600")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        if total_seconds > 0 and total_hours == Decimal("0.00"):
            total_hours = Decimal("0.01")

        return total_minutes, total_hours

    @staticmethod
    def _serialize_attendance(record):
        if record is None:
            return None

        man_hour_record = getattr(record, "man_hour_record", None)
        total_minutes = man_hour_record.total_minutes if man_hour_record else None
        total_hours = str(man_hour_record.total_hours) if man_hour_record else None

        # Prefer timestamp-derived duration when clocked out so short shifts never show 0.00
        # due to older minute-floor storage, and so display stays consistent with clock times.
        if record.clock_out_at is not None:
            computed_minutes, computed_hours = AttendanceService._duration_from_timestamps(
                record.clock_in_at,
                record.clock_out_at,
            )
            if total_minutes is None or total_minutes == 0 or total_hours in (None, "0.00", "0.0"):
                total_minutes = computed_minutes
                total_hours = str(computed_hours)

        assignment = record.task_assignment
        return {
            "attendance_id": record.attendance_id,
            "attendance_date": record.attendance_date.isoformat(),
            "clock_in_at": record.clock_in_at.isoformat(),
            "clock_out_at": record.clock_out_at.isoformat() if record.clock_out_at else None,
            "status": record.status,
            "task_assignment_id": assignment.assignment_id if assignment else None,
            "task_id": assignment.task_id if assignment else None,
            "task_title": assignment.task.title if assignment else None,
            "total_minutes": total_minutes,
            "total_hours": total_hours,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }

    @staticmethod
    def _serialize_profile(profile):
        return {
            "user_id": profile.user_id,
            "name": profile.name,
            "email": profile.email,
            "phone_number": profile.phone_number,
            "role": {
                "role_id": profile.role.role_id,
                "role_name": profile.role.role_name,
                "description": profile.role.description,
            },
        }

    @staticmethod
    def _calculate_elapsed_minutes(clock_in_at, clock_out_at):
        total_minutes, _ = AttendanceService._duration_from_timestamps(clock_in_at, clock_out_at)
        return total_minutes

    @staticmethod
    def _calculate_total_hours_from_shift(clock_in_at, clock_out_at):
        _, total_hours = AttendanceService._duration_from_timestamps(clock_in_at, clock_out_at)
        return total_hours

    @staticmethod
    def _calculate_total_hours(total_minutes):
        total_hours = Decimal(total_minutes) / Decimal("60")
        return total_hours.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    def get_worker_dashboard(cls, *, login_account, history_limit=10):
        profile = cls._require_worker_profile(login_account)
        open_record = cls._get_open_attendance(profile)
        history_records = list(cls._base_queryset().filter(user=profile)[:history_limit])
        man_hour_queryset = ManHourRecord.objects.select_related("attendance").filter(user=profile)
        completed_shift_count = man_hour_queryset.count()
        latest_man_hour_record = man_hour_queryset.order_by("-work_date", "-man_hour_id").first()

        # Recompute totals from clock timestamps so legacy minute-floor zeros are corrected.
        completed_attendance = AttendanceRecord.objects.filter(
            user=profile,
            status=AttendanceRecord.STATUS_CLOCKED_OUT,
            clock_out_at__isnull=False,
        ).only("clock_in_at", "clock_out_at")
        total_minutes_recorded = 0
        total_hours_recorded = Decimal("0.00")
        for attendance in completed_attendance:
            minutes, hours = cls._duration_from_timestamps(
                attendance.clock_in_at,
                attendance.clock_out_at,
            )
            total_minutes_recorded += minutes
            total_hours_recorded += hours

        latest_man_hour = None
        if latest_man_hour_record is not None:
            latest_hours = latest_man_hour_record.total_hours
            attendance = latest_man_hour_record.attendance
            if attendance.clock_out_at is not None:
                latest_hours = cls._calculate_total_hours_from_shift(
                    attendance.clock_in_at,
                    attendance.clock_out_at,
                )
            latest_man_hour = {
                "man_hour_id": latest_man_hour_record.man_hour_id,
                "work_date": latest_man_hour_record.work_date.isoformat(),
                "total_minutes": latest_man_hour_record.total_minutes,
                "total_hours": str(latest_hours),
            }

        return {
            "worker": cls._serialize_profile(profile),
            "attendance": {
                "is_clocked_in": open_record is not None,
                "current_shift": cls._serialize_attendance(open_record),
                "latest_man_hour": latest_man_hour,
                "history": [cls._serialize_attendance(record) for record in history_records],
                "summary": {
                    "completed_shift_count": completed_shift_count,
                    "recorded_total_minutes": total_minutes_recorded,
                    "recorded_total_hours": str(
                        total_hours_recorded.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                    ),
                },
            },
            "server_time": timezone.now().isoformat(),
        }

    @classmethod
    @transaction.atomic
    def clock_in(cls, *, login_account, assignment_id=None):
        profile = cls._require_worker_profile(login_account)
        open_record = cls._get_open_attendance(profile)

        if open_record is not None:
            raise AttendanceServiceError(
                message="You are already clocked in.",
                error_code="already_clocked_in",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"attendance": ["You are already clocked in."]},
            )

        try:
            assignment = resolve_clock_in_assignment(
                worker_profile=profile,
                assignment_id=assignment_id,
            )
        except ValueError as exc:
            raise AttendanceServiceError(
                message=str(exc),
                error_code="invalid_task_assignment",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"assignment_id": [str(exc)]},
            ) from exc

        current_time = timezone.now()
        record = AttendanceRecord.objects.create(
            user=profile,
            attendance_date=current_time.date(),
            clock_in_at=current_time,
            status=AttendanceRecord.STATUS_CLOCKED_IN,
            task_assignment=assignment,
        )

        return {
            "worker": cls._serialize_profile(profile),
            "attendance": cls._serialize_attendance(record),
            "server_time": current_time.isoformat(),
        }

    @classmethod
    @transaction.atomic
    def clock_out(cls, *, login_account):
        profile = cls._require_worker_profile(login_account)
        open_record = cls._get_open_attendance(profile)

        if open_record is None:
            raise AttendanceServiceError(
                message="You do not have an active shift to clock out from.",
                error_code="missing_active_shift",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"attendance": ["You do not have an active shift to clock out from."]},
            )

        current_time = timezone.now()
        total_minutes, total_hours = cls._duration_from_timestamps(
            open_record.clock_in_at,
            current_time,
        )

        open_record.clock_out_at = current_time
        open_record.status = AttendanceRecord.STATUS_CLOCKED_OUT
        open_record.save(update_fields=["clock_out_at", "status", "updated_at"])

        man_hour_record, _ = ManHourRecord.objects.update_or_create(
            attendance=open_record,
            defaults={
                "user": profile,
                "work_date": open_record.attendance_date,
                "total_minutes": total_minutes,
                "total_hours": total_hours,
            },
        )
        # Ensure reverse relation is available for serialization without a refetch.
        open_record.man_hour_record = man_hour_record

        return {
            "worker": cls._serialize_profile(profile),
            "attendance": cls._serialize_attendance(open_record),
            "man_hour": {
                "man_hour_id": man_hour_record.man_hour_id,
                "work_date": man_hour_record.work_date.isoformat(),
                "total_minutes": man_hour_record.total_minutes,
                "total_hours": str(man_hour_record.total_hours),
            },
            "server_time": current_time.isoformat(),
        }

    @classmethod
    def get_history(cls, *, login_account, limit=10):
        profile = cls._require_worker_profile(login_account)
        history_records = list(cls._base_queryset().filter(user=profile)[:limit])

        return {
            "count": len(history_records),
            "results": [cls._serialize_attendance(record) for record in history_records],
        }
