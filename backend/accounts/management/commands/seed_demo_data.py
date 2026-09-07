from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import LoginAccount, Role, UserProfile
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

DEMO_PASSWORD = "Demo@123"

# Small set of demo users for every role. Existing emails are left alone.
DEMO_USERS = (
    {
        "email": "admin@demo.com",
        "name": "Demo Admin",
        "phone_number": "9000000001",
        "role_name": COMPANY_ADMIN_ROLE_NAME,
    },
    {
        "email": "pm@demo.com",
        "name": "Demo Project Manager",
        "phone_number": "9000000002",
        "role_name": PROJECT_MANAGER_ROLE_NAME,
    },
    {
        "email": "se@demo.com",
        "name": "Demo Site Engineer",
        "phone_number": "9000000003",
        "role_name": SITE_ENGINEER_ROLE_NAME,
    },
    {
        "email": "supervisor@demo.com",
        "name": "Demo Supervisor",
        "phone_number": "9000000004",
        "role_name": SUPERVISOR_ROLE_NAME,
    },
    {
        "email": "worker@demo.com",
        "name": "Demo Worker",
        "phone_number": "9000000005",
        "role_name": WORKER_ROLE_NAME,
    },
    {
        "email": "client@demo.com",
        "name": "Demo Client",
        "phone_number": "9000000006",
        "role_name": CLIENT_ROLE_NAME,
    },
)


class Command(BaseCommand):
    help = "Seed a few demo users for every role and link them to a sample project."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEMO_PASSWORD,
            help=f"Password for demo login accounts (default: {DEMO_PASSWORD}).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        roles = {role.role_name: role for role in Role.objects.all()}
        missing_roles = [item["role_name"] for item in DEMO_USERS if item["role_name"] not in roles]
        if missing_roles:
            self.stderr.write(self.style.ERROR(f"Missing roles: {', '.join(missing_roles)}"))
            return

        created_users = []
        profiles_by_role = {}

        for item in DEMO_USERS:
            profile, created = self._ensure_user(item, roles[item["role_name"]], password)
            profiles_by_role.setdefault(item["role_name"], []).append(profile)
            created_users.append((profile.email, item["role_name"], created))

        # Also include any existing active users so the sample project is usable.
        for profile in UserProfile.objects.select_related("role").filter(status=UserProfile.STATUS_ACTIVE):
            profiles_by_role.setdefault(profile.role.role_name, [])
            if profile not in profiles_by_role[profile.role.role_name]:
                profiles_by_role[profile.role.role_name].append(profile)

        project = self._ensure_sample_project(profiles_by_role)
        milestone = self._ensure_milestone(project)
        task = self._ensure_task(milestone, profiles_by_role)
        self._ensure_project_team(project, profiles_by_role)
        self._ensure_worker_assignments(task, profiles_by_role)

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write("")
        self.stdout.write("Users:")
        for email, role_name, created in created_users:
            flag = "created" if created else "exists"
            self.stdout.write(f"  - {email} ({role_name}) [{flag}]")
        self.stdout.write("")
        self.stdout.write(f"Password for demo@ accounts: {password}")
        self.stdout.write(f"Sample project: {project.project_name} (id={project.project_id})")

    def _ensure_user(self, item, role, password):
        profile = UserProfile.objects.filter(email__iexact=item["email"]).first()
        created = False

        if profile is None:
            profile = UserProfile.objects.create(
                name=item["name"],
                email=item["email"].lower(),
                phone_number=item["phone_number"],
                role=role,
                status=UserProfile.STATUS_ACTIVE,
            )
            created = True
        else:
            profile.name = item["name"]
            profile.phone_number = item["phone_number"]
            profile.role = role
            profile.status = UserProfile.STATUS_ACTIVE
            profile.save(update_fields=["name", "phone_number", "role", "status", "updated_at"])

        login = LoginAccount.objects.filter(user=profile).first()
        is_staff = role.role_name == COMPANY_ADMIN_ROLE_NAME

        if login is None:
            LoginAccount.objects.create_user(
                user=profile,
                email=profile.email,
                password=password,
                is_staff=is_staff,
                is_active=True,
            )
            created = True
        else:
            login.email = profile.email
            login.is_active = True
            login.is_staff = is_staff
            login.set_password(password)
            login.save()

        return profile, created

    def _ensure_sample_project(self, profiles_by_role):
        project = Project.objects.filter(is_archived=False).order_by("project_id").first()
        admin = (profiles_by_role.get(COMPANY_ADMIN_ROLE_NAME) or [None])[0]
        pm = (profiles_by_role.get(PROJECT_MANAGER_ROLE_NAME) or [None])[0]

        if project is None:
            today = date.today()
            project = Project.objects.create(
                project_name="Demo Site House",
                description="Small sample project for role testing.",
                status=Project.STATUS_ACTIVE,
                start_date=today,
                end_date=today + timedelta(days=90),
                initial_budget="250000.00",
                created_by=admin or pm,
            )
        else:
            if project.status != Project.STATUS_ACTIVE:
                project.status = Project.STATUS_ACTIVE
                project.save(update_fields=["status", "updated_at"])

        return project

    def _ensure_milestone(self, project):
        milestone = project.milestones.order_by("sort_order", "milestone_id").first()
        if milestone is None:
            today = date.today()
            milestone = Milestone.objects.create(
                project=project,
                title="Foundation",
                description="Initial foundation works.",
                planned_start_date=today,
                planned_end_date=today + timedelta(days=30),
                status=Milestone.STATUS_IN_PROGRESS,
                sort_order=1,
            )
        return milestone

    def _ensure_task(self, milestone, profiles_by_role):
        task = milestone.tasks.order_by("sort_order", "task_id").first()
        creator = (profiles_by_role.get(SUPERVISOR_ROLE_NAME) or profiles_by_role.get(PROJECT_MANAGER_ROLE_NAME) or [None])[0]
        if task is None:
            today = date.today()
            task = MilestoneTask.objects.create(
                milestone=milestone,
                title="Excavation",
                description="Site excavation for foundation.",
                expected_work="Complete excavation as marked on site.",
                completion_requirement="Area cleared and inspected.",
                planned_start_date=today,
                planned_end_date=today + timedelta(days=14),
                required_worker_count=2,
                status=MilestoneTask.STATUS_IN_PROGRESS,
                sort_order=1,
                created_by=creator,
            )
        return task

    def _ensure_project_team(self, project, profiles_by_role):
        mapping = (
            (PROJECT_MANAGER_ROLE_NAME, ProjectAssignment.ROLE_PROJECT_MANAGER, True),
            (CLIENT_ROLE_NAME, ProjectAssignment.ROLE_CLIENT, True),
            (SITE_ENGINEER_ROLE_NAME, ProjectAssignment.ROLE_SITE_ENGINEER, False),
            (SUPERVISOR_ROLE_NAME, ProjectAssignment.ROLE_SUPERVISOR, False),
        )

        for role_name, assignment_role, singular in mapping:
            profiles = profiles_by_role.get(role_name, [])
            if not profiles:
                continue

            active = list(
                ProjectAssignment.objects.filter(
                    project=project,
                    assignment_role=assignment_role,
                    is_active=True,
                )
            )

            if singular and active:
                continue

            if not singular:
                already = {item.user_id for item in active}
                for profile in profiles[:2]:
                    if profile.user_id in already:
                        continue
                    ProjectAssignment.objects.get_or_create(
                        project=project,
                        user=profile,
                        assignment_role=assignment_role,
                        defaults={"is_active": True},
                    )
                    already.add(profile.user_id)
                continue

            profile = profiles[0]
            assignment, _ = ProjectAssignment.objects.get_or_create(
                project=project,
                user=profile,
                assignment_role=assignment_role,
                defaults={"is_active": True},
            )
            if not assignment.is_active:
                assignment.is_active = True
                assignment.deactivated_at = None
                assignment.save(update_fields=["is_active", "deactivated_at", "updated_at"])

    def _ensure_worker_assignments(self, task, profiles_by_role):
        workers = profiles_by_role.get(WORKER_ROLE_NAME, [])[:2]
        assigner = (profiles_by_role.get(SUPERVISOR_ROLE_NAME) or [None])[0]

        for worker in workers:
            assignment, _ = TaskWorkerAssignment.objects.get_or_create(
                task=task,
                worker=worker,
                defaults={
                    "is_active": True,
                    "assigned_by": assigner,
                },
            )
            if not assignment.is_active:
                assignment.is_active = True
                assignment.assigned_by = assigner
                assignment.save(update_fields=["is_active", "assigned_by", "updated_at"])
