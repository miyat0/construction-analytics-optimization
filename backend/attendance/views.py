from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import IsWorker
from accounts.responses import error_response, success_response

from .serializers import AttendanceClockInSerializer, AttendanceHistoryQuerySerializer
from .services import AttendanceService, AttendanceServiceError


class WorkerAttendanceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsWorker]

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
                message="Only Worker can manage attendance.",
                errors={"permission": ["Only Worker can manage attendance."]},
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="permission_denied",
            )

        return super().handle_exception(exc)


class WorkerAttendanceStatusView(WorkerAttendanceAPIView):
    def get(self, request):
        serializer = AttendanceHistoryQuerySerializer(data=request.query_params)

        if not serializer.is_valid():
            return error_response(
                message="Attendance request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            dashboard_data = AttendanceService.get_worker_dashboard(
                login_account=request.user,
                history_limit=serializer.validated_data["limit"],
            )
        except AttendanceServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Attendance status retrieved successfully.",
            data=dashboard_data,
        )


class WorkerClockInView(WorkerAttendanceAPIView):
    def post(self, request):
        serializer = AttendanceClockInSerializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                message="Clock in validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            attendance_data = AttendanceService.clock_in(
                login_account=request.user,
                assignment_id=serializer.validated_data.get("assignment_id"),
            )
        except AttendanceServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Clock in recorded successfully.",
            data=attendance_data,
            status_code=status.HTTP_201_CREATED,
        )


class WorkerClockOutView(WorkerAttendanceAPIView):
    def post(self, request):
        try:
            attendance_data = AttendanceService.clock_out(login_account=request.user)
        except AttendanceServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Clock out recorded successfully.",
            data=attendance_data,
        )


class WorkerAttendanceHistoryView(WorkerAttendanceAPIView):
    def get(self, request):
        serializer = AttendanceHistoryQuerySerializer(data=request.query_params)

        if not serializer.is_valid():
            return error_response(
                message="Attendance history request validation failed.",
                errors=serializer.errors,
                error_code="validation_error",
            )

        try:
            history_data = AttendanceService.get_history(
                login_account=request.user,
                limit=serializer.validated_data["limit"],
            )
        except AttendanceServiceError as exc:
            return error_response(
                message=exc.message,
                errors=exc.errors,
                status_code=exc.status_code,
                error_code=exc.error_code,
            )

        return success_response(
            message="Attendance history retrieved successfully.",
            data=history_data,
        )
