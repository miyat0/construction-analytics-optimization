from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import status

from accounts.models import UserProfile
from accounts.permissions import (
    CLIENT_ROLE_NAME,
    COMPANY_ADMIN_ROLE_NAME,
    PROJECT_MANAGER_ROLE_NAME,
    SITE_ENGINEER_ROLE_NAME,
    SUPERVISOR_ROLE_NAME,
    WORKER_ROLE_NAME,
    get_user_role_name,
)

from .models import DailyTaskUpdate, Milestone, MilestoneExtension, MilestoneTask, Project, ProjectAssignment, ProjectDocument, TaskWorkerAssignment


class ProjectServiceError(Exception):
    def __init__(self, message, error_code, status_code, errors=None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.errors = errors or {}


class ProjectService:
    @staticmethod
    def _active_assignment_prefetch():
        return Prefetch(
            "assignments",
            queryset=ProjectAssignment.objects.filter(is_active=True)
            .select_related("user__role")
            .order_by("assignment_id"),
            to_attr="active_assignments",
        )

    @staticmethod
    def _milestone_progress_prefetch():
        return Prefetch(
            "milestones",
            queryset=Milestone.objects.order_by("sort_order", "milestone_id").prefetch_related(
                Prefetch(
                    "extensions",
                    queryset=MilestoneExtension.objects.select_related("extended_by__role").order_by(
                        "-created_at",
                        "-extension_id",
                    ),
                    to_attr="prefetched_extensions",
                ),
                Prefetch(
                    "tasks",
                    queryset=MilestoneTask.objects.order_by("sort_order", "task_id").prefetch_related(
                        Prefetch(
                            "worker_assignments",
                            queryset=TaskWorkerAssignment.objects.filter(is_active=True).select_related(
                                "worker__role",
                                "assigned_by__role",
                                "task__milestone__project",
                            ).prefetch_related(
                                Prefetch(
                                    "daily_updates",
                                    queryset=DailyTaskUpdate.objects.order_by(
                                        "-work_date",
                                        "-created_at",
                                        "-update_id",
                                    ),
                                    to_attr="ordered_updates",
                                ),
                            ),
                            to_attr="active_worker_assignments",
                        ),
                    ),
                    to_attr="prefetched_tasks",
                ),
            ),
        )

    @classmethod
    def _list_queryset(cls):
        return (
            Project.objects.select_related("created_by__role")
            .prefetch_related(cls._active_assignment_prefetch())
            .annotate(
                milestone_count=Count("milestones", distinct=True),
                document_count=Count("documents", distinct=True),
            )
            .order_by("-created_at", "-project_id")
        )

    @classmethod
    def _detail_queryset(cls):
        return (
            Project.objects.select_related("created_by__role")
            .prefetch_related(
                cls._active_assignment_prefetch(),
                cls._milestone_progress_prefetch(),
                Prefetch(
                    "documents",
                    queryset=ProjectDocument.objects.select_related(
                        "uploaded_by__role",
                        "milestone",
                    ).order_by(
                        "-created_at",
                        "-document_id",
                    ),
                ),
            )
            .annotate(
                milestone_count=Count("milestones", distinct=True),
                document_count=Count("documents", distinct=True),
            )
        )

    @staticmethod
    def _get_profile(login_account):
        profile = getattr(login_account, "user", None)

        if profile is None or getattr(profile, "role", None) is None:
            raise ProjectServiceError(
                message="Your user profile is not configured correctly.",
                error_code="invalid_user_profile",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"user": ["Your user profile is not configured correctly."]},
            )

        return profile

    @classmethod
    def _ensure_management_role(cls, login_account):
        role_name = get_user_role_name(login_account)

        if role_name not in (COMPANY_ADMIN_ROLE_NAME, PROJECT_MANAGER_ROLE_NAME):
            raise ProjectServiceError(
                message="Only Company Administrator or Project Manager can manage projects.",
                error_code="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"permission": ["Only Company Administrator or Project Manager can manage projects."]},
            )

        return cls._get_profile(login_account)

    @classmethod
    def _viewable_queryset(cls, login_account):
        profile = cls._get_profile(login_account)
        role_name = get_user_role_name(login_account)
        queryset = cls._detail_queryset()

        if role_name == COMPANY_ADMIN_ROLE_NAME:
            return queryset

        if role_name == PROJECT_MANAGER_ROLE_NAME:
            return queryset.filter(
                Q(created_by=profile)
                | Q(
                    assignments__user=profile,
                    assignments__assignment_role=ProjectAssignment.ROLE_PROJECT_MANAGER,
                    assignments__is_active=True,
                ),
            ).distinct()

        if role_name == SITE_ENGINEER_ROLE_NAME:
            return queryset.filter(
                assignments__user=profile,
                assignments__assignment_role=ProjectAssignment.ROLE_SITE_ENGINEER,
                assignments__is_active=True,
            ).distinct()

        if role_name == SUPERVISOR_ROLE_NAME:
            return queryset.filter(
                assignments__user=profile,
                assignments__assignment_role=ProjectAssignment.ROLE_SUPERVISOR,
                assignments__is_active=True,
            ).distinct()

        if role_name == CLIENT_ROLE_NAME:
            return queryset.filter(
                assignments__user=profile,
                assignments__assignment_role=ProjectAssignment.ROLE_CLIENT,
                assignments__is_active=True,
            ).distinct()

        raise ProjectServiceError(
            message="You do not have permission to access project data.",
            error_code="permission_denied",
            status_code=status.HTTP_403_FORBIDDEN,
            errors={"permission": ["You do not have permission to access project data."]},
        )

    @classmethod
    def _manageable_queryset(cls, login_account):
        profile = cls._ensure_management_role(login_account)
        role_name = get_user_role_name(login_account)
        queryset = cls._detail_queryset()

        if role_name == COMPANY_ADMIN_ROLE_NAME:
            return queryset

        return queryset.filter(
            Q(created_by=profile)
            | Q(
                assignments__user=profile,
                assignments__assignment_role=ProjectAssignment.ROLE_PROJECT_MANAGER,
                assignments__is_active=True,
            ),
        ).distinct()

    @classmethod
    def _get_viewable_project(cls, *, login_account, project_id):
        try:
            return cls._viewable_queryset(login_account).get(pk=project_id)
        except Project.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Project was not found or is not accessible.",
                error_code="project_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"project": ["Project was not found or is not accessible."]},
            ) from exc

    @classmethod
    def _get_manageable_project(cls, *, login_account, project_id):
        try:
            return cls._manageable_queryset(login_account).get(pk=project_id)
        except Project.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Project was not found or cannot be managed by this user.",
                error_code="project_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"project": ["Project was not found or cannot be managed by this user."]},
            ) from exc

    @staticmethod
    def _build_lookup_queryset(role_name):
        return UserProfile.objects.select_related("role", "login_account").filter(
            role__role_name=role_name,
            status=UserProfile.STATUS_ACTIVE,
            login_account__is_active=True,
        )

    @staticmethod
    def _validate_assignment_user(user_profile, expected_role_name, inactive_message):
        if user_profile is None:
            return None

        if user_profile.role.role_name != expected_role_name:
            raise ProjectServiceError(
                message=f"Selected user is not a {expected_role_name}.",
                error_code="validation_error",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"user": [f"Selected user is not a {expected_role_name}."]},
            )

        try:
            login_account = user_profile.login_account
        except Exception:
            login_account = None

        if login_account is None or not login_account.is_active or user_profile.status != UserProfile.STATUS_ACTIVE:
            raise ProjectServiceError(
                message=inactive_message,
                error_code="validation_error",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"user": [inactive_message]},
            )

        return user_profile

    @classmethod
    def _sync_assignment(cls, project, assignment_role, user_profile, assigned_by=None):
        """Singular role sync (Project Manager / Client). Soft-deactivates previous holders."""
        active_queryset = ProjectAssignment.objects.filter(
            project=project,
            assignment_role=assignment_role,
            is_active=True,
        )

        if user_profile is None:
            active_queryset.update(
                is_active=False,
                deactivated_at=timezone.now(),
                updated_at=timezone.now(),
            )
            return

        active_queryset.exclude(user=user_profile).update(
            is_active=False,
            deactivated_at=timezone.now(),
            updated_at=timezone.now(),
        )

        assignment, created = ProjectAssignment.objects.get_or_create(
            project=project,
            user=user_profile,
            assignment_role=assignment_role,
            defaults={"is_active": True, "assigned_by": assigned_by},
        )

        updates = []
        if not created and not assignment.is_active:
            assignment.is_active = True
            assignment.deactivated_at = None
            updates.extend(["is_active", "deactivated_at", "updated_at"])
        if assigned_by is not None and assignment.assigned_by_id != getattr(assigned_by, "pk", None):
            assignment.assigned_by = assigned_by
            updates.append("assigned_by")
            if "updated_at" not in updates:
                updates.append("updated_at")
        if updates:
            assignment.save(update_fields=list(dict.fromkeys(updates)))

    @classmethod
    def _sync_role_assignees(cls, project, assignment_role, user_profiles, assigned_by=None):
        """
        Multi-member role sync (Site Engineer / Supervisor).
        Soft-deactivates removed members; reactivates or creates desired ones.
        Historical assignment rows are preserved.
        """
        desired_profiles = [profile for profile in (user_profiles or []) if profile is not None]
        desired_ids = {profile.pk for profile in desired_profiles}

        active_assignments = list(
            ProjectAssignment.objects.filter(
                project=project,
                assignment_role=assignment_role,
                is_active=True,
            ).select_related("user"),
        )

        for assignment in active_assignments:
            if assignment.user_id not in desired_ids:
                assignment.is_active = False
                assignment.deactivated_at = timezone.now()
                assignment.save(update_fields=["is_active", "deactivated_at", "updated_at"])

        for profile in desired_profiles:
            assignment, created = ProjectAssignment.objects.get_or_create(
                project=project,
                user=profile,
                assignment_role=assignment_role,
                defaults={"is_active": True, "assigned_by": assigned_by},
            )
            if created:
                continue

            updates = []
            if not assignment.is_active:
                assignment.is_active = True
                assignment.deactivated_at = None
                updates.extend(["is_active", "deactivated_at"])
            if assigned_by is not None and assignment.assigned_by_id != assigned_by.pk:
                assignment.assigned_by = assigned_by
                updates.append("assigned_by")
            if updates:
                updates.append("updated_at")
                assignment.save(update_fields=updates)

    @classmethod
    def _normalize_role_profiles(cls, *, profiles=None, single_profile=None, role_name=None, inactive_message=None):
        """Prefer a list of profiles; fall back to wrapping a singular profile."""
        if profiles is not None:
            return [
                cls._validate_assignment_user(profile, role_name, inactive_message)
                for profile in profiles
                if profile is not None
            ]

        if single_profile is None:
            return []

        validated = cls._validate_assignment_user(single_profile, role_name, inactive_message)
        return [validated] if validated is not None else []

    @staticmethod
    def _validate_document_milestone(project, milestone):
        if milestone is None:
            return None

        if milestone.project_id != project.project_id:
            raise ProjectServiceError(
                message="Selected milestone does not belong to this project.",
                error_code="validation_error",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"milestone_id": ["Selected milestone does not belong to this project."]},
            )

        return milestone

    @classmethod
    def list_projects(cls, *, login_account):
        return list(cls._viewable_queryset(login_account))

    @classmethod
    def get_project(cls, *, login_account, project_id):
        return cls._get_viewable_project(login_account=login_account, project_id=project_id)

    @classmethod
    def get_project_lookups(cls, *, login_account):
        profile = cls._ensure_management_role(login_account)
        role_name = get_user_role_name(login_account)

        project_managers_queryset = cls._build_lookup_queryset(PROJECT_MANAGER_ROLE_NAME)
        clients_queryset = cls._build_lookup_queryset(CLIENT_ROLE_NAME)
        site_engineers_queryset = cls._build_lookup_queryset(SITE_ENGINEER_ROLE_NAME)
        supervisors_queryset = cls._build_lookup_queryset(SUPERVISOR_ROLE_NAME)
        workers_queryset = cls._build_lookup_queryset(WORKER_ROLE_NAME)

        if role_name == PROJECT_MANAGER_ROLE_NAME:
            project_managers_queryset = project_managers_queryset.filter(pk=profile.pk)

        return {
            "project_managers": list(project_managers_queryset),
            "clients": list(clients_queryset),
            "site_engineers": list(site_engineers_queryset),
            "supervisors": list(supervisors_queryset),
            "workers": list(workers_queryset),
        }

    @classmethod
    @transaction.atomic
    def create_project(cls, *, login_account, **validated_data):
        profile = cls._ensure_management_role(login_account)
        role_name = get_user_role_name(login_account)
        project_manager_profile = validated_data.pop("project_manager_id", None)
        client_profile = validated_data.pop("client_id", None)
        site_engineer_profiles = validated_data.pop("site_engineer_ids", None)
        supervisor_profiles = validated_data.pop("supervisor_ids", None)
        site_engineer_profile = validated_data.pop("site_engineer_id", None)
        supervisor_profile = validated_data.pop("supervisor_id", None)

        if role_name == PROJECT_MANAGER_ROLE_NAME:
            project_manager_profile = profile

        project_manager_profile = cls._validate_assignment_user(
            project_manager_profile,
            PROJECT_MANAGER_ROLE_NAME,
            "Selected Project Manager account is inactive.",
        )
        client_profile = cls._validate_assignment_user(
            client_profile,
            CLIENT_ROLE_NAME,
            "Selected Client account is inactive.",
        )
        site_engineer_list = cls._normalize_role_profiles(
            profiles=site_engineer_profiles,
            single_profile=site_engineer_profile,
            role_name=SITE_ENGINEER_ROLE_NAME,
            inactive_message="Selected Site Engineer account is inactive.",
        )
        supervisor_list = cls._normalize_role_profiles(
            profiles=supervisor_profiles,
            single_profile=supervisor_profile,
            role_name=SUPERVISOR_ROLE_NAME,
            inactive_message="Selected Supervisor account is inactive.",
        )

        project = Project.objects.create(created_by=profile, **validated_data)

        cls._sync_assignment(
            project,
            ProjectAssignment.ROLE_PROJECT_MANAGER,
            project_manager_profile,
            assigned_by=profile,
        )
        cls._sync_assignment(
            project,
            ProjectAssignment.ROLE_CLIENT,
            client_profile,
            assigned_by=profile,
        )
        cls._sync_role_assignees(
            project,
            ProjectAssignment.ROLE_SITE_ENGINEER,
            site_engineer_list,
            assigned_by=profile,
        )
        cls._sync_role_assignees(
            project,
            ProjectAssignment.ROLE_SUPERVISOR,
            supervisor_list,
            assigned_by=profile,
        )

        return cls._detail_queryset().get(pk=project.pk)

    @classmethod
    @transaction.atomic
    def update_project(cls, *, login_account, project_id, **validated_data):
        profile = cls._ensure_management_role(login_account)
        role_name = get_user_role_name(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)

        sentinel = object()
        project_manager_profile = validated_data.pop("project_manager_id", sentinel)
        client_profile = validated_data.pop("client_id", sentinel)
        site_engineer_profiles = validated_data.pop("site_engineer_ids", sentinel)
        supervisor_profiles = validated_data.pop("supervisor_ids", sentinel)
        site_engineer_profile = validated_data.pop("site_engineer_id", sentinel)
        supervisor_profile = validated_data.pop("supervisor_id", sentinel)

        for field_name, value in validated_data.items():
            setattr(project, field_name, value)

        project.save()

        if role_name == PROJECT_MANAGER_ROLE_NAME:
            cls._sync_assignment(
                project,
                ProjectAssignment.ROLE_PROJECT_MANAGER,
                profile,
                assigned_by=profile,
            )
        elif project_manager_profile is not sentinel:
            cls._sync_assignment(
                project,
                ProjectAssignment.ROLE_PROJECT_MANAGER,
                cls._validate_assignment_user(
                    project_manager_profile,
                    PROJECT_MANAGER_ROLE_NAME,
                    "Selected Project Manager account is inactive.",
                ),
                assigned_by=profile,
            )

        if client_profile is not sentinel:
            cls._sync_assignment(
                project,
                ProjectAssignment.ROLE_CLIENT,
                cls._validate_assignment_user(
                    client_profile,
                    CLIENT_ROLE_NAME,
                    "Selected Client account is inactive.",
                ),
                assigned_by=profile,
            )

        if site_engineer_profiles is not sentinel or site_engineer_profile is not sentinel:
            site_engineer_list = cls._normalize_role_profiles(
                profiles=None if site_engineer_profiles is sentinel else site_engineer_profiles,
                single_profile=None if site_engineer_profile is sentinel else site_engineer_profile,
                role_name=SITE_ENGINEER_ROLE_NAME,
                inactive_message="Selected Site Engineer account is inactive.",
            )
            # When only singular was sent as null with no list, clear the team.
            if site_engineer_profiles is sentinel and site_engineer_profile is None:
                site_engineer_list = []
            cls._sync_role_assignees(
                project,
                ProjectAssignment.ROLE_SITE_ENGINEER,
                site_engineer_list,
                assigned_by=profile,
            )

        if supervisor_profiles is not sentinel or supervisor_profile is not sentinel:
            supervisor_list = cls._normalize_role_profiles(
                profiles=None if supervisor_profiles is sentinel else supervisor_profiles,
                single_profile=None if supervisor_profile is sentinel else supervisor_profile,
                role_name=SUPERVISOR_ROLE_NAME,
                inactive_message="Selected Supervisor account is inactive.",
            )
            if supervisor_profiles is sentinel and supervisor_profile is None:
                supervisor_list = []
            cls._sync_role_assignees(
                project,
                ProjectAssignment.ROLE_SUPERVISOR,
                supervisor_list,
                assigned_by=profile,
            )

        return cls._detail_queryset().get(pk=project.pk)

    @classmethod
    @transaction.atomic
    def archive_project(cls, *, login_account, project_id):
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        project.is_archived = True
        project.save(update_fields=["is_archived", "updated_at"])
        return cls._detail_queryset().get(pk=project.pk)

    @classmethod
    @transaction.atomic
    def delete_project(cls, *, login_account, project_id):
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)

        for document in project.documents.all():
            if document.file:
                document.file.delete(save=False)

        project.delete()
        return {"deleted": True, "project_id": project_id}

    @classmethod
    def list_milestones(cls, *, login_account, project_id):
        project = cls._get_viewable_project(login_account=login_account, project_id=project_id)
        return list(project.milestones.all())

    @classmethod
    def _get_milestone(cls, *, login_account, project_id, milestone_id, for_update=False):
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id) if for_update else cls._get_viewable_project(login_account=login_account, project_id=project_id)

        try:
            return project.milestones.get(pk=milestone_id)
        except Milestone.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Milestone was not found.",
                error_code="milestone_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"milestone": ["Milestone was not found."]},
            ) from exc

    @classmethod
    @transaction.atomic
    def create_milestone(cls, *, login_account, project_id, **validated_data):
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        sort_order = validated_data.get("sort_order")

        if sort_order is None:
            last_milestone = project.milestones.order_by("-sort_order", "-milestone_id").first()
            validated_data["sort_order"] = 1 if last_milestone is None else last_milestone.sort_order + 1

        return Milestone.objects.create(project=project, **validated_data)

    @classmethod
    @transaction.atomic
    def update_milestone(cls, *, login_account, project_id, milestone_id, **validated_data):
        milestone = cls._get_milestone(
            login_account=login_account,
            project_id=project_id,
            milestone_id=milestone_id,
            for_update=True,
        )

        for field_name, value in validated_data.items():
            setattr(milestone, field_name, value)

        milestone.save()
        return milestone

    @classmethod
    @transaction.atomic
    def delete_milestone(cls, *, login_account, project_id, milestone_id):
        milestone = cls._get_milestone(
            login_account=login_account,
            project_id=project_id,
            milestone_id=milestone_id,
            for_update=True,
        )
        milestone.delete()
        return {"deleted": True, "milestone_id": milestone_id}

    @classmethod
    def list_documents(cls, *, login_account, project_id):
        project = cls._get_viewable_project(login_account=login_account, project_id=project_id)
        role_name = get_user_role_name(login_account)
        documents = project.documents.all()

        if role_name == CLIENT_ROLE_NAME:
            documents = documents.filter(is_client_visible=True)

        return list(documents)

    @classmethod
    def _get_document(cls, *, login_account, project_id, document_id, for_update=False):
        documents = cls.list_documents(login_account=login_account, project_id=project_id) if not for_update else list(
            cls._get_manageable_project(login_account=login_account, project_id=project_id).documents.all(),
        )

        for document in documents:
            if document.document_id == document_id:
                return document

        raise ProjectServiceError(
            message="Document was not found.",
            error_code="document_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            errors={"document": ["Document was not found."]},
        )

    @classmethod
    @transaction.atomic
    def create_document(cls, *, login_account, project_id, **validated_data):
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        profile = cls._get_profile(login_account)
        milestone = cls._validate_document_milestone(project, validated_data.pop("milestone_id", None))
        return ProjectDocument.objects.create(
            project=project,
            milestone=milestone,
            uploaded_by=profile,
            **validated_data,
        )

    @classmethod
    @transaction.atomic
    def update_document(cls, *, login_account, project_id, document_id, **validated_data):
        document = cls._get_document(
            login_account=login_account,
            project_id=project_id,
            document_id=document_id,
            for_update=True,
        )

        previous_file = document.file if "file" in validated_data and document.file else None

        if "milestone_id" in validated_data:
            validated_data["milestone"] = cls._validate_document_milestone(
                document.project,
                validated_data.pop("milestone_id"),
            )

        for field_name, value in validated_data.items():
            setattr(document, field_name, value)

        document.save()

        if previous_file and document.file and previous_file.name != document.file.name:
            previous_file.delete(save=False)

        return document

    @classmethod
    @transaction.atomic
    def delete_document(cls, *, login_account, project_id, document_id):
        document = cls._get_document(
            login_account=login_account,
            project_id=project_id,
            document_id=document_id,
            for_update=True,
        )

        if document.file:
            document.file.delete(save=False)

        document.delete()
        return {"deleted": True, "document_id": document_id}
