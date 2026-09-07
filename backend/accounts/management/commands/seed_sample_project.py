from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import UserProfile
from accounts.permissions import (
    CLIENT_ROLE_NAME,
    COMPANY_ADMIN_ROLE_NAME,
    PROJECT_MANAGER_ROLE_NAME,
    SITE_ENGINEER_ROLE_NAME,
    SUPERVISOR_ROLE_NAME,
    WORKER_ROLE_NAME,
)
from projects.models import (
    Milestone,
    MilestoneTask,
    Project,
    ProjectAssignment,
    TaskWorkerAssignment,
)

PROJECT_NAME = "Riverside Commercial Block"


class Command(BaseCommand):
    help = (
        "Add a new sample project with milestones, tasks, and team assignments. "
        "Does not modify existing projects."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        existing = Project.objects.filter(project_name__iexact=PROJECT_NAME, is_archived=False).first()
        if existing:
            self.stdout.write(
                self.style.WARNING(
                    f'Project "{PROJECT_NAME}" already exists (id={existing.project_id}). Nothing changed.'
                )
            )
            return

        by_role = {}
        for profile in UserProfile.objects.select_related("role").filter(status=UserProfile.STATUS_ACTIVE):
            by_role.setdefault(profile.role.role_name, []).append(profile)

        def pick(role_name, prefer_email=None, limit=1):
            profiles = by_role.get(role_name, [])
            if not profiles:
                return []
            if prefer_email:
                preferred = [p for p in profiles if p.email.lower() == prefer_email.lower()]
                others = [p for p in profiles if p.email.lower() != prefer_email.lower()]
                ordered = preferred + others
            else:
                ordered = profiles
            return ordered[:limit]

        admin = pick(COMPANY_ADMIN_ROLE_NAME, "admin@demo.com", 1)
        pms = pick(PROJECT_MANAGER_ROLE_NAME, "pm@demo.com", 1)
        clients = pick(CLIENT_ROLE_NAME, "client@demo.com", 1)
        site_engineers = pick(SITE_ENGINEER_ROLE_NAME, "se@demo.com", 2)
        supervisors = pick(SUPERVISOR_ROLE_NAME, "supervisor@demo.com", 2)
        workers = pick(WORKER_ROLE_NAME, "worker@demo.com", 2)

        if not pms:
            self.stderr.write(self.style.ERROR("No Project Manager found. Aborting."))
            return

        today = date.today()
        created_by = (admin or pms)[0]

        project = Project.objects.create(
            project_name=PROJECT_NAME,
            description=(
                "New sample commercial build used for role testing. "
                "Includes milestones, tasks, and assigned team members."
            ),
            status=Project.STATUS_ACTIVE,
            start_date=today,
            end_date=today + timedelta(days=180),
            initial_budget=Decimal("1250000.00"),
            created_by=created_by,
        )

        team = [
            (pms, ProjectAssignment.ROLE_PROJECT_MANAGER),
            (clients, ProjectAssignment.ROLE_CLIENT),
            (site_engineers, ProjectAssignment.ROLE_SITE_ENGINEER),
            (supervisors, ProjectAssignment.ROLE_SUPERVISOR),
        ]
        for profiles, role in team:
            for profile in profiles:
                ProjectAssignment.objects.create(
                    project=project,
                    user=profile,
                    assignment_role=role,
                    is_active=True,
                    assigned_by=created_by,
                )

        milestones_spec = [
            {
                "title": "Site Preparation",
                "description": "Clear site, fencing, and temporary facilities.",
                "start": today,
                "end": today + timedelta(days=30),
                "status": Milestone.STATUS_IN_PROGRESS,
                "sort_order": 1,
                "tasks": [
                    {
                        "title": "Site clearing",
                        "description": "Remove debris and level the plot.",
                        "expected_work": "Clear vegetation and debris across the marked boundary.",
                        "completion_requirement": "Site cleared and ready for excavation.",
                        "days": 14,
                        "workers": 2,
                    },
                    {
                        "title": "Temporary fencing",
                        "description": "Install perimeter safety fencing.",
                        "expected_work": "Install fencing with access gate and signage.",
                        "completion_requirement": "Fence complete and inspected.",
                        "days": 10,
                        "workers": 1,
                    },
                ],
            },
            {
                "title": "Structural Works",
                "description": "Columns, beams, and slab casting.",
                "start": today + timedelta(days=31),
                "end": today + timedelta(days=90),
                "status": Milestone.STATUS_PLANNED,
                "sort_order": 2,
                "tasks": [
                    {
                        "title": "Column casting",
                        "description": "Cast ground-floor columns.",
                        "expected_work": "Shutter, reinforce, and cast columns as per drawing.",
                        "completion_requirement": "Columns cast and cured.",
                        "days": 21,
                        "workers": 2,
                    },
                ],
            },
        ]

        assigner = (supervisors or pms)[0]
        worker_cycle = workers or []

        for milestone_spec in milestones_spec:
            milestone = Milestone.objects.create(
                project=project,
                title=milestone_spec["title"],
                description=milestone_spec["description"],
                planned_start_date=milestone_spec["start"],
                planned_end_date=milestone_spec["end"],
                status=milestone_spec["status"],
                sort_order=milestone_spec["sort_order"],
            )

            for index, task_spec in enumerate(milestone_spec["tasks"], start=1):
                task = MilestoneTask.objects.create(
                    milestone=milestone,
                    title=task_spec["title"],
                    description=task_spec["description"],
                    expected_work=task_spec["expected_work"],
                    completion_requirement=task_spec["completion_requirement"],
                    planned_start_date=milestone_spec["start"],
                    planned_end_date=milestone_spec["start"] + timedelta(days=task_spec["days"]),
                    required_worker_count=task_spec["workers"],
                    planned_duration_days=task_spec["days"],
                    planned_hours_per_day=Decimal("8.00"),
                    status=(
                        MilestoneTask.STATUS_IN_PROGRESS
                        if milestone_spec["status"] == Milestone.STATUS_IN_PROGRESS
                        else MilestoneTask.STATUS_PLANNED
                    ),
                    sort_order=index,
                    created_by=assigner,
                )

                for worker in worker_cycle[: task_spec["workers"]]:
                    TaskWorkerAssignment.objects.create(
                        task=task,
                        worker=worker,
                        assigned_by=assigner,
                        duty_instructions=f"Complete {task.title} as instructed on site.",
                        is_active=True,
                    )

        self.stdout.write(self.style.SUCCESS(f'Created project "{project.project_name}" (id={project.project_id}).'))
        self.stdout.write("Team:")
        for assignment in ProjectAssignment.objects.filter(project=project, is_active=True).select_related("user"):
            self.stdout.write(f"  - {assignment.assignment_role}: {assignment.user.email}")
        self.stdout.write(
            f"Milestones: {project.milestones.count()} | "
            f"Tasks: {MilestoneTask.objects.filter(milestone__project=project).count()} | "
            f"Worker assignments: {TaskWorkerAssignment.objects.filter(task__milestone__project=project, is_active=True).count()}"
        )
        self.stdout.write("Existing projects were left unchanged.")
