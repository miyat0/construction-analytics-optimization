from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import status

from accounts.permissions import (
    COMPANY_ADMIN_ROLE_NAME,
    PROJECT_MANAGER_ROLE_NAME,
    SUPERVISOR_ROLE_NAME,
    WORKER_ROLE_NAME,
    get_user_role_name,
)

from .execution_services import ProjectExecutionService
from .models import Milestone, Project, ProjectAssignment, TaskWorkerAssignment, WorkplaceNeed, WorkplaceNeedAttachment
from .services import ProjectServiceError


class WorkplaceNeedService:
    SUPERVISOR_QUEUE_STATUSES = (
        WorkplaceNeed.STATUS_SUBMITTED,
        WorkplaceNeed.STATUS_UNDER_SUPERVISOR_REVIEW,
    )
    PM_QUEUE_STATUSES = (
        WorkplaceNeed.STATUS_FORWARDED_TO_PM,
        WorkplaceNeed.STATUS_IN_PROGRESS,
        WorkplaceNeed.STATUS_VERIFIED,
    )
    PM_VISIBLE_STATUSES = (
        WorkplaceNeed.STATUS_FORWARDED_TO_PM,
        WorkplaceNeed.STATUS_IN_PROGRESS,
        WorkplaceNeed.STATUS_RESOLVED,
        WorkplaceNeed.STATUS_VERIFIED,
    )

    @staticmethod
    def _get_profile(login_account):
        return ProjectExecutionService._get_profile(login_account)

    @classmethod
    def _ensure_role(cls, login_account, allowed_roles, message):
        role_name = get_user_role_name(login_account)
        if role_name not in allowed_roles:
            raise ProjectServiceError(
                message=message,
                error_code="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"permission": [message]},
            )
        return cls._get_profile(login_account), role_name

    @classmethod
    def _need_queryset(cls):
        return WorkplaceNeed.objects.select_related(
            "project",
            "milestone",
            "submitted_by__role",
            "supervisor_reviewed_by__role",
            "pm_reviewed_by__role",
        ).prefetch_related(
            Prefetch(
                "attachments",
                queryset=WorkplaceNeedAttachment.objects.select_related("uploaded_by__role").order_by(
                    "attachment_id"
                ),
            ),
        )

    @classmethod
    def _worker_project_ids(cls, profile):
        return set(
            TaskWorkerAssignment.objects.filter(
                worker=profile,
                is_active=True,
            ).values_list("task__milestone__project_id", flat=True)
        )

    @classmethod
    def _supervisor_project_ids(cls, profile):
        return set(
            ProjectAssignment.objects.filter(
                user=profile,
                assignment_role=ProjectAssignment.ROLE_SUPERVISOR,
                is_active=True,
                project__is_archived=False,
            ).values_list("project_id", flat=True)
        )

    @classmethod
    def _pm_project_ids(cls, profile):
        return set(
            ProjectAssignment.objects.filter(
                user=profile,
                assignment_role=ProjectAssignment.ROLE_PROJECT_MANAGER,
                is_active=True,
                project__is_archived=False,
            ).values_list("project_id", flat=True)
        )

    @classmethod
    def list_worker_context(cls, *, login_account):
        profile, _ = cls._ensure_role(
            login_account,
            (WORKER_ROLE_NAME,),
            "Only Worker can load workplace need options.",
        )

        project_ids = cls._worker_project_ids(profile)
        if not project_ids:
            return []

        projects = (
            Project.objects.filter(pk__in=project_ids, is_archived=False)
            .prefetch_related(
                Prefetch(
                    "milestones",
                    queryset=Milestone.objects.order_by("sort_order", "milestone_id"),
                )
            )
            .order_by("project_name", "project_id")
        )

        return [
            {
                "project_id": project.project_id,
                "project_name": project.project_name,
                "milestones": [
                    {
                        "milestone_id": milestone.milestone_id,
                        "title": milestone.title,
                    }
                    for milestone in project.milestones.all()
                ],
            }
            for project in projects
        ]

    @classmethod
    def list_my_needs(cls, *, login_account):
        profile, _ = cls._ensure_role(
            login_account,
            (WORKER_ROLE_NAME,),
            "Only Worker can view their workplace needs.",
        )
        return list(cls._need_queryset().filter(submitted_by=profile))

    @classmethod
    def list_supervisor_inbox(cls, *, login_account, project_id=None):
        profile, role_name = cls._ensure_role(
            login_account,
            (SUPERVISOR_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME),
            "Only Supervisor can review workplace needs.",
        )

        queryset = cls._need_queryset().filter(status__in=cls.SUPERVISOR_QUEUE_STATUSES)
        if role_name == SUPERVISOR_ROLE_NAME:
            project_ids = cls._supervisor_project_ids(profile)
            queryset = queryset.filter(project_id__in=project_ids)

        if project_id is not None:
            queryset = queryset.filter(project_id=project_id)

        return list(queryset)

    @classmethod
    def list_pm_inbox(cls, *, login_account, project_id=None, include_resolved=False):
        profile, role_name = cls._ensure_role(
            login_account,
            (PROJECT_MANAGER_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME),
            "Only Project Manager can review verified workplace needs.",
        )

        statuses = cls.PM_VISIBLE_STATUSES if include_resolved else cls.PM_QUEUE_STATUSES
        queryset = cls._need_queryset().filter(status__in=statuses)

        if role_name == PROJECT_MANAGER_ROLE_NAME:
            project_ids = cls._pm_project_ids(profile)
            queryset = queryset.filter(project_id__in=project_ids)

        if project_id is not None:
            queryset = queryset.filter(project_id=project_id)

        return list(queryset)

    @classmethod
    def list_project_needs(cls, *, login_account, project_id):
        role_name = get_user_role_name(login_account)
        profile = cls._get_profile(login_account)

        if role_name == SUPERVISOR_ROLE_NAME:
            if project_id not in cls._supervisor_project_ids(profile):
                raise ProjectServiceError(
                    message="Project was not found or is not accessible.",
                    error_code="project_not_found",
                    status_code=status.HTTP_404_NOT_FOUND,
                    errors={"project": ["Project was not found or is not accessible."]},
                )
            return list(cls._need_queryset().filter(project_id=project_id))

        if role_name in (PROJECT_MANAGER_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME):
            if role_name == PROJECT_MANAGER_ROLE_NAME and project_id not in cls._pm_project_ids(profile):
                raise ProjectServiceError(
                    message="Project was not found or is not accessible.",
                    error_code="project_not_found",
                    status_code=status.HTTP_404_NOT_FOUND,
                    errors={"project": ["Project was not found or is not accessible."]},
                )
            return list(
                cls._need_queryset()
                .filter(project_id=project_id)
                .filter(
                    Q(status__in=cls.PM_VISIBLE_STATUSES)
                    | Q(status=WorkplaceNeed.STATUS_REJECTED, supervisor_reviewed_by__isnull=False)
                )
            )

        raise ProjectServiceError(
            message="Only Supervisor or Project Manager can view project workplace needs.",
            error_code="permission_denied",
            status_code=status.HTTP_403_FORBIDDEN,
            errors={"permission": ["Only Supervisor or Project Manager can view project workplace needs."]},
        )

    @classmethod
    @transaction.atomic
    def create_need(cls, *, login_account, project_id, category, description, priority, milestone_id=None, attachment=None):
        profile, _ = cls._ensure_role(
            login_account,
            (WORKER_ROLE_NAME,),
            "Only Worker can submit workplace needs.",
        )

        if project_id not in cls._worker_project_ids(profile):
            raise ProjectServiceError(
                message="You can only submit needs for projects you are assigned to.",
                error_code="project_not_accessible",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"project_id": ["You can only submit needs for projects you are assigned to."]},
            )

        try:
            project = Project.objects.get(pk=project_id, is_archived=False)
        except Project.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Project was not found or is not accessible.",
                error_code="project_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"project_id": ["Project was not found or is not accessible."]},
            ) from exc

        milestone = None
        if milestone_id is not None:
            try:
                milestone = Milestone.objects.get(pk=milestone_id, project_id=project.project_id)
            except Milestone.DoesNotExist as exc:
                raise ProjectServiceError(
                    message="Milestone was not found for this project.",
                    error_code="milestone_not_found",
                    status_code=status.HTTP_404_NOT_FOUND,
                    errors={"milestone_id": ["Milestone was not found for this project."]},
                ) from exc

        need = WorkplaceNeed.objects.create(
            project=project,
            milestone=milestone,
            submitted_by=profile,
            category=category,
            description=description.strip(),
            priority=priority,
            status=WorkplaceNeed.STATUS_UNDER_SUPERVISOR_REVIEW,
        )

        if attachment is not None:
            WorkplaceNeedAttachment.objects.create(
                need=need,
                uploaded_by=profile,
                file=attachment,
                original_name=getattr(attachment, "name", "") or "",
            )

        return cls._need_queryset().get(pk=need.pk)

    @classmethod
    @transaction.atomic
    def supervisor_review(cls, *, login_account, request_id, action, remarks=""):
        profile, role_name = cls._ensure_role(
            login_account,
            (SUPERVISOR_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME),
            "Only Supervisor can verify or reject workplace needs.",
        )

        try:
            need = cls._need_queryset().get(pk=request_id)
        except WorkplaceNeed.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Workplace need request was not found.",
                error_code="workplace_need_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"request_id": ["Workplace need request was not found."]},
            ) from exc

        if role_name == SUPERVISOR_ROLE_NAME and need.project_id not in cls._supervisor_project_ids(profile):
            raise ProjectServiceError(
                message="Workplace need request was not found.",
                error_code="workplace_need_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"request_id": ["Workplace need request was not found."]},
            )

        if need.status not in cls.SUPERVISOR_QUEUE_STATUSES:
            raise ProjectServiceError(
                message="Only requests awaiting supervisor review can be verified or rejected.",
                error_code="invalid_status",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"status": ["Only requests awaiting supervisor review can be verified or rejected."]},
            )

        need.supervisor_remarks = (remarks or "").strip()
        need.supervisor_reviewed_by = profile
        need.supervisor_reviewed_at = timezone.now()

        if action == "reject":
            need.status = WorkplaceNeed.STATUS_REJECTED
            need.resolved_at = timezone.now()
        else:
            need.status = WorkplaceNeed.STATUS_FORWARDED_TO_PM

        need.save(
            update_fields=[
                "status",
                "supervisor_remarks",
                "supervisor_reviewed_by",
                "supervisor_reviewed_at",
                "resolved_at",
                "updated_at",
            ]
        )
        return cls._need_queryset().get(pk=need.pk)

    @classmethod
    @transaction.atomic
    def pm_action(cls, *, login_account, request_id, action, comments=""):
        profile, role_name = cls._ensure_role(
            login_account,
            (PROJECT_MANAGER_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME),
            "Only Project Manager can act on verified workplace needs.",
        )

        try:
            need = cls._need_queryset().get(pk=request_id)
        except WorkplaceNeed.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Workplace need request was not found.",
                error_code="workplace_need_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"request_id": ["Workplace need request was not found."]},
            ) from exc

        if role_name == PROJECT_MANAGER_ROLE_NAME and need.project_id not in cls._pm_project_ids(profile):
            raise ProjectServiceError(
                message="Workplace need request was not found.",
                error_code="workplace_need_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"request_id": ["Workplace need request was not found."]},
            )

        if need.status not in (
            WorkplaceNeed.STATUS_FORWARDED_TO_PM,
            WorkplaceNeed.STATUS_VERIFIED,
            WorkplaceNeed.STATUS_IN_PROGRESS,
        ):
            raise ProjectServiceError(
                message="Only verified or in-progress requests can be updated by the Project Manager.",
                error_code="invalid_status",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"status": ["Only verified or in-progress requests can be updated by the Project Manager."]},
            )

        note = (comments or "").strip()
        if note:
            need.pm_comments = note

        need.pm_reviewed_by = profile
        need.pm_reviewed_at = timezone.now()

        if action == "start":
            need.status = WorkplaceNeed.STATUS_IN_PROGRESS
        elif action == "resolve":
            need.status = WorkplaceNeed.STATUS_RESOLVED
            need.resolved_at = timezone.now()
        elif action == "comment" and not note:
            raise ProjectServiceError(
                message="Comments are required when adding Project Manager notes.",
                error_code="validation_error",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"comments": ["Comments are required when adding Project Manager notes."]},
            )

        need.save(
            update_fields=[
                "status",
                "pm_comments",
                "pm_reviewed_by",
                "pm_reviewed_at",
                "resolved_at",
                "updated_at",
            ]
        )
        return cls._need_queryset().get(pk=need.pk)
