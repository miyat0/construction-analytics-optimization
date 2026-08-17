from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Prefetch
from django.utils import timezone
from rest_framework import status

from accounts.models import Role, UserProfile
from accounts.permissions import COMPANY_ADMIN_ROLE_NAME, get_user_role_name

from .models import Milestone, Project, ProjectAssignment
from .serializers import (
    ZERO_DECIMAL,
    calculate_expected_progress,
    get_milestone_progress_percentage,
)
from .services import ProjectService, ProjectServiceError


class AdminDashboardService:
    @classmethod
    def get_dashboard(cls, *, login_account):
        role_name = get_user_role_name(login_account)
        if role_name != COMPANY_ADMIN_ROLE_NAME:
            raise ProjectServiceError(
                message="Only Company Administrator can access the admin dashboard.",
                error_code="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN,
                errors={"permission": ["Only Company Administrator can access the admin dashboard."]},
            )

        today = timezone.localdate()
        due_soon_cutoff = today + timedelta(days=14)

        projects = list(
            Project.objects.filter(is_archived=False)
            .select_related("created_by__role")
            .prefetch_related(
                ProjectService._active_assignment_prefetch(),
                Prefetch(
                    "milestones",
                    queryset=Milestone.objects.order_by("sort_order", "milestone_id").prefetch_related(
                        "tasks__worker_assignments__daily_updates",
                    ),
                    to_attr="dashboard_milestones",
                ),
            )
            .annotate(milestone_total=Count("milestones", distinct=True))
            .order_by("-updated_at", "-project_id")
        )

        performance_rows = []
        attention_rows = []
        on_schedule_count = 0
        active_count = 0
        planning_count = 0
        completed_count = 0
        on_hold_count = 0
        milestones_due_soon = 0
        milestones_in_progress = 0
        upcoming_milestone_candidates = []
        total_budget = ZERO_DECIMAL
        active_budget = ZERO_DECIMAL
        budget_by_status = {
            "planning": ZERO_DECIMAL,
            "active": ZERO_DECIMAL,
            "on_hold": ZERO_DECIMAL,
            "completed": ZERO_DECIMAL,
        }
        activity_candidates = []

        for project in projects:
            milestones = list(getattr(project, "dashboard_milestones", []))
            progress = cls._project_progress(milestones)
            expected = cls._project_expected_progress(project, milestones)
            health = cls._project_health(project, milestones, progress, expected, today)
            manager = cls._assignment_user(project, ProjectAssignment.ROLE_PROJECT_MANAGER)
            budget = project.initial_budget or ZERO_DECIMAL
            total_budget += budget
            budget_by_status[project.status] = budget_by_status.get(project.status, ZERO_DECIMAL) + budget

            if project.status == Project.STATUS_ACTIVE:
                active_count += 1
                active_budget += budget
            elif project.status == Project.STATUS_PLANNING:
                planning_count += 1
            elif project.status == Project.STATUS_COMPLETED:
                completed_count += 1
            elif project.status == Project.STATUS_ON_HOLD:
                on_hold_count += 1

            if health["schedule_label"] == "on_track":
                on_schedule_count += 1

            for milestone in milestones:
                if milestone.status == Milestone.STATUS_IN_PROGRESS:
                    milestones_in_progress += 1
                end_date = milestone.effective_end_date
                if (
                    end_date
                    and today <= end_date <= due_soon_cutoff
                    and milestone.status != Milestone.STATUS_COMPLETED
                ):
                    milestones_due_soon += 1

                if (
                    end_date
                    and end_date >= today
                    and milestone.status != Milestone.STATUS_COMPLETED
                ):
                    upcoming_milestone_candidates.append(
                        {
                            "milestone_id": milestone.milestone_id,
                            "title": milestone.title,
                            "project_id": project.project_id,
                            "project_name": project.project_name,
                            "due_date": end_date.isoformat(),
                            "days_until_due": (end_date - today).days,
                            "status": milestone.status,
                        }
                    )

                if milestone.status == Milestone.STATUS_COMPLETED:
                    activity_candidates.append(
                        {
                            "type": "milestone_completed",
                            "title": f"{milestone.title} completed",
                            "subtitle": project.project_name,
                            "timestamp": milestone.updated_at.isoformat(),
                        }
                    )
                elif milestone.status == Milestone.STATUS_DELAYED:
                    activity_candidates.append(
                        {
                            "type": "milestone_delayed",
                            "title": f"{milestone.title} marked delayed",
                            "subtitle": project.project_name,
                            "timestamp": milestone.updated_at.isoformat(),
                        }
                    )

            row = {
                "project_id": project.project_id,
                "project_name": project.project_name,
                "status": project.status,
                "health": health["label"],
                "health_key": health["schedule_label"],
                "progress_percentage": float(progress),
                "expected_progress_percentage": float(expected),
                "initial_budget": str(budget),
                "milestone_count": len(milestones),
                "delayed_milestone_count": health["delayed_count"],
                "project_manager": (
                    {
                        "user_id": manager.user_id,
                        "name": manager.name,
                    }
                    if manager
                    else None
                ),
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "attention_reasons": health["reasons"],
            }
            performance_rows.append(row)

            if health["needs_attention"]:
                attention_rows.append(row)

            activity_candidates.append(
                {
                    "type": "project_updated",
                    "title": f"{project.project_name} updated",
                    "subtitle": f"Status: {project.get_status_display()}",
                    "timestamp": project.updated_at.isoformat(),
                }
            )

        performance_rows.sort(key=lambda item: item["progress_percentage"], reverse=True)
        attention_rows.sort(
            key=lambda item: (
                item["delayed_milestone_count"],
                -item["progress_percentage"],
            ),
            reverse=True,
        )

        users_qs = UserProfile.objects.select_related("role", "login_account")
        total_users = users_qs.count()
        active_users = users_qs.filter(
            status=UserProfile.STATUS_ACTIVE,
            login_account__is_active=True,
        ).count()

        role_breakdown = list(
            Role.objects.annotate(user_count=Count("users")).order_by("role_name").values(
                "role_id",
                "role_name",
                "user_count",
            )
        )

        recent_user_rows = list(
            users_qs.order_by("-created_at")[:5]
        )

        for user in recent_user_rows:
            login_account = getattr(user, "login_account", None)
            activity_candidates.append(
                {
                    "type": "user_registered",
                    "title": f"{user.name} joined the platform",
                    "subtitle": user.role.role_name if user.role_id else "User",
                    "timestamp": user.created_at.isoformat(),
                }
            )

        activity_candidates.sort(key=lambda item: item["timestamp"], reverse=True)
        recent_activity = activity_candidates[:6]

        upcoming_milestone_candidates.sort(key=lambda item: item["due_date"])
        upcoming_milestones = upcoming_milestone_candidates[:3]

        chart_rows = [
            {"label": "Planning", "value": float(budget_by_status["planning"])},
            {"label": "Active", "value": float(budget_by_status["active"])},
            {"label": "On Hold", "value": float(budget_by_status["on_hold"])},
            {"label": "Completed", "value": float(budget_by_status["completed"])},
        ]

        return {
            "generated_at": timezone.now().isoformat(),
            "kpis": {
                "active_projects": active_count,
                "on_schedule_projects": on_schedule_count,
                "milestones_due_soon": milestones_due_soon,
                "milestones_in_progress": milestones_in_progress,
                "portfolio_budget": str(total_budget),
                "active_budget": str(active_budget),
                "total_projects": len(projects),
                "planning_projects": planning_count,
                "completed_projects": completed_count,
                "on_hold_projects": on_hold_count,
            },
            "budget_overview": {
                "total_allocated": str(total_budget),
                "active_allocated": str(active_budget),
                "completed_allocated": str(budget_by_status["completed"]),
                "on_hold_allocated": str(budget_by_status["on_hold"]),
                "planning_allocated": str(budget_by_status["planning"]),
                "note": "Based on project initial budgets. Revenue and expense ledgers are not configured yet.",
                "chart": chart_rows,
            },
            "project_performance": performance_rows[:5],
            "attention_projects": attention_rows[:4],
            "recent_activity": recent_activity,
            "upcoming_milestones": upcoming_milestones,
            "team": {
                "total_users": total_users,
                "active_users": active_users,
                "roles": [
                    {
                        "role_id": role["role_id"],
                        "role_name": role["role_name"],
                        "count": role["user_count"],
                    }
                    for role in role_breakdown
                ],
            },
            "recent_users": [
                {
                    "user_id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "role_name": user.role.role_name if user.role_id else "—",
                    "status": user.status,
                    "is_active": bool(
                        getattr(user, "login_account", None)
                        and user.login_account.is_active
                        and user.status == UserProfile.STATUS_ACTIVE
                    ),
                    "last_login": (
                        user.login_account.last_login.isoformat()
                        if getattr(user, "login_account", None) and user.login_account.last_login
                        else None
                    ),
                    "created_at": user.created_at.isoformat(),
                }
                for user in recent_user_rows
            ],
        }

    @staticmethod
    def _assignment_user(project, role_name):
        for assignment in getattr(project, "active_assignments", []):
            if assignment.assignment_role == role_name:
                return assignment.user
        return None

    @classmethod
    def _project_progress(cls, milestones):
        if not milestones:
            return ZERO_DECIMAL
        values = [get_milestone_progress_percentage(milestone) for milestone in milestones]
        total = sum(values, ZERO_DECIMAL)
        return (total / Decimal(len(values))).quantize(Decimal("0.01"))

    @classmethod
    def _project_expected_progress(cls, project, milestones):
        if milestones:
            values = [
                calculate_expected_progress(
                    milestone.planned_start_date,
                    milestone.effective_end_date,
                )
                for milestone in milestones
            ]
            if values:
                total = sum(values, ZERO_DECIMAL)
                return (total / Decimal(len(values))).quantize(Decimal("0.01"))
        return calculate_expected_progress(project.start_date, project.end_date)

    @classmethod
    def _project_health(cls, project, milestones, progress, expected, today):
        delayed_count = sum(1 for milestone in milestones if milestone.status == Milestone.STATUS_DELAYED)
        reasons = []
        schedule_label = "on_track"
        label = "On Track"

        if project.status == Project.STATUS_PLANNING:
            schedule_label = "planning"
            label = "Planning"
        elif project.status == Project.STATUS_COMPLETED:
            schedule_label = "completed"
            label = "Completed"
        elif project.status == Project.STATUS_ON_HOLD:
            schedule_label = "on_hold"
            label = "On Hold"
            reasons.append("Project is on hold")
        else:
            if delayed_count:
                schedule_label = "delayed"
                label = "Delayed"
                reasons.append(f"{delayed_count} delayed milestone{'s' if delayed_count != 1 else ''}")
            elif project.end_date and project.end_date < today and project.status != Project.STATUS_COMPLETED:
                schedule_label = "attention"
                label = "Attention"
                days = (today - project.end_date).days
                reasons.append(f"{days} day{'s' if days != 1 else ''} past planned end date")
            elif expected - progress >= Decimal("15.00"):
                schedule_label = "attention"
                label = "Attention"
                reasons.append("Progress behind expected schedule")
            else:
                schedule_label = "on_track"
                label = "On Track"

        needs_attention = schedule_label in {"delayed", "attention", "on_hold"}
        return {
            "schedule_label": schedule_label,
            "label": label,
            "needs_attention": needs_attention,
            "delayed_count": delayed_count,
            "reasons": reasons,
        }
