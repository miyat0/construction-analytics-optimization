from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db.models import Sum

from attendance.models import ManHourRecord

from .models import MilestoneTask, TaskWorkerAssignment


def _quantize_hours(value: Optional[Decimal]) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_task_actual_man_hours(task: MilestoneTask) -> Decimal:
    """Sum completed man-hours for attendance linked to this task's assignments."""
    assignment_ids = TaskWorkerAssignment.objects.filter(task=task).values_list(
        "assignment_id",
        flat=True,
    )
    total = (
        ManHourRecord.objects.filter(attendance__task_assignment_id__in=assignment_ids).aggregate(
            total=Sum("total_hours"),
        )["total"]
        or Decimal("0.00")
    )
    return _quantize_hours(total) or Decimal("0.00")


def get_task_manpower_utilization(task: MilestoneTask) -> Optional[Decimal]:
    planned = task.planned_man_hours
    if planned is None or planned <= 0:
        return None
    actual = get_task_actual_man_hours(task)
    return _quantize_hours((actual / planned) * Decimal("100"))


def get_worker_day_man_hours(*, worker_id: int, work_date, assignment_id: Optional[int] = None) -> Decimal:
    queryset = ManHourRecord.objects.filter(user_id=worker_id, work_date=work_date)
    if assignment_id is not None:
        queryset = queryset.filter(attendance__task_assignment_id=assignment_id)
    total = queryset.aggregate(total=Sum("total_hours"))["total"] or Decimal("0.00")
    return _quantize_hours(total) or Decimal("0.00")


def build_task_manpower_summary(task: MilestoneTask) -> dict:
    planned = task.planned_man_hours
    actual = get_task_actual_man_hours(task)
    utilization = get_task_manpower_utilization(task)

    return {
        "task_id": task.task_id,
        "required_workers": task.required_worker_count,
        "planned_duration_days": task.planned_duration_days,
        "planned_hours_per_day": (
            str(task.planned_hours_per_day) if task.planned_hours_per_day is not None else None
        ),
        "planned_man_hours": str(planned) if planned is not None else None,
        "actual_man_hours": str(actual),
        "manpower_utilization_percentage": str(utilization) if utilization is not None else None,
    }


def build_daily_update_man_hour_context(update) -> dict:
    assignment = update.assignment
    task = assignment.task
    worker_hours = get_worker_day_man_hours(
        worker_id=assignment.worker_id,
        work_date=update.work_date,
        assignment_id=assignment.assignment_id,
    )
    planned = task.planned_man_hours
    actual = get_task_actual_man_hours(task)
    utilization = get_task_manpower_utilization(task)

    return {
        "worker_man_hours_for_date": str(worker_hours),
        "required_workers": task.required_worker_count,
        "planned_man_hours": str(planned) if planned is not None else None,
        "actual_man_hours": str(actual),
        "manpower_utilization_percentage": str(utilization) if utilization is not None else None,
    }


def resolve_clock_in_assignment(*, worker_profile, assignment_id=None):
    """Validate optional assignment for clock-in; auto-link when worker has exactly one active."""
    if assignment_id is not None:
        try:
            assignment = TaskWorkerAssignment.objects.select_related("task", "worker").get(
                pk=assignment_id,
                worker=worker_profile,
                is_active=True,
            )
        except TaskWorkerAssignment.DoesNotExist as exc:
            raise ValueError("Active task assignment was not found for this worker.") from exc
        return assignment

    active_assignments = list(
        TaskWorkerAssignment.objects.filter(worker=worker_profile, is_active=True)[:2],
    )
    if len(active_assignments) == 1:
        return active_assignments[0]
    return None
