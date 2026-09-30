from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.responses import error_response, success_response

from .finance_serializers import (
    ManualMaterialExpenseWriteSerializer,
    MilestoneFinanceWriteSerializer,
    OtherProjectExpenseWriteSerializer,
    WorkerWageRateWriteSerializer,
)
from .finance_services import ProfitLossService
from .permissions import IsProjectWorkspaceManager
from .services import ProjectServiceError
from .views import ProjectAPIView


class FinanceAPIView(ProjectAPIView):
    permission_classes = [IsAuthenticated, IsProjectWorkspaceManager]


class FinanceProjectListView(FinanceAPIView):
    def get(self, request):
        try:
            data = ProfitLossService.list_finance_projects(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Finance projects retrieved successfully.", data={"results": data})


class ProjectProfitLossView(FinanceAPIView):
    def get(self, request, project_id):
        raw_ids = request.query_params.get("milestone_ids")
        milestone_ids = None
        if raw_ids:
            milestone_ids = [item.strip() for item in raw_ids.split(",") if item.strip()]

        try:
            data = ProfitLossService.get_dashboard(
                login_account=request.user,
                project_id=project_id,
                milestone_ids=milestone_ids,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Profit and loss report retrieved successfully.", data=data)


class MilestoneFinanceView(FinanceAPIView):
    def patch(self, request, project_id, milestone_id):
        serializer = MilestoneFinanceWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Milestone finance validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.update_milestone_finance(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Milestone financial values updated.", data=data)


class WorkerWageListCreateView(FinanceAPIView):
    def get(self, request, project_id):
        try:
            data = ProfitLossService.list_worker_wages(
                login_account=request.user,
                project_id=project_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Worker wage rates retrieved successfully.", data=data)

    def put(self, request, project_id):
        serializer = WorkerWageRateWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Wage rate validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.upsert_worker_wage(
                login_account=request.user,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Worker wage rate saved.", data=data)


class MaterialExpenseListCreateView(FinanceAPIView):
    def post(self, request, project_id):
        serializer = ManualMaterialExpenseWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Material expense validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.create_material_expense(
                login_account=request.user,
                project_id=project_id,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(
            message="Material expense recorded.",
            data=data,
            status_code=status.HTTP_201_CREATED,
        )


class MaterialExpenseDetailView(FinanceAPIView):
    def patch(self, request, project_id, expense_id):
        serializer = ManualMaterialExpenseWriteSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message="Material expense validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.update_material_expense(
                login_account=request.user,
                project_id=project_id,
                expense_id=expense_id,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Material expense updated.", data=data)

    def delete(self, request, project_id, expense_id):
        try:
            data = ProfitLossService.delete_material_expense(
                login_account=request.user,
                project_id=project_id,
                expense_id=expense_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Material expense deleted.", data=data)


class OtherExpenseListCreateView(FinanceAPIView):
    def post(self, request, project_id):
        serializer = OtherProjectExpenseWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Other expense validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.create_other_expense(
                login_account=request.user,
                project_id=project_id,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(
            message="Other expense recorded.",
            data=data,
            status_code=status.HTTP_201_CREATED,
        )


class OtherExpenseDetailView(FinanceAPIView):
    def patch(self, request, project_id, expense_id):
        serializer = OtherProjectExpenseWriteSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message="Other expense validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )
        try:
            data = ProfitLossService.update_other_expense(
                login_account=request.user,
                project_id=project_id,
                expense_id=expense_id,
                **serializer.validated_data,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Other expense updated.", data=data)

    def delete(self, request, project_id, expense_id):
        try:
            data = ProfitLossService.delete_other_expense(
                login_account=request.user,
                project_id=project_id,
                expense_id=expense_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        return success_response(message="Other expense deleted.", data=data)
