from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework import status

from accounts.models import UserProfile
from accounts.permissions import WORKER_ROLE_NAME
from attendance.models import AttendanceRecord

from .finance_serializers import (
    ManualMaterialExpenseSerializer,
    OtherProjectExpenseSerializer,
)
from .models import (
    ManualMaterialExpense,
    Milestone,
    OtherProjectExpense,
    Project,
    WorkerWageRate,
)
from .serializers import (
    ZERO_DECIMAL,
    calculate_expected_progress,
    get_milestone_progress_percentage,
)
from .services import ProjectService, ProjectServiceError


MONEY = Decimal("0.01")
DEFAULT_DAILY_WAGE = Decimal("800.00")
STANDARD_HOURS_PER_DAY = Decimal("8.00")


def money(value) -> Decimal:
    if value is None:
        return ZERO_DECIMAL
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


def money_str(value) -> str:
    return str(money(value))


class ProfitLossService:
    @classmethod
    def _profile(cls, login_account):
        return ProjectService._get_profile(login_account)

    @classmethod
    def _ensure_finance_manager(cls, login_account):
        ProjectService._ensure_management_role(login_account)
        return cls._profile(login_account)

    @classmethod
    def _get_project(cls, *, login_account, project_id):
        return ProjectService._get_viewable_project(
            login_account=login_account,
            project_id=project_id,
        )

    @classmethod
    def _get_manageable_project(cls, *, login_account, project_id):
        return ProjectService._get_manageable_project(
            login_account=login_account,
            project_id=project_id,
        )

    @classmethod
    def _wage_map(cls, worker_ids):
        rates = WorkerWageRate.objects.filter(worker_id__in=worker_ids)
        return {rate.worker_id: rate for rate in rates}

    @classmethod
    def _rates_for_worker(cls, worker_id, wage_map):
        rate = wage_map.get(worker_id)
        if rate is None:
            daily = DEFAULT_DAILY_WAGE
            hourly = (daily / STANDARD_HOURS_PER_DAY).quantize(MONEY, rounding=ROUND_HALF_UP)
            return daily, hourly, True
        daily = money(rate.daily_wage)
        hourly = money(rate.effective_hourly_rate())
        return daily, hourly, False

    @classmethod
    def _labour_for_milestone(cls, milestone):
        records = (
            AttendanceRecord.objects.filter(
                task_assignment__task__milestone_id=milestone.milestone_id,
                status=AttendanceRecord.STATUS_CLOCKED_OUT,
            )
            .select_related("user", "man_hour_record", "task_assignment__task")
            .order_by("attendance_date", "attendance_id")
        )
        worker_ids = {record.user_id for record in records}
        wage_map = cls._wage_map(worker_ids)

        original_end = milestone.planned_end_date
        worker_days = {}
        source_rows = []
        labour_total = ZERO_DECIMAL
        extension_labour = ZERO_DECIMAL

        for record in records:
            daily, hourly, used_default = cls._rates_for_worker(record.user_id, wage_map)
            hours = ZERO_DECIMAL
            man_hour = getattr(record, "man_hour_record", None)
            if man_hour is not None and man_hour.total_hours is not None:
                hours = money(man_hour.total_hours)
            elif record.clock_in_at and record.clock_out_at:
                minutes = Decimal((record.clock_out_at - record.clock_in_at).total_seconds()) / Decimal("60")
                hours = money(minutes / Decimal("60"))

            if hours <= ZERO_DECIMAL:
                hours = STANDARD_HOURS_PER_DAY

            cost = money(hours * hourly)
            labour_total += cost

            is_extension = bool(original_end and record.attendance_date and record.attendance_date > original_end)
            if is_extension:
                extension_labour += cost

            worker_entry = worker_days.setdefault(
                record.user_id,
                {
                    "worker_id": record.user_id,
                    "worker_name": record.user.name,
                    "days_worked": 0,
                    "hours_worked": ZERO_DECIMAL,
                    "labour_cost": ZERO_DECIMAL,
                    "daily_wage": money_str(daily),
                    "hourly_rate": money_str(hourly),
                    "using_default_wage": used_default,
                },
            )
            worker_entry["days_worked"] += 1
            worker_entry["hours_worked"] += hours
            worker_entry["labour_cost"] += cost

            source_rows.append(
                {
                    "date": record.attendance_date.isoformat() if record.attendance_date else None,
                    "worker_name": record.user.name,
                    "task_title": record.task_assignment.task.title if record.task_assignment else None,
                    "hours": money_str(hours),
                    "hourly_rate": money_str(hourly),
                    "cost": money_str(cost),
                    "after_original_deadline": is_extension,
                    "using_default_wage": used_default,
                }
            )

        workers = []
        for entry in worker_days.values():
            workers.append(
                {
                    **entry,
                    "hours_worked": money_str(entry["hours_worked"]),
                    "labour_cost": money_str(entry["labour_cost"]),
                }
            )

        return {
            "labour_cost": labour_total,
            "extension_labour_cost": extension_labour,
            "workers": workers,
            "source": source_rows,
        }

    @classmethod
    def _material_for_milestone(cls, milestone):
        expenses = list(milestone.material_expenses.all())
        total = sum((money(item.total_cost) for item in expenses), ZERO_DECIMAL)
        return total, ManualMaterialExpenseSerializer(expenses, many=True).data

    @classmethod
    def _other_for_milestone(cls, milestone, unassigned=None):
        assigned = list(milestone.other_expenses.all())
        extra = list(unassigned or [])
        rows = assigned + extra
        total = sum((money(item.amount) for item in rows), ZERO_DECIMAL)
        return total, OtherProjectExpenseSerializer(rows, many=True).data

    @classmethod
    def _build_milestone_row(cls, milestone, *, unassigned_other=None):
        labour = cls._labour_for_milestone(milestone)
        material_cost, material_rows = cls._material_for_milestone(milestone)
        other_cost, other_rows = cls._other_for_milestone(milestone, unassigned_other)

        contract_value = money(milestone.contract_value)
        planned_cost = money(milestone.planned_cost)
        labour_cost = labour["labour_cost"]
        actual_cost = labour_cost + material_cost + other_cost
        result = contract_value - actual_cost
        profit = result if result > ZERO_DECIMAL else ZERO_DECIMAL
        loss = -result if result < ZERO_DECIMAL else ZERO_DECIMAL
        expected_profit = contract_value - planned_cost if planned_cost > ZERO_DECIMAL else None
        cost_variance = actual_cost - planned_cost if planned_cost > ZERO_DECIMAL else actual_cost
        profit_margin = ZERO_DECIMAL
        if contract_value > ZERO_DECIMAL:
            profit_margin = money((result / contract_value) * Decimal("100"))

        verified_completion = get_milestone_progress_percentage(milestone)
        planned_completion = calculate_expected_progress(
            milestone.planned_start_date,
            milestone.effective_end_date,
        )
        original_end = milestone.planned_end_date
        current_end = milestone.effective_end_date
        extension_days = 0
        if original_end and current_end and current_end > original_end:
            extension_days = (current_end - original_end).days

        latest_extension = milestone.extensions.order_by("-created_at").first()
        spend_rising_while_behind = (
            planned_completion - verified_completion > Decimal("2.00")
            and cost_variance > ZERO_DECIMAL
        )
        over_budget = planned_cost > ZERO_DECIMAL and actual_cost > planned_cost

        cost_before_extension = actual_cost - labour["extension_labour_cost"]
        revised_expected_profit = contract_value - actual_cost

        return {
            "milestone_id": milestone.milestone_id,
            "title": milestone.title,
            "description": milestone.description,
            "status": milestone.status,
            "planned_start_date": milestone.planned_start_date.isoformat() if milestone.planned_start_date else None,
            "original_deadline": original_end.isoformat() if original_end else None,
            "current_deadline": current_end.isoformat() if current_end else None,
            "extension_days": extension_days,
            "extension_reason": latest_extension.reason if latest_extension else "",
            "contract_value": money_str(contract_value),
            "planned_cost": money_str(planned_cost),
            "labour_cost": money_str(labour_cost),
            "material_cost": money_str(material_cost),
            "other_expenses": money_str(other_cost),
            "actual_cost": money_str(actual_cost),
            "cost_variance": money_str(cost_variance),
            "expected_profit": money_str(expected_profit) if expected_profit is not None else None,
            "profit": money_str(profit),
            "loss": money_str(loss),
            "result": money_str(result),
            "profit_margin_percent": money_str(profit_margin),
            "planned_completion_percent": str(planned_completion),
            "verified_completion_percent": str(verified_completion),
            "over_budget": over_budget,
            "spend_rising_while_behind": spend_rising_while_behind,
            "cost_before_extension": money_str(cost_before_extension),
            "extension_labour_cost": money_str(labour["extension_labour_cost"]),
            "revised_expected_profit": money_str(revised_expected_profit),
            "workers": labour["workers"],
            "labour_source": labour["source"],
            "materials": material_rows,
            "other_expense_rows": other_rows,
            "calculations": {
                "labour": "Σ(working hours × hourly rate). Hourly rate = daily wage ÷ 8 when not set.",
                "material": "Σ(quantity × unit cost) from manual material entries.",
                "other": "Σ(other approved expenses linked to this milestone).",
                "total_cost": "Labour + Material + Other expenses.",
                "profit": "Contract value − total actual cost (shown when positive).",
                "loss": "Total actual cost − contract value (shown when negative).",
                "profit_margin": "(Result ÷ contract value) × 100.",
                "extension_impact": "Labour on attendance dates after the original deadline.",
            },
        }

    @classmethod
    def get_dashboard(cls, *, login_account, project_id, milestone_ids=None):
        cls._ensure_finance_manager(login_account)
        project = cls._get_project(login_account=login_account, project_id=project_id)

        milestones = list(
            project.milestones.all()
            .prefetch_related(
                "extensions",
                "material_expenses",
                "other_expenses",
                "tasks__worker_assignments__daily_updates",
            )
            .order_by("sort_order", "milestone_id")
        )

        selected_ids = None
        if milestone_ids:
            selected_ids = {int(item) for item in milestone_ids if str(item).strip()}

        selected = [
            milestone
            for milestone in milestones
            if selected_ids is None or milestone.milestone_id in selected_ids
        ]

        unassigned_other = list(project.other_expenses.filter(milestone__isnull=True))
        unassigned_total = sum((money(item.amount) for item in unassigned_other), ZERO_DECIMAL)

        rows = [cls._build_milestone_row(milestone) for milestone in selected]

        totals = {
            "contract_value": ZERO_DECIMAL,
            "planned_cost": ZERO_DECIMAL,
            "labour_cost": ZERO_DECIMAL,
            "material_cost": ZERO_DECIMAL,
            "other_expenses": ZERO_DECIMAL,
            "actual_cost": ZERO_DECIMAL,
        }
        for row in rows:
            for key in totals:
                totals[key] += money(row[key])

        if selected_ids is None:
            totals["other_expenses"] += unassigned_total
            totals["actual_cost"] += unassigned_total

        result = totals["contract_value"] - totals["actual_cost"]
        profit = result if result > ZERO_DECIMAL else ZERO_DECIMAL
        loss = -result if result < ZERO_DECIMAL else ZERO_DECIMAL
        margin = ZERO_DECIMAL
        if totals["contract_value"] > ZERO_DECIMAL:
            margin = money((result / totals["contract_value"]) * Decimal("100"))

        over_budget = [row for row in rows if row["over_budget"]]
        behind_spend = [row for row in rows if row["spend_rising_while_behind"]]

        return {
            "project": {
                "project_id": project.project_id,
                "project_name": project.project_name,
                "status": project.status,
                "initial_budget": money_str(project.initial_budget),
            },
            "generated_at": timezone.now().isoformat(),
            "default_daily_wage": money_str(DEFAULT_DAILY_WAGE),
            "scope": "project" if selected_ids is None else "milestones",
            "summary": {
                "contract_value": money_str(totals["contract_value"]),
                "planned_cost": money_str(totals["planned_cost"]),
                "labour_cost": money_str(totals["labour_cost"]),
                "material_cost": money_str(totals["material_cost"]),
                "other_expenses": money_str(totals["other_expenses"]),
                "actual_cost": money_str(totals["actual_cost"]),
                "cost_variance": money_str(totals["actual_cost"] - totals["planned_cost"]),
                "profit": money_str(profit),
                "loss": money_str(loss),
                "result": money_str(result),
                "profit_margin_percent": money_str(margin),
                "expected_profit": money_str(totals["contract_value"] - totals["planned_cost"]),
                "milestone_count": len(rows),
                "over_budget_count": len(over_budget),
                "behind_spend_count": len(behind_spend),
            },
            "alerts": {
                "over_budget_milestones": [
                    {"milestone_id": row["milestone_id"], "title": row["title"]}
                    for row in over_budget
                ],
                "behind_with_rising_spend": [
                    {"milestone_id": row["milestone_id"], "title": row["title"]}
                    for row in behind_spend
                ],
            },
            "milestones": rows,
            "unassigned_other_expenses": OtherProjectExpenseSerializer(
                unassigned_other,
                many=True,
            ).data
            if selected_ids is None
            else [],
        }

    @classmethod
    def list_finance_projects(cls, *, login_account):
        cls._ensure_finance_manager(login_account)
        projects = ProjectService.list_projects(login_account=login_account)
        return [
            {
                "project_id": project.project_id,
                "project_name": project.project_name,
                "status": project.status,
            }
            for project in projects
            if not project.is_archived
        ]

    @classmethod
    def list_worker_wages(cls, *, login_account, project_id):
        cls._ensure_finance_manager(login_account)
        project = cls._get_project(login_account=login_account, project_id=project_id)
        worker_ids = set(
            UserProfile.objects.filter(
                task_assignments__task__milestone__project=project,
                role__role_name=WORKER_ROLE_NAME,
            ).values_list("user_id", flat=True)
        )
        workers = list(
            UserProfile.objects.filter(user_id__in=worker_ids).select_related("role").order_by("name")
        )
        wage_map = cls._wage_map([worker.user_id for worker in workers])
        rows = []
        for worker in workers:
            daily, hourly, used_default = cls._rates_for_worker(worker.user_id, wage_map)
            rate = wage_map.get(worker.user_id)
            rows.append(
                {
                    "worker_id": worker.user_id,
                    "worker_name": worker.name,
                    "worker_email": worker.email,
                    "rate_id": rate.rate_id if rate else None,
                    "daily_wage": money_str(daily),
                    "hourly_rate": money_str(hourly),
                    "using_default_wage": used_default,
                }
            )
        return {"results": rows, "default_daily_wage": money_str(DEFAULT_DAILY_WAGE)}

    @classmethod
    @transaction.atomic
    def upsert_worker_wage(cls, *, login_account, **validated_data):
        profile = cls._ensure_finance_manager(login_account)
        worker = UserProfile.objects.filter(
            pk=validated_data["worker_id"],
            role__role_name=WORKER_ROLE_NAME,
        ).first()
        if worker is None:
            raise ProjectServiceError(
                message="Worker was not found.",
                error_code="worker_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"worker_id": ["Worker was not found."]},
            )

        rate, _created = WorkerWageRate.objects.update_or_create(
            worker=worker,
            defaults={
                "daily_wage": validated_data["daily_wage"],
                "hourly_rate": validated_data.get("hourly_rate"),
            },
        )
        _ = profile
        return {
            "rate_id": rate.rate_id,
            "worker_id": worker.user_id,
            "worker_name": worker.name,
            "daily_wage": money_str(rate.daily_wage),
            "hourly_rate": money_str(rate.effective_hourly_rate()),
            "using_default_wage": False,
        }

    @classmethod
    @transaction.atomic
    def update_milestone_finance(cls, *, login_account, project_id, milestone_id, **validated_data):
        cls._ensure_finance_manager(login_account)
        milestone = ProjectService._get_milestone(
            login_account=login_account,
            project_id=project_id,
            milestone_id=milestone_id,
            for_update=True,
        )
        for field_name, value in validated_data.items():
            setattr(milestone, field_name, value)
        milestone.save(update_fields=[*validated_data.keys(), "updated_at"])
        return {
            "milestone_id": milestone.milestone_id,
            "contract_value": money_str(milestone.contract_value),
            "planned_cost": money_str(milestone.planned_cost),
        }

    @classmethod
    @transaction.atomic
    def create_material_expense(cls, *, login_account, project_id, **validated_data):
        profile = cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        milestone = validated_data.pop("milestone_id")
        task = validated_data.pop("task_id", None)
        if milestone.project_id != project.project_id:
            raise ProjectServiceError(
                message="Milestone does not belong to this project.",
                error_code="invalid_milestone",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"milestone_id": ["Milestone does not belong to this project."]},
            )
        if task is not None and task.milestone_id != milestone.milestone_id:
            raise ProjectServiceError(
                message="Task does not belong to the selected milestone.",
                error_code="invalid_task",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"task_id": ["Task does not belong to the selected milestone."]},
            )

        quantity = money(validated_data["quantity"])
        unit_cost = money(validated_data["unit_cost"])
        expense = ManualMaterialExpense.objects.create(
            project=project,
            milestone=milestone,
            task=task,
            material_name=validated_data["material_name"].strip(),
            quantity=quantity,
            unit=(validated_data.get("unit") or "unit").strip() or "unit",
            unit_cost=unit_cost,
            total_cost=money(quantity * unit_cost),
            expense_date=validated_data["expense_date"],
            invoice_reference=validated_data.get("invoice_reference") or "",
            remarks=validated_data.get("remarks") or "",
            status=validated_data.get("status") or ManualMaterialExpense.STATUS_APPROVED,
            added_by=profile,
        )
        return ManualMaterialExpenseSerializer(expense).data

    @classmethod
    @transaction.atomic
    def update_material_expense(cls, *, login_account, project_id, expense_id, **validated_data):
        cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        try:
            expense = project.material_expenses.select_related("milestone", "task").get(pk=expense_id)
        except ManualMaterialExpense.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Material expense was not found.",
                error_code="expense_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"expense": ["Material expense was not found."]},
            ) from exc

        if "milestone_id" in validated_data:
            milestone = validated_data.pop("milestone_id")
            if milestone.project_id != project.project_id:
                raise ProjectServiceError(
                    message="Milestone does not belong to this project.",
                    error_code="invalid_milestone",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    errors={"milestone_id": ["Milestone does not belong to this project."]},
                )
            expense.milestone = milestone

        if "task_id" in validated_data:
            task = validated_data.pop("task_id")
            expense.task = task

        for field_name in (
            "material_name",
            "quantity",
            "unit",
            "unit_cost",
            "expense_date",
            "invoice_reference",
            "remarks",
            "status",
        ):
            if field_name in validated_data:
                setattr(expense, field_name, validated_data[field_name])

        expense.total_cost = money(money(expense.quantity) * money(expense.unit_cost))
        expense.save()
        return ManualMaterialExpenseSerializer(expense).data

    @classmethod
    @transaction.atomic
    def delete_material_expense(cls, *, login_account, project_id, expense_id):
        cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        deleted, _ = project.material_expenses.filter(pk=expense_id).delete()
        if not deleted:
            raise ProjectServiceError(
                message="Material expense was not found.",
                error_code="expense_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"expense": ["Material expense was not found."]},
            )
        return {"deleted": True, "expense_id": expense_id}

    @classmethod
    @transaction.atomic
    def create_other_expense(cls, *, login_account, project_id, **validated_data):
        profile = cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        milestone = validated_data.pop("milestone_id", None)
        if milestone is not None and milestone.project_id != project.project_id:
            raise ProjectServiceError(
                message="Milestone does not belong to this project.",
                error_code="invalid_milestone",
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={"milestone_id": ["Milestone does not belong to this project."]},
            )
        expense = OtherProjectExpense.objects.create(
            project=project,
            milestone=milestone,
            category=validated_data["category"],
            title=validated_data["title"].strip(),
            amount=money(validated_data["amount"]),
            expense_date=validated_data["expense_date"],
            remarks=validated_data.get("remarks") or "",
            added_by=profile,
        )
        return OtherProjectExpenseSerializer(expense).data

    @classmethod
    @transaction.atomic
    def update_other_expense(cls, *, login_account, project_id, expense_id, **validated_data):
        cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        try:
            expense = project.other_expenses.get(pk=expense_id)
        except OtherProjectExpense.DoesNotExist as exc:
            raise ProjectServiceError(
                message="Other expense was not found.",
                error_code="expense_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"expense": ["Other expense was not found."]},
            ) from exc

        if "milestone_id" in validated_data:
            expense.milestone = validated_data.pop("milestone_id")
        for field_name in ("category", "title", "amount", "expense_date", "remarks"):
            if field_name in validated_data:
                setattr(expense, field_name, validated_data[field_name])
        expense.save()
        return OtherProjectExpenseSerializer(expense).data

    @classmethod
    @transaction.atomic
    def delete_other_expense(cls, *, login_account, project_id, expense_id):
        cls._ensure_finance_manager(login_account)
        project = cls._get_manageable_project(login_account=login_account, project_id=project_id)
        deleted, _ = project.other_expenses.filter(pk=expense_id).delete()
        if not deleted:
            raise ProjectServiceError(
                message="Other expense was not found.",
                error_code="expense_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
                errors={"expense": ["Other expense was not found."]},
            )
        return {"deleted": True, "expense_id": expense_id}
