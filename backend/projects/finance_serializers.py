from decimal import Decimal

from rest_framework import serializers

from .models import (
    ManualMaterialExpense,
    Milestone,
    MilestoneTask,
    OtherProjectExpense,
    WorkerWageRate,
)


class WorkerWageRateSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.name", read_only=True)
    worker_email = serializers.EmailField(source="worker.email", read_only=True)

    class Meta:
        model = WorkerWageRate
        fields = (
            "rate_id",
            "worker_id",
            "worker_name",
            "worker_email",
            "daily_wage",
            "hourly_rate",
            "updated_at",
        )
        read_only_fields = ("rate_id", "updated_at")


class WorkerWageRateWriteSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(min_value=1)
    daily_wage = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))
    hourly_rate = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
        allow_null=True,
    )


class MilestoneFinanceWriteSerializer(serializers.Serializer):
    contract_value = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
    )
    planned_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one financial field must be provided.")
        return attrs


class ManualMaterialExpenseSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source="added_by.name", read_only=True)
    milestone_title = serializers.CharField(source="milestone.title", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = ManualMaterialExpense
        fields = (
            "expense_id",
            "project_id",
            "milestone_id",
            "milestone_title",
            "task_id",
            "task_title",
            "material_name",
            "quantity",
            "unit",
            "unit_cost",
            "total_cost",
            "expense_date",
            "invoice_reference",
            "remarks",
            "status",
            "added_by_name",
            "created_at",
        )


class ManualMaterialExpenseWriteSerializer(serializers.Serializer):
    milestone_id = serializers.PrimaryKeyRelatedField(queryset=Milestone.objects.all())
    task_id = serializers.PrimaryKeyRelatedField(
        queryset=MilestoneTask.objects.all(),
        required=False,
        allow_null=True,
    )
    material_name = serializers.CharField(max_length=200)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    unit = serializers.CharField(max_length=40, required=False, allow_blank=True)
    unit_cost = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.00"))
    expense_date = serializers.DateField()
    invoice_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=ManualMaterialExpense.STATUS_CHOICES,
        required=False,
    )


class OtherProjectExpenseSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source="added_by.name", read_only=True)
    milestone_title = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = OtherProjectExpense
        fields = (
            "expense_id",
            "project_id",
            "milestone_id",
            "milestone_title",
            "category",
            "category_label",
            "title",
            "amount",
            "expense_date",
            "remarks",
            "added_by_name",
            "created_at",
        )

    def get_milestone_title(self, obj):
        return obj.milestone.title if obj.milestone else None


class OtherProjectExpenseWriteSerializer(serializers.Serializer):
    milestone_id = serializers.PrimaryKeyRelatedField(
        queryset=Milestone.objects.all(),
        required=False,
        allow_null=True,
    )
    category = serializers.ChoiceField(choices=OtherProjectExpense.CATEGORY_CHOICES)
    title = serializers.CharField(max_length=200)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    expense_date = serializers.DateField()
    remarks = serializers.CharField(required=False, allow_blank=True)
