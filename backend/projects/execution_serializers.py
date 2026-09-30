from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile
from accounts.permissions import SITE_ENGINEER_ROLE_NAME, SUPERVISOR_ROLE_NAME, WORKER_ROLE_NAME

from .manpower_services import (
    build_daily_update_man_hour_context,
    get_task_manpower_utilization,
)
from .models import DailyTaskUpdate, Milestone, MilestoneExtension, MilestoneTask, TaskWorkerAssignment
from .serializers import (
    ProjectUserSummarySerializer,
    SCHEDULE_STATUS_LABELS,
    calculate_expected_progress,
    compute_schedule_status,
    get_task_progress_percentage,
)


class MilestoneSummarySerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(source="project.project_id", read_only=True)
    effective_end_date = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = (
            "milestone_id",
            "project_id",
            "title",
            "planned_start_date",
            "planned_end_date",
            "revised_end_date",
            "effective_end_date",
            "status",
            "sort_order",
        )

    def get_effective_end_date(self, obj):
        return obj.effective_end_date


class MilestoneExtensionSerializer(serializers.ModelSerializer):
    extended_by = ProjectUserSummarySerializer(read_only=True)

    class Meta:
        model = MilestoneExtension
        fields = (
            "extension_id",
            "previous_end_date",
            "new_end_date",
            "reason",
            "extended_by",
            "created_at",
            "updated_at",
        )


class MilestoneExtensionCreateSerializer(serializers.Serializer):
    new_end_date = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True)


class MilestoneExtensionWriteSerializer(serializers.Serializer):
    new_end_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")
        return attrs


class TaskApprovalSerializer(serializers.Serializer):
    approval_note = serializers.CharField(required=False, allow_blank=True)


class MilestoneTaskWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    expected_work = serializers.CharField(required=False, allow_blank=True)
    completion_requirement = serializers.CharField(required=False, allow_blank=True)
    planned_start_date = serializers.DateField(required=False, allow_null=True)
    planned_end_date = serializers.DateField(required=False, allow_null=True)
    required_worker_count = serializers.IntegerField(required=False, min_value=1)
    planned_duration_days = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    planned_hours_per_day = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0.01"),
        max_value=Decimal("24.00"),
    )
    daily_target_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0.00"),
        max_value=Decimal("100.00"),
    )
    status = serializers.ChoiceField(choices=MilestoneTask.STATUS_CHOICES, required=False)
    sort_order = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        if not attrs and self.partial:
            raise serializers.ValidationError("At least one field must be provided.")

        if not self.partial and "title" not in attrs:
            raise serializers.ValidationError({"title": ["This field is required."]})

        if not self.partial:
            expected_work = (attrs.get("expected_work") or "").strip()
            completion_requirement = (attrs.get("completion_requirement") or "").strip()
            if not expected_work:
                raise serializers.ValidationError(
                    {"expected_work": ["Expected work is required when creating a task."]},
                )
            if not completion_requirement:
                raise serializers.ValidationError(
                    {
                        "completion_requirement": [
                            "Completion requirement is required when creating a task."
                        ]
                    },
                )
            attrs["expected_work"] = expected_work
            attrs["completion_requirement"] = completion_requirement

        start_date = attrs.get("planned_start_date")
        end_date = attrs.get("planned_end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"planned_end_date": ["Task end date cannot be earlier than the start date."]},
            )

        return attrs


class TaskWorkerAssignmentWriteSerializer(serializers.Serializer):
    worker_id = serializers.PrimaryKeyRelatedField(
        queryset=UserProfile.objects.select_related("role", "login_account").all(),
    )
    duty_instructions = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_worker_id(self, value):
        if value.role.role_name != WORKER_ROLE_NAME:
            raise serializers.ValidationError("Selected user is not a Worker.")

        try:
            login_account = value.login_account
        except Exception:
            login_account = None

        if login_account is None or not login_account.is_active or value.status != UserProfile.STATUS_ACTIVE:
            raise serializers.ValidationError("Selected Worker account is inactive.")

        return value


class DailyTaskUpdateCreateSerializer(serializers.Serializer):
    work_date = serializers.DateField(required=False)
    completion_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0.00"),
        max_value=Decimal("100.00"),
    )
    status = serializers.ChoiceField(choices=DailyTaskUpdate.STATUS_CHOICES)
    remark = serializers.CharField(required=False, allow_blank=True)
    concern_text = serializers.CharField(required=False, allow_blank=True)
    incomplete_reason = serializers.ChoiceField(
        choices=DailyTaskUpdate.INCOMPLETE_REASON_CHOICES,
        required=False,
        allow_blank=True,
    )
    incomplete_reason_detail = serializers.CharField(required=False, allow_blank=True)
    has_safety_issue = serializers.BooleanField(required=False, default=False)

    def validate_work_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Work date cannot be in the future.")
        return value

    def validate(self, attrs):
        status_value = attrs.get("status")
        completion = attrs.get("completion_percentage")
        concern_text = (attrs.get("concern_text") or "").strip()
        incomplete_reason = (attrs.get("incomplete_reason") or "").strip()
        incomplete_detail = (attrs.get("incomplete_reason_detail") or "").strip()

        if status_value == DailyTaskUpdate.STATUS_BLOCKED and not concern_text and not incomplete_detail:
            raise serializers.ValidationError(
                {"concern_text": ["Reason is required when work is marked incomplete/blocked."]},
            )

        is_incomplete = (
            status_value != DailyTaskUpdate.STATUS_COMPLETED
            or (completion is not None and completion < Decimal("100.00"))
        )
        if is_incomplete and not incomplete_reason:
            raise serializers.ValidationError(
                {
                    "incomplete_reason": [
                        "Incomplete work reason is required when completion is below 100% "
                        "or status is not completed."
                    ]
                },
            )

        if incomplete_reason == DailyTaskUpdate.INCOMPLETE_REASON_OTHER and not incomplete_detail:
            raise serializers.ValidationError(
                {"incomplete_reason_detail": ["Please explain the incomplete work reason."]},
            )

        attrs["concern_text"] = concern_text
        attrs["incomplete_reason"] = incomplete_reason
        attrs["incomplete_reason_detail"] = incomplete_detail
        return attrs


class DailyTaskReviewSerializer(serializers.Serializer):
    review_status = serializers.ChoiceField(
        choices=(
            (DailyTaskUpdate.REVIEW_APPROVED, "Approved"),
            (DailyTaskUpdate.REVIEW_REJECTED, "Rejected"),
        ),
    )
    review_note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get("review_status") == DailyTaskUpdate.REVIEW_REJECTED:
            note = (attrs.get("review_note") or "").strip()
            if not note:
                raise serializers.ValidationError(
                    {"review_note": ["A rejection reason is required."]},
                )
            attrs["review_note"] = note
        return attrs


class ConcernResolveSerializer(serializers.Serializer):
    resolved = serializers.BooleanField()


class DailyTaskUpdateSerializer(serializers.ModelSerializer):
    worker = serializers.SerializerMethodField()
    assignment_id = serializers.IntegerField(source="assignment.assignment_id", read_only=True)
    task_id = serializers.IntegerField(source="assignment.task.task_id", read_only=True)
    task_title = serializers.CharField(source="assignment.task.title", read_only=True)
    milestone_id = serializers.IntegerField(source="assignment.task.milestone.milestone_id", read_only=True)
    milestone_title = serializers.CharField(source="assignment.task.milestone.title", read_only=True)
    project_id = serializers.IntegerField(source="assignment.task.milestone.project.project_id", read_only=True)
    project_name = serializers.CharField(source="assignment.task.milestone.project.project_name", read_only=True)
    supervisor_reviewed_by = ProjectUserSummarySerializer(read_only=True)
    engineer_reviewed_by = ProjectUserSummarySerializer(read_only=True)
    concern_resolved_by = ProjectUserSummarySerializer(read_only=True)
    man_hour_context = serializers.SerializerMethodField()

    class Meta:
        model = DailyTaskUpdate
        fields = (
            "update_id",
            "assignment_id",
            "task_id",
            "task_title",
            "milestone_id",
            "milestone_title",
            "project_id",
            "project_name",
            "work_date",
            "completion_percentage",
            "status",
            "remark",
            "concern_text",
            "incomplete_reason",
            "incomplete_reason_detail",
            "has_safety_issue",
            "concern_resolved",
            "concern_resolved_at",
            "concern_resolved_by",
            "supervisor_review_status",
            "supervisor_review_note",
            "supervisor_reviewed_at",
            "supervisor_reviewed_by",
            "engineer_review_status",
            "engineer_review_note",
            "engineer_reviewed_at",
            "engineer_reviewed_by",
            "man_hour_context",
            "worker",
            "created_at",
            "updated_at",
        )

    def get_worker(self, obj):
        return ProjectUserSummarySerializer(obj.assignment.worker).data

    def get_man_hour_context(self, obj):
        return build_daily_update_man_hour_context(obj)


class TaskAssignmentSerializer(serializers.ModelSerializer):
    worker = ProjectUserSummarySerializer(read_only=True)
    assigned_by = ProjectUserSummarySerializer(read_only=True)
    latest_update = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    updates = serializers.SerializerMethodField()

    class Meta:
        model = TaskWorkerAssignment
        fields = (
            "assignment_id",
            "worker",
            "assigned_by",
            "duty_instructions",
            "is_active",
            "latest_update",
            "updates",
            "task",
            "created_at",
            "updated_at",
        )

    def get_latest_update(self, obj):
        updates = list(getattr(obj, "ordered_updates", []))
        if not updates:
            updates = list(obj.daily_updates.order_by("-work_date", "-created_at", "-update_id")[:1])

        if not updates:
            return None

        return DailyTaskUpdateSerializer(updates[0]).data

    def get_task(self, obj):
        task = obj.task
        expected = calculate_expected_progress(
            task.effective_start_date,
            task.effective_end_date,
        )
        return {
            "task_id": task.task_id,
            "title": task.title,
            "status": task.status,
            "required_worker_count": task.required_worker_count,
            "expected_work": task.expected_work or "",
            "completion_requirement": task.completion_requirement or "",
            "planned_start_date": task.planned_start_date,
            "planned_end_date": task.planned_end_date,
            "daily_target_percentage": (
                str(task.daily_target_percentage)
                if task.daily_target_percentage is not None
                else None
            ),
            "expected_progress_percentage": str(expected),
            "milestone_id": task.milestone.milestone_id,
            "milestone_title": task.milestone.title,
            "project_id": task.milestone.project.project_id,
            "project_name": task.milestone.project.project_name,
        }

    def get_updates(self, obj):
        updates = list(getattr(obj, "ordered_updates", []))
        if not updates:
            updates = list(
                obj.daily_updates.select_related(
                    "supervisor_reviewed_by__role",
                    "engineer_reviewed_by__role",
                ).order_by("-work_date", "-created_at", "-update_id"),
            )

        return DailyTaskUpdateSerializer(updates, many=True).data


class MilestoneTaskSerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(source="milestone.project.project_id", read_only=True)
    milestone = MilestoneSummarySerializer(read_only=True)
    created_by = ProjectUserSummarySerializer(read_only=True)
    approved_by = ProjectUserSummarySerializer(read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    expected_progress_percentage = serializers.SerializerMethodField()
    schedule_status = serializers.SerializerMethodField()
    schedule_status_label = serializers.SerializerMethodField()
    planned_man_hours = serializers.SerializerMethodField()
    actual_man_hours = serializers.SerializerMethodField()
    manpower_utilization_percentage = serializers.SerializerMethodField()
    active_assignment_count = serializers.SerializerMethodField()
    active_assignments = serializers.SerializerMethodField()

    class Meta:
        model = MilestoneTask
        fields = (
            "task_id",
            "project_id",
            "milestone",
            "title",
            "description",
            "expected_work",
            "completion_requirement",
            "planned_start_date",
            "planned_end_date",
            "required_worker_count",
            "planned_duration_days",
            "planned_hours_per_day",
            "planned_man_hours",
            "actual_man_hours",
            "manpower_utilization_percentage",
            "daily_target_percentage",
            "status",
            "sort_order",
            "is_approved",
            "approved_at",
            "approved_by",
            "approval_note",
            "progress_percentage",
            "expected_progress_percentage",
            "schedule_status",
            "schedule_status_label",
            "active_assignment_count",
            "active_assignments",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_progress_percentage(self, obj):
        return str(get_task_progress_percentage(obj))

    def get_expected_progress_percentage(self, obj):
        return str(calculate_expected_progress(obj.effective_start_date, obj.effective_end_date))

    def get_schedule_status(self, obj):
        actual = get_task_progress_percentage(obj)
        expected = calculate_expected_progress(obj.effective_start_date, obj.effective_end_date)
        return compute_schedule_status(actual, expected, entity_status=obj.status)

    def get_schedule_status_label(self, obj):
        return SCHEDULE_STATUS_LABELS.get(self.get_schedule_status(obj), "On Schedule")

    def get_planned_man_hours(self, obj):
        planned = obj.planned_man_hours
        return str(planned) if planned is not None else None

    def get_actual_man_hours(self, obj):
        from .manpower_services import get_task_actual_man_hours

        return str(get_task_actual_man_hours(obj))

    def get_manpower_utilization_percentage(self, obj):
        utilization = get_task_manpower_utilization(obj)
        return str(utilization) if utilization is not None else None

    def get_active_assignment_count(self, obj):
        assignments = getattr(obj, "active_worker_assignments", None)
        if assignments is not None:
            return len(assignments)
        return obj.worker_assignments.filter(is_active=True).count()

    def get_active_assignments(self, obj):
        assignments = list(getattr(obj, "active_worker_assignments", []))
        if not assignments:
            assignments = list(
                obj.worker_assignments.filter(is_active=True).select_related(
                    "worker__role",
                    "assigned_by__role",
                    "task__milestone__project",
                ).prefetch_related("daily_updates"),
            )

        return TaskAssignmentSerializer(assignments, many=True).data
