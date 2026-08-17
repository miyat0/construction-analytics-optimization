from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.views import APIView

from accounts.permissions import IsCompanyAdministrator
from accounts.responses import error_response, success_response

from .dashboard_services import AdminDashboardService
from .permissions import IsProjectWorkspaceManager, IsProjectWorkspaceViewer
from .serializers import (
    MilestoneSerializer,
    MilestoneWriteSerializer,
    ProjectDetailSerializer,
    ProjectDocumentCreateSerializer,
    ProjectDocumentSerializer,
    ProjectDocumentUpdateSerializer,
    ProjectLookupUserSerializer,
    ProjectSummarySerializer,
    ProjectWriteSerializer,
)
from .services import ProjectService, ProjectServiceError


class ProjectAPIView(APIView):
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


class AdminDashboardView(ProjectAPIView):
    permission_classes = [IsAuthenticated, IsCompanyAdministrator]

    def get(self, request):
        try:
            data = AdminDashboardService.get_dashboard(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Administrator dashboard retrieved successfully.",
            data=data,
        )


class ProjectLookupsView(ProjectAPIView):
    permission_classes = [IsAuthenticated, IsProjectWorkspaceManager]

    def get(self, request):
        try:
            lookups = ProjectService.get_project_lookups(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Project lookups retrieved successfully.",
            data={
                "project_managers": ProjectLookupUserSerializer(
                    lookups["project_managers"],
                    many=True,
                ).data,
                "clients": ProjectLookupUserSerializer(lookups["clients"], many=True).data,
                "site_engineers": ProjectLookupUserSerializer(
                    lookups["site_engineers"],
                    many=True,
                ).data,
                "supervisors": ProjectLookupUserSerializer(
                    lookups["supervisors"],
                    many=True,
                ).data,
                "workers": ProjectLookupUserSerializer(lookups["workers"], many=True).data,
            },
        )


class ProjectListCreateView(ProjectAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request):
        try:
            projects = ProjectService.list_projects(login_account=request.user)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        serializer = ProjectSummarySerializer(projects, many=True, context={"request": request})
        return success_response(
            message="Projects retrieved successfully.",
            data={"count": len(serializer.data), "results": serializer.data},
        )

    def post(self, request):
        serializer = ProjectWriteSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            return error_response(
                message="Project creation validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            project = ProjectService.create_project(login_account=request.user, **serializer.validated_data)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Project created successfully.",
            data=ProjectDetailSerializer(project, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProjectDetailView(ProjectAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request, project_id):
        try:
            project = ProjectService.get_project(login_account=request.user, project_id=project_id)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Project retrieved successfully.",
            data=ProjectDetailSerializer(project, context={"request": request}).data,
        )

    def patch(self, request, project_id):
        serializer = ProjectWriteSerializer(
            data=request.data,
            context={"request": request},
            partial=True,
        )

        if not serializer.is_valid():
            return error_response(
                message="Project update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            project = ProjectService.update_project(
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
            message="Project updated successfully.",
            data=ProjectDetailSerializer(project, context={"request": request}).data,
        )

    def delete(self, request, project_id):
        try:
            result = ProjectService.delete_project(login_account=request.user, project_id=project_id)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(message="Project deleted successfully.", data=result)


class ProjectArchiveView(ProjectAPIView):
    permission_classes = [IsAuthenticated, IsProjectWorkspaceManager]

    def post(self, request, project_id):
        try:
            project = ProjectService.archive_project(login_account=request.user, project_id=project_id)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Project archived successfully.",
            data=ProjectDetailSerializer(project, context={"request": request}).data,
        )


class ProjectMilestoneListCreateView(ProjectAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request, project_id):
        try:
            milestones = ProjectService.list_milestones(login_account=request.user, project_id=project_id)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestones retrieved successfully.",
            data={
                "count": len(milestones),
                "results": MilestoneSerializer(milestones, many=True).data,
            },
        )

    def post(self, request, project_id):
        serializer = MilestoneWriteSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Milestone validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            milestone = ProjectService.create_milestone(
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
            message="Milestone created successfully.",
            data=MilestoneSerializer(milestone).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProjectMilestoneDetailView(ProjectAPIView):
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request, project_id, milestone_id):
        try:
            milestone = ProjectService._get_milestone(
                login_account=request.user,
                project_id=project_id,
                milestone_id=milestone_id,
                for_update=False,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Milestone retrieved successfully.",
            data=MilestoneSerializer(milestone).data,
        )

    def patch(self, request, project_id, milestone_id):
        serializer = MilestoneWriteSerializer(data=request.data, partial=True)

        if not serializer.is_valid():
            return error_response(
                message="Milestone update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            milestone = ProjectService.update_milestone(
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
            message="Milestone updated successfully.",
            data=MilestoneSerializer(milestone).data,
        )

    def delete(self, request, project_id, milestone_id):
        try:
            result = ProjectService.delete_milestone(
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

        return success_response(message="Milestone deleted successfully.", data=result)


class ProjectDocumentListCreateView(ProjectAPIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request, project_id):
        try:
            documents = ProjectService.list_documents(login_account=request.user, project_id=project_id)
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        serializer = ProjectDocumentSerializer(documents, many=True, context={"request": request})
        return success_response(
            message="Project documents retrieved successfully.",
            data={"count": len(serializer.data), "results": serializer.data},
        )

    def post(self, request, project_id):
        serializer = ProjectDocumentCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Project document validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            document = ProjectService.create_document(
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
            message="Project document created successfully.",
            data=ProjectDocumentSerializer(document, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProjectDocumentDetailView(ProjectAPIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsProjectWorkspaceViewer()]

        return [IsAuthenticated(), IsProjectWorkspaceManager()]

    def get(self, request, project_id, document_id):
        try:
            document = ProjectService._get_document(
                login_account=request.user,
                project_id=project_id,
                document_id=document_id,
                for_update=False,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Project document retrieved successfully.",
            data=ProjectDocumentSerializer(document, context={"request": request}).data,
        )

    def patch(self, request, project_id, document_id):
        serializer = ProjectDocumentUpdateSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Project document update validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            document = ProjectService.update_document(
                login_account=request.user,
                project_id=project_id,
                document_id=document_id,
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
            message="Project document updated successfully.",
            data=ProjectDocumentSerializer(document, context={"request": request}).data,
        )

    def delete(self, request, project_id, document_id):
        try:
            result = ProjectService.delete_document(
                login_account=request.user,
                project_id=project_id,
                document_id=document_id,
            )
        except ProjectServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(message="Project document deleted successfully.", data=result)
