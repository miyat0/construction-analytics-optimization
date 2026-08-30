from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from accounts.models import TimeStampedModel, UserProfile


class Project(TimeStampedModel):
    STATUS_PLANNING = "planning"
    STATUS_ACTIVE = "active"
    STATUS_ON_HOLD = "on_hold"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = (
        (STATUS_PLANNING, "Planning"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_ON_HOLD, "On Hold"),
        (STATUS_COMPLETED, "Completed"),
    )

    project_id = models.BigAutoField(primary_key=True)
    project_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNING)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    initial_budget = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    is_archived = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="created_projects",
        db_column="created_by_user_id",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "tbl_project"
        ordering = ("-created_at", "-project_id")

    def __str__(self):
        return self.project_name


class ProjectAssignment(TimeStampedModel):
    ROLE_PROJECT_MANAGER = "project_manager"
    ROLE_CLIENT = "client"
    ROLE_SITE_ENGINEER = "site_engineer"
    ROLE_SUPERVISOR = "supervisor"
    ROLE_CHOICES = (
        (ROLE_PROJECT_MANAGER, "Project Manager"),
        (ROLE_CLIENT, "Client"),
        (ROLE_SITE_ENGINEER, "Site Engineer"),
        (ROLE_SUPERVISOR, "Supervisor"),
    )

    assignment_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="assignments",
        db_column="project_id",
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="project_assignments",
        db_column="user_id",
    )
    assignment_role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tbl_project_assignment"
        ordering = ("project_id", "assignment_role", "assignment_id")
        constraints = [
            models.UniqueConstraint(
                fields=("project", "user", "assignment_role"),
                name="unique_project_assignment_per_user_role",
            ),
            models.UniqueConstraint(
                fields=("project", "assignment_role"),
                condition=models.Q(is_active=True),
                name="unique_active_project_assignment_role",
            ),
        ]

    def __str__(self):
        return f"{self.project.project_name} - {self.user.name} ({self.assignment_role})"


class Milestone(TimeStampedModel):
    STATUS_PLANNED = "planned"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_DELAYED = "delayed"
    STATUS_CHOICES = (
        (STATUS_PLANNED, "Planned"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_DELAYED, "Delayed"),
    )

    milestone_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="milestones",
        db_column="project_id",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    planned_start_date = models.DateField(blank=True, null=True)
    planned_end_date = models.DateField(blank=True, null=True)
    revised_end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    sort_order = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "tbl_milestone"
        ordering = ("sort_order", "milestone_id")

    @property
    def effective_end_date(self):
        return self.revised_end_date or self.planned_end_date

    def __str__(self):
        return f"{self.project.project_name} - {self.title}"


class MilestoneExtension(TimeStampedModel):
    extension_id = models.BigAutoField(primary_key=True)
    milestone = models.ForeignKey(
        Milestone,
        on_delete=models.CASCADE,
        related_name="extensions",
        db_column="milestone_id",
    )
    previous_end_date = models.DateField(blank=True, null=True)
    new_end_date = models.DateField()
    reason = models.TextField(blank=True)
    extended_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="milestone_extensions",
        db_column="extended_by_user_id",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "tbl_milestone_extension"
        ordering = ("-created_at", "-extension_id")

    def __str__(self):
        return f"{self.milestone.title} -> {self.new_end_date}"


class MilestoneTask(TimeStampedModel):
    STATUS_PLANNED = "planned"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_DELAYED = "delayed"
    STATUS_ON_HOLD = "on_hold"
    STATUS_CHOICES = (
        (STATUS_PLANNED, "Planned"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_DELAYED, "Delayed"),
        (STATUS_ON_HOLD, "On Hold"),
    )

    task_id = models.BigAutoField(primary_key=True)
    milestone = models.ForeignKey(
        Milestone,
        on_delete=models.CASCADE,
        related_name="tasks",
        db_column="milestone_id",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    expected_work = models.TextField(
        blank=True,
        help_text="Clear description of work expected from assigned workers.",
    )
    completion_requirement = models.TextField(
        blank=True,
        help_text="What constitutes completion of this task.",
    )
    planned_start_date = models.DateField(blank=True, null=True)
    planned_end_date = models.DateField(blank=True, null=True)
    required_worker_count = models.PositiveIntegerField(default=1)
    planned_duration_days = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Planned working days for manpower planning.",
    )
    planned_hours_per_day = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(Decimal("24.00"))],
        help_text="Planned hours per worker per day.",
    )
    daily_target_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Optional daily completion percentage target for this task.",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    sort_order = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="created_milestone_tasks",
        db_column="created_by_user_id",
        blank=True,
        null=True,
    )
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="approved_milestone_tasks",
        db_column="approved_by_user_id",
        blank=True,
        null=True,
    )
    approval_note = models.TextField(blank=True)

    class Meta:
        db_table = "tbl_milestone_task"
        ordering = ("sort_order", "task_id")

    @property
    def effective_start_date(self):
        return self.planned_start_date or self.milestone.planned_start_date

    @property
    def effective_end_date(self):
        return self.planned_end_date or self.milestone.effective_end_date

    @property
    def planned_man_hours(self):
        """required_workers × planned_duration_days × planned_hours_per_day."""
        if not self.planned_duration_days or not self.planned_hours_per_day:
            return None
        return (
            Decimal(self.required_worker_count)
            * Decimal(self.planned_duration_days)
            * Decimal(self.planned_hours_per_day)
        ).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.milestone.title} - {self.title}"


class TaskWorkerAssignment(TimeStampedModel):
    assignment_id = models.BigAutoField(primary_key=True)
    task = models.ForeignKey(
        MilestoneTask,
        on_delete=models.CASCADE,
        related_name="worker_assignments",
        db_column="task_id",
    )
    worker = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="task_assignments",
        db_column="worker_user_id",
    )
    assigned_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="managed_task_assignments",
        db_column="assigned_by_user_id",
        blank=True,
        null=True,
    )
    duty_instructions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tbl_task_assignment"
        ordering = ("-created_at", "-assignment_id")
        constraints = [
            models.UniqueConstraint(
                fields=("task", "worker"),
                name="unique_task_worker_assignment",
            ),
        ]

    def __str__(self):
        return f"{self.task.title} - {self.worker.name}"


class DailyTaskUpdate(TimeStampedModel):
    STATUS_NOT_STARTED = "not_started"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_BLOCKED = "blocked"
    STATUS_CHOICES = (
        (STATUS_NOT_STARTED, "Not Started"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_BLOCKED, "Blocked"),
    )

    INCOMPLETE_REASON_MATERIAL = "material_unavailable"
    INCOMPLETE_REASON_EQUIPMENT = "equipment_unavailable"
    INCOMPLETE_REASON_SAFETY = "safety_issue"
    INCOMPLETE_REASON_MANPOWER = "insufficient_manpower"
    INCOMPLETE_REASON_WEATHER = "weather"
    INCOMPLETE_REASON_TECHNICAL = "technical_issue"
    INCOMPLETE_REASON_OTHER = "other"
    INCOMPLETE_REASON_CHOICES = (
        (INCOMPLETE_REASON_MATERIAL, "Material unavailable"),
        (INCOMPLETE_REASON_EQUIPMENT, "Equipment unavailable"),
        (INCOMPLETE_REASON_SAFETY, "Safety issue"),
        (INCOMPLETE_REASON_MANPOWER, "Insufficient manpower"),
        (INCOMPLETE_REASON_WEATHER, "Weather"),
        (INCOMPLETE_REASON_TECHNICAL, "Technical issue"),
        (INCOMPLETE_REASON_OTHER, "Other"),
    )

    REVIEW_PENDING = "pending"
    REVIEW_APPROVED = "approved"
    REVIEW_REJECTED = "rejected"
    REVIEW_CHOICES = (
        (REVIEW_PENDING, "Pending"),
        (REVIEW_APPROVED, "Approved"),
        (REVIEW_REJECTED, "Rejected"),
    )

    update_id = models.BigAutoField(primary_key=True)
    assignment = models.ForeignKey(
        TaskWorkerAssignment,
        on_delete=models.CASCADE,
        related_name="daily_updates",
        db_column="assignment_id",
    )
    work_date = models.DateField()
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED)
    remark = models.TextField(blank=True)
    concern_text = models.TextField(blank=True)
    incomplete_reason = models.CharField(
        max_length=40,
        choices=INCOMPLETE_REASON_CHOICES,
        blank=True,
        default="",
        help_text="Required when work is incomplete (status not completed or completion below 100%).",
    )
    incomplete_reason_detail = models.TextField(
        blank=True,
        default="",
        help_text="Free-text explanation for incomplete work.",
    )
    has_safety_issue = models.BooleanField(default=False)
    concern_resolved = models.BooleanField(default=False)
    concern_resolved_at = models.DateTimeField(blank=True, null=True)
    concern_resolved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="resolved_concerns",
        db_column="concern_resolved_by_user_id",
        blank=True,
        null=True,
    )
    supervisor_review_status = models.CharField(
        max_length=20,
        choices=REVIEW_CHOICES,
        default=REVIEW_PENDING,
    )
    supervisor_review_note = models.TextField(blank=True)
    supervisor_reviewed_at = models.DateTimeField(blank=True, null=True)
    supervisor_reviewed_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="supervisor_reviewed_updates",
        db_column="supervisor_reviewed_by_user_id",
        blank=True,
        null=True,
    )
    engineer_review_status = models.CharField(
        max_length=20,
        choices=REVIEW_CHOICES,
        default=REVIEW_PENDING,
    )
    engineer_review_note = models.TextField(blank=True)
    engineer_reviewed_at = models.DateTimeField(blank=True, null=True)
    engineer_reviewed_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="engineer_reviewed_updates",
        db_column="engineer_reviewed_by_user_id",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "tbl_daily_task_update"
        ordering = ("-work_date", "-created_at", "-update_id")
        constraints = [
            models.UniqueConstraint(
                fields=("assignment", "work_date"),
                name="unique_task_assignment_daily_update",
            ),
        ]

    def __str__(self):
        return f"{self.assignment.task.title} - {self.assignment.worker.name} ({self.work_date})"


class ProjectDocument(TimeStampedModel):
    TYPE_PROJECT_COST = "project_cost"
    TYPE_ENGINEERING_DRAWING = "engineering_drawing"
    TYPE_CONTRACT = "contract"
    TYPE_REPORT = "report"
    TYPE_PERMIT = "permit"
    TYPE_OTHER = "other"
    DOCUMENT_TYPE_CHOICES = (
        (TYPE_PROJECT_COST, "Project Cost"),
        (TYPE_ENGINEERING_DRAWING, "Engineering Drawing"),
        (TYPE_CONTRACT, "Contract"),
        (TYPE_REPORT, "Report"),
        (TYPE_PERMIT, "Permit"),
        (TYPE_OTHER, "Other"),
    )

    document_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="documents",
        db_column="project_id",
    )
    milestone = models.ForeignKey(
        Milestone,
        on_delete=models.SET_NULL,
        related_name="documents",
        db_column="milestone_id",
        blank=True,
        null=True,
    )
    uploaded_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="project_documents",
        db_column="uploaded_by_user_id",
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=40, choices=DOCUMENT_TYPE_CHOICES)
    file = models.FileField(upload_to="project_documents/%Y/%m/%d/")
    description = models.TextField(blank=True)
    is_client_visible = models.BooleanField(default=False)

    class Meta:
        db_table = "tbl_project_document"
        ordering = ("-created_at", "-document_id")

    def __str__(self):
        return f"{self.project.project_name} - {self.title}"


class WorkplaceNeed(TimeStampedModel):
    CATEGORY_SAFETY = "safety"
    CATEGORY_TOOLS_EQUIPMENT = "tools_equipment"
    CATEGORY_PPE = "ppe"
    CATEGORY_WORKPLACE_FACILITIES = "workplace_facilities"
    CATEGORY_TRANSPORTATION = "transportation"
    CATEGORY_ACCOMMODATION = "accommodation"
    CATEGORY_WORKING_CONDITIONS = "working_conditions"
    CATEGORY_OTHER = "other"
    CATEGORY_CHOICES = (
        (CATEGORY_SAFETY, "Safety"),
        (CATEGORY_TOOLS_EQUIPMENT, "Tools/Equipment"),
        (CATEGORY_PPE, "PPE"),
        (CATEGORY_WORKPLACE_FACILITIES, "Workplace Facilities"),
        (CATEGORY_TRANSPORTATION, "Transportation"),
        (CATEGORY_ACCOMMODATION, "Accommodation"),
        (CATEGORY_WORKING_CONDITIONS, "Working Conditions"),
        (CATEGORY_OTHER, "Other"),
    )

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"
    PRIORITY_CHOICES = (
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
        (PRIORITY_URGENT, "Urgent"),
    )

    STATUS_SUBMITTED = "submitted"
    STATUS_UNDER_SUPERVISOR_REVIEW = "under_supervisor_review"
    STATUS_VERIFIED = "verified"
    STATUS_FORWARDED_TO_PM = "forwarded_to_pm"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_RESOLVED = "resolved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_UNDER_SUPERVISOR_REVIEW, "Under Supervisor Review"),
        (STATUS_VERIFIED, "Verified"),
        (STATUS_FORWARDED_TO_PM, "Forwarded to Project Manager"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_REJECTED, "Rejected"),
    )

    request_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="workplace_needs",
        db_column="project_id",
    )
    milestone = models.ForeignKey(
        Milestone,
        on_delete=models.SET_NULL,
        related_name="workplace_needs",
        db_column="milestone_id",
        blank=True,
        null=True,
    )
    submitted_by = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="workplace_needs",
        db_column="submitted_by_user_id",
    )
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    description = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM,
    )
    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default=STATUS_UNDER_SUPERVISOR_REVIEW,
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    supervisor_remarks = models.TextField(blank=True)
    supervisor_reviewed_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="supervised_workplace_needs",
        db_column="supervisor_reviewed_by_user_id",
        blank=True,
        null=True,
    )
    supervisor_reviewed_at = models.DateTimeField(blank=True, null=True)
    pm_comments = models.TextField(blank=True)
    pm_reviewed_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="managed_workplace_needs",
        db_column="pm_reviewed_by_user_id",
        blank=True,
        null=True,
    )
    pm_reviewed_at = models.DateTimeField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "tbl_workplace_need"
        ordering = ("-submitted_at", "-request_id")

    def __str__(self):
        return f"WN-{self.request_id} ({self.get_status_display()})"


class WorkplaceNeedAttachment(TimeStampedModel):
    attachment_id = models.BigAutoField(primary_key=True)
    need = models.ForeignKey(
        WorkplaceNeed,
        on_delete=models.CASCADE,
        related_name="attachments",
        db_column="request_id",
    )
    uploaded_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        related_name="workplace_need_attachments",
        db_column="uploaded_by_user_id",
        blank=True,
        null=True,
    )
    file = models.FileField(upload_to="workplace_needs/%Y/%m/%d/")
    original_name = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "tbl_workplace_need_attachment"
        ordering = ("attachment_id",)

    def __str__(self):
        return self.original_name or f"Attachment {self.attachment_id}"
