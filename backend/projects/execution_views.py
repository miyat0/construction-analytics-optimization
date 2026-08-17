from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.views import APIView

from accounts.responses import error_response, success_response

from .execution_serializers import (
    ConcernResolveSerializer,
    DailyTaskReviewSerializer,
    DailyTaskUpdateCreateSerializer,
    DailyTaskUpdateSerializer,
    MilestoneExtensionCreateSerializer,
    MilestoneExtensionSerializer,
    MilestoneExtensionWriteSerializer,
    MilestoneTaskSerializer,
    MilestoneTaskWriteSerializer,
    TaskAssignmentSerializer,
    TaskWorkerAssignmentWriteSerializer,
    TaskApprovalSerializer,
)
from .execution_services import ProjectExecutionService
from .manpower_services import build_task_manpower_summary
from .permissions import (
    IsProjectExecutionAssignmentManager,
    IsProjectExecutionConcernResolver,
    IsProjectExecutionConcernViewer,
    IsProjectExecutionEngineerReviewer,
    IsProjectExecutionTaskApprover,
    IsProjectExecutionTaskDesigner,
    IsProjectExecutionTaskViewer,
    IsProjectExecutionTeamViewer,
    IsProjectExecutionWorker,
)
from .serializers import ProjectLookupUserSerializer, get_task_progress_percentage
from .services import ProjectServiceError


class ProjectExecutionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def handle_exception(self, exc):
        if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            return error_response(
                message="Authentication credentials were not provided or are invalid.",
                errors={"authentication": ["Authentication credentials were not provided or are invalid."]},
                status_code=status.HTTP_401_UNAUTHORIZED,
                error_code="not_authenticated",
            )

        if isinstance(exc, PermissionDenied):
            return error_response(
                message=str(exc.detail),
                errors={"permission": [str(exc.detail)]},
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="permission_denied",
            )

        return super().handle_exception(exc)


class ProjectExecutionWorkerListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionTeamViewer]

    def get(self, request, project_id):
        try:
            workers = ProjectExecutionService.list_available_workers(
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

        data = ProjectLookupUserSerializer(workers, many=True).data
        return success_response(
            message="Project worker options retrieved successfully.",
            data={"count": len(data), "results": data},
        )


class MilestoneExtensionListCreateView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionTaskApprover()]

    def get(self, request, project_id, milestone_id):
        try:
            extensions = ProjectExecutionService.list_milestone_extensions(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = MilestoneExtensionSerializer(extensions, many=True).data
        return success_response(
            message="Milestone extensions retrieved successfully.",
            data={"count": len(data), "results": data},
        )

    def post(self, request, project_id, milestone_id):
        serializer = MilestoneExtensionCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Milestone extension validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            extension = ProjectExecutionService.create_milestone_extension(
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

        return success_response(
            message="Milestone timeline extended successfully.",
            data=MilestoneExtensionSerializer(extension).data,
            status_code=status.HTTP_201_CREATED,
        )


class MilestoneExtensionDetailView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionTaskApprover()]

    def get(self, request, project_id, milestone_id, extension_id):
        try:
            extension = ProjectExecutionService._get_viewable_extension(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                extension_id=extension_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone extension retrieved successfully.",
            data=MilestoneExtensionSerializer(extension).data,
        )

    def patch(self, request, project_id, milestone_id, extension_id):
        serializer = MilestoneExtensionWriteSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Milestone extension update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            extension = ProjectExecutionService.update_milestone_extension(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                extension_id=extension_id,
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
            message="Milestone extension updated successfully.",
            data=MilestoneExtensionSerializer(extension).data,
        )

    def delete(self, request, project_id, milestone_id, extension_id):
        try:
            result = ProjectExecutionService.delete_milestone_extension(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                extension_id=extension_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone extension deleted successfully.",
            data=result,
        )


class MilestoneTaskListCreateView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionTaskDesigner()]

    def get(self, request, project_id, milestone_id):
        try:
            tasks = ProjectExecutionService.list_milestone_tasks(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = MilestoneTaskSerializer(tasks, many=True).data
        return success_response(
            message="Milestone tasks retrieved successfully.",
            data={"count": len(data), "results": data},
        )

    def post(self, request, project_id, milestone_id):
        serializer = MilestoneTaskWriteSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Milestone task validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            task = ProjectExecutionService.create_milestone_task(
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

        return success_response(
            message="Milestone task created successfully.",
            data=MilestoneTaskSerializer(task).data,
            status_code=status.HTTP_201_CREATED,
        )


class MilestoneTaskDetailView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionTaskDesigner()]

    def get(self, request, project_id, milestone_id, task_id):
        try:
            task = ProjectExecutionService._get_task_for_view(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone task retrieved successfully.",
            data=MilestoneTaskSerializer(task).data,
        )

    def patch(self, request, project_id, milestone_id, task_id):
        serializer = MilestoneTaskWriteSerializer(data=request.data, partial=True)

        if not serializer.is_valid():
            return error_response(
                message="Milestone task update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            task = ProjectExecutionService.update_milestone_task(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
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
            message="Milestone task updated successfully.",
            data=MilestoneTaskSerializer(task).data,
        )

    def delete(self, request, project_id, milestone_id, task_id):
        try:
            result = ProjectExecutionService.delete_milestone_task(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(message="Milestone task deleted successfully.", data=result)


class MilestoneTaskManpowerSummaryView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionTaskViewer]

    def get(self, request, project_id, milestone_id, task_id):
        try:
            task = ProjectExecutionService._get_task_for_view(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        summary = build_task_manpower_summary(task)
        summary["completion_percentage"] = str(get_task_progress_percentage(task))

        return success_response(
            message="Task manpower summary retrieved successfully.",
            data=summary,
        )


class MilestoneTaskApprovalView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionTaskApprover]

    def post(self, request, project_id, milestone_id, task_id):
        serializer = TaskApprovalSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Task approval validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            task = ProjectExecutionService.approve_milestone_task(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
                approval_note=serializer.validated_data.get("approval_note", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone task approved successfully.",
            data=MilestoneTaskSerializer(task).data,
        )


class MilestoneTaskRejectionView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionTaskApprover]

    def post(self, request, project_id, milestone_id, task_id):
        serializer = TaskApprovalSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Task rejection validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            task = ProjectExecutionService.reject_milestone_task(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
                approval_note=serializer.validated_data.get("approval_note", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone task rejected successfully.",
            data=MilestoneTaskSerializer(task).data,
        )


class ProjectPendingTaskListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionTaskApprover]

    def get(self, request, project_id):
        try:
            tasks = ProjectExecutionService.list_pending_approval_tasks(
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

        data = MilestoneTaskSerializer(tasks, many=True).data
        return success_response(
            message="Pending milestone tasks retrieved successfully.",
            data={"count": len(data), "results": data},
        )


class ProjectDailyUpdateListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionConcernViewer]

    def get(self, request, project_id):
        try:
            updates = ProjectExecutionService.list_project_daily_updates(
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

        data = DailyTaskUpdateSerializer(updates, many=True).data
        return success_response(
            message="Project daily updates retrieved successfully.",
            data={"count": len(data), "results": data},
        )


class TaskAssignmentListCreateView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionAssignmentManager()]

    def get(self, request, project_id, milestone_id, task_id):
        try:
            assignments = ProjectExecutionService.list_task_assignments(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = TaskAssignmentSerializer(assignments, many=True).data
        return success_response(
            message="Task assignments retrieved successfully.",
            data={"count": len(data), "results": data},
        )

    def post(self, request, project_id, milestone_id, task_id):
        serializer = TaskWorkerAssignmentWriteSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Task assignment validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        payload = dict(serializer.validated_data)
        worker = payload.pop("worker_id")

        try:
            assignment = ProjectExecutionService.create_task_assignment(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
                worker=worker,
                **payload,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Worker assigned to task successfully.",
            data=TaskAssignmentSerializer(assignment).data,
            status_code=status.HTTP_201_CREATED,
        )


class TaskAssignmentDetailView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectExecutionTaskViewer()]

        return [IsAuthenticated(), IsProjectExecutionAssignmentManager()]

    def get(self, request, project_id, milestone_id, task_id, assignment_id):
        try:
            assignment = ProjectExecutionService._get_assignment(assignment_id=assignment_id)
            ProjectExecutionService.list_task_assignments(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
            )
            if assignment.task_id != task_id:
                raise ProjectServiceError(
                    message="Task assignment does not belong to the selected task.",
                    error_code="assignment_not_found",
                    status_code=status.HTTP_404_NOT_FOUND,
                    errors={"assignment": ["Task assignment does not belong to the selected task."]},
                )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Task assignment retrieved successfully.",
            data=TaskAssignmentSerializer(assignment).data,
        )

    def patch(self, request, project_id, milestone_id, task_id, assignment_id):
        serializer = TaskWorkerAssignmentWriteSerializer(data=request.data, partial=True)

        if not serializer.is_valid():
            return error_response(
                message="Task assignment update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        payload = dict(serializer.validated_data)
        if "worker_id" in payload:
            payload["worker"] = payload.pop("worker_id")

        try:
            assignment = ProjectExecutionService.update_task_assignment(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
                assignment_id=assignment_id,
                **payload,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Task assignment updated successfully.",
            data=TaskAssignmentSerializer(assignment).data,
        )

    def delete(self, request, project_id, milestone_id, task_id, assignment_id):
        try:
            result = ProjectExecutionService.deactivate_task_assignment(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                task_id=task_id,
                assignment_id=assignment_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(message="Task assignment removed successfully.", data=result)


class TaskAssignmentUpdateListCreateView(ProjectExecutionAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]

        return [IsAuthenticated(), IsProjectExecutionWorker()]

    def get(self, request, assignment_id):
        try:
            updates = ProjectExecutionService.list_task_updates(
                login_account=request.user,
                assignment_id=assignment_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = DailyTaskUpdateSerializer(updates, many=True).data
        return success_response(
            message="Daily task updates retrieved successfully.",
            data={"count": len(data), "results": data},
        )

    def post(self, request, assignment_id):
        serializer = DailyTaskUpdateCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Daily task update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            update = ProjectExecutionService.create_or_update_daily_task_update(
                login_account=request.user,
                assignment_id=assignment_id,
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
            message="Daily task update saved successfully.",
            data=DailyTaskUpdateSerializer(update).data,
            status_code=status.HTTP_201_CREATED,
        )


class DailyTaskSupervisorReviewView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionAssignmentManager]

    def post(self, request, update_id):
        serializer = DailyTaskReviewSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Supervisor review validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            update = ProjectExecutionService.review_daily_task_update_by_supervisor(
                login_account=request.user,
                update_id=update_id,
                review_status=serializer.validated_data["review_status"],
                review_note=serializer.validated_data.get("review_note", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Worker task update reviewed by Supervisor successfully.",
            data=DailyTaskUpdateSerializer(update).data,
        )


class DailyTaskEngineerReviewView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionEngineerReviewer]

    def post(self, request, update_id):
        serializer = DailyTaskReviewSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Site Engineer review validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            update = ProjectExecutionService.review_daily_task_update_by_engineer(
                login_account=request.user,
                update_id=update_id,
                review_status=serializer.validated_data["review_status"],
                review_note=serializer.validated_data.get("review_note", ""),
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Worker task update verified by Site Engineer successfully.",
            data=DailyTaskUpdateSerializer(update).data,
        )


class WorkerTaskAssignmentListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionWorker]

    def get(self, request):
        try:
            assignments = ProjectExecutionService.list_worker_assignments(
                login_account=request.user,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        data = TaskAssignmentSerializer(assignments, many=True).data
        return success_response(
            message="Worker task assignments retrieved successfully.",
            data={"count": len(data), "results": data},
        )


class ProjectConcernListView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionConcernViewer]

    def get(self, request, project_id):
        try:
            concerns = ProjectExecutionService.list_project_concerns(
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

        data = DailyTaskUpdateSerializer(concerns, many=True).data
        return success_response(
            message="Project concerns retrieved successfully.",
            data={"count": len(data), "results": data},
        )


class ProjectConcernResolveView(ProjectExecutionAPIView):
    permission_classes = [IsAuthenticated, IsProjectExecutionConcernResolver]

    def post(self, request, project_id, update_id):
        serializer = ConcernResolveSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Concern resolve validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            update = ProjectExecutionService.resolve_project_concern(
                login_account=request.user,
                project_id=project_id,
                update_id=update_id,
                resolved=serializer.validated_data["resolved"],
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Concern status updated successfully.",
            data=DailyTaskUpdateSerializer(update).data,
        )
