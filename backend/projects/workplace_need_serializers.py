from rest_framework import serializers

from .models import WorkplaceNeed
from .serializers import ProjectUserSummarySerializer


class WorkplaceNeedAttachmentSerializer(serializers.Serializer):
    attachment_id = serializers.IntegerField(read_only=True)
    file_url = serializers.SerializerMethodField()
    original_name = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        url = obj.file.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class WorkplaceNeedSerializer(serializers.ModelSerializer):
    submitted_by = ProjectUserSummarySerializer(read_only=True)
    supervisor_reviewed_by = ProjectUserSummarySerializer(read_only=True)
    pm_reviewed_by = ProjectUserSummarySerializer(read_only=True)
    project_name = serializers.CharField(source="project.project_name", read_only=True)
    milestone_title = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    attachments = WorkplaceNeedAttachmentSerializer(many=True, read_only=True)
    tracking_code = serializers.SerializerMethodField()

    class Meta:
        model = WorkplaceNeed
        fields = (
            "request_id",
            "tracking_code",
            "project_id",
            "project_name",
            "milestone_id",
            "milestone_title",
            "submitted_by",
            "category",
            "category_label",
            "description",
            "priority",
            "priority_label",
            "status",
            "status_label",
            "submitted_at",
            "supervisor_remarks",
            "supervisor_reviewed_by",
            "supervisor_reviewed_at",
            "pm_comments",
            "pm_reviewed_by",
            "pm_reviewed_at",
            "resolved_at",
            "attachments",
            "created_at",
            "updated_at",
        )

    def get_milestone_title(self, obj):
        return obj.milestone.title if obj.milestone_id else None

    def get_tracking_code(self, obj):
        return f"WN-{obj.request_id}"


class WorkplaceNeedCreateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField(min_value=1)
    milestone_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    category = serializers.ChoiceField(choices=WorkplaceNeed.CATEGORY_CHOICES)
    description = serializers.CharField(max_length=4000)
    priority = serializers.ChoiceField(
        choices=WorkplaceNeed.PRIORITY_CHOICES,
        default=WorkplaceNeed.PRIORITY_MEDIUM,
    )
    attachment = serializers.FileField(required=False, allow_null=True)


class WorkplaceNeedSupervisorReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("verify", "reject"))
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class WorkplaceNeedPmActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("start", "resolve", "comment"))
    comments = serializers.CharField(required=False, allow_blank=True, max_length=2000)
