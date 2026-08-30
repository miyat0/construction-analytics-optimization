from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from accounts.responses import error_response, success_response

from .execution_views import ProjectExecutionAPIView
from .permissions import (
    IsWorkplaceNeedPmActor,
    IsWorkplaceNeedSupervisorReviewer,
    IsWorkplaceNeedWorker,
    IsWorkplaceNeedWorkspaceViewer,
)
from .services import ProjectServiceError
from .workplace_need_serializers import (
    WorkplaceNeedCreateSerializer,
    WorkplaceNeedPmActionSerializer,
    WorkplaceNeedSerializer,
    WorkplaceNeedSupervisorReviewSerializer,
)
from .workplace_need_services import WorkplaceNeedService


class WorkplaceNeedWorkerContextView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedWorker]

    def get(self, request):
        try:
            context = WorkplaceNeedService.list_worker_context(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Workplace need options retrieved successfully.",
            data={"results": context},
        )


class WorkplaceNeedMineListCreateView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedWorker]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        try:
            needs = WorkplaceNeedService.list_my_needs(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = WorkplaceNeedSerializer(needs, many=True, context={"request": request}).data
        return success_response(
            message="Workplace needs retrieved successfully.",
            data={"results": data},
        )

    def post(self, request):
        serializer = WorkplaceNeedCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Unable to submit the workplace need.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="validation_error",
            )

        payload = serializer.validated_data
        try:
            need = WorkplaceNeedService.create_need(
                login_account=request.user,
                project_id=payload["project_id"],
                milestone_id=payload.get("milestone_id"),
                category=payload["category"],
                description=payload["description"],
                priority=payload.get("priority"),
                attachment=payload.get("attachment"),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Workplace need submitted successfully.",
            data=WorkplaceNeedSerializer(need, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )


class WorkplaceNeedSupervisorInboxView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedSupervisorReviewer]

    def get(self, request):
        project_id = request.query_params.get("project_id")
        normalized_project_id = int(project_id) if project_id else None

        try:
            needs = WorkplaceNeedService.list_supervisor_inbox(
                login_account=request.user,
                project_id=normalized_project_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except (TypeError, ValueError):
            return error_response(
                message="Invalid project filter.",
                errors={"project_id": ["Provide a valid project id."]},
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="validation_error",
            )

        data = WorkplaceNeedSerializer(needs, many=True, context={"request": request}).data
        return success_response(
            message="Supervisor workplace need inbox retrieved successfully.",
            data={"results": data},
        )


class WorkplaceNeedPmInboxView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedPmActor]

    def get(self, request):
        project_id = request.query_params.get("project_id")
        include_resolved = request.query_params.get("include_resolved") in {"1", "true", "True"}
        normalized_project_id = int(project_id) if project_id else None

        try:
            needs = WorkplaceNeedService.list_pm_inbox(
                login_account=request.user,
                project_id=normalized_project_id,
                include_resolved=include_resolved,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )
        except (TypeError, ValueError):
            return error_response(
                message="Invalid project filter.",
                errors={"project_id": ["Provide a valid project id."]},
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="validation_error",
            )

        data = WorkplaceNeedSerializer(needs, many=True, context={"request": request}).data
        return success_response(
            message="Project Manager workplace need inbox retrieved successfully.",
            data={"results": data},
        )


class ProjectWorkplaceNeedListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedWorkspaceViewer]

    def get(self, request, project_id):
        try:
            needs = WorkplaceNeedService.list_project_needs(
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

        data = WorkplaceNeedSerializer(needs, many=True, context={"request": request}).data
        return success_response(
            message="Project workplace needs retrieved successfully.",
            data={"results": data},
        )


class WorkplaceNeedSupervisorReviewView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedSupervisorReviewer]

    def post(self, request, request_id):
        serializer = WorkplaceNeedSupervisorReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Unable to review the workplace need.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="validation_error",
            )

        payload = serializer.validated_data
        try:
            need = WorkplaceNeedService.supervisor_review(
                login_account=request.user,
                request_id=request_id,
                action=payload["action"],
                remarks=payload.get("remarks", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Workplace need reviewed successfully.",
            data=WorkplaceNeedSerializer(need, context={"request": request}).data,
        )


class WorkplaceNeedPmActionView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsWorkplaceNeedPmActor]

    def post(self, request, request_id):
        serializer = WorkplaceNeedPmActionSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Unable to update the workplace need.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="validation_error",
            )

        payload = serializer.validated_data
        try:
            need = WorkplaceNeedService.pm_action(
                login_account=request.user,
                request_id=request_id,
                action=payload["action"],
                comments=payload.get("comments", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Workplace need updated successfully.",
            data=WorkplaceNeedSerializer(need, context={"request": request}).data,
        )
