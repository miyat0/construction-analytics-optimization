from django.contrib import admin

from .models import (
    DailyTaskUpdate,
    Milestone,
    MilestoneExtension,
    MilestoneTask,
    Project,
    ProjectAssignment,
    ProjectDocument,
    TaskWorkerAssignment,
)


class ProjectAssignmentInline(admin.TabularInline):
    model = ProjectAssignment
    extra = 0


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0


class ProjectDocumentInline(admin.TabularInline):
    model = ProjectDocument
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "project_name",
        "status",
        "is_archived",
        "start_date",
        "end_date",
        "initial_budget",
    )
    list_filter = ("status", "is_archived")
    search_fields = ("project_name", "description")
    inlines = [ProjectAssignmentInline, MilestoneInline, ProjectDocumentInline]


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "status",
        "planned_start_date",
        "planned_end_date",
        "revised_end_date",
    )
    list_filter = ("status",)
    search_fields = ("title", "project__project_name")


@admin.register(MilestoneExtension)
class MilestoneExtensionAdmin(admin.ModelAdmin):
    list_display = (
        "milestone",
        "previous_end_date",
        "new_end_date",
        "extended_by",
        "created_at",
    )
    search_fields = ("milestone__title", "milestone__project__project_name", "reason")


@admin.register(MilestoneTask)
class MilestoneTaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "milestone",
        "status",
        "required_worker_count",
        "is_approved",
        "approved_by",
    )
    list_filter = ("status", "is_approved")
    search_fields = ("title", "milestone__title", "milestone__project__project_name")


@admin.register(TaskWorkerAssignment)
class TaskWorkerAssignmentAdmin(admin.ModelAdmin):
    list_display = ("task", "worker", "assigned_by", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = (
        "task__title",
        "task__milestone__project__project_name",
        "worker__name",
        "worker__email",
    )


@admin.register(DailyTaskUpdate)
class DailyTaskUpdateAdmin(admin.ModelAdmin):
    list_display = (
        "assignment",
        "work_date",
        "completion_percentage",
        "status",
        "supervisor_review_status",
        "engineer_review_status",
        "has_safety_issue",
    )
    list_filter = (
        "status",
        "supervisor_review_status",
        "engineer_review_status",
        "has_safety_issue",
    )
    search_fields = (
        "assignment__task__title",
        "assignment__worker__name",
        "remark",
        "concern_text",
    )


@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "milestone",
        "document_type",
        "is_client_visible",
        "created_at",
    )
    list_filter = ("document_type", "is_client_visible")
    search_fields = ("title", "project__project_name", "milestone__title")


@admin.register(ProjectAssignment)
class ProjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "assignment_role", "is_active")
    list_filter = ("assignment_role", "is_active")
    search_fields = ("project__project_name", "user__name", "user__email")
