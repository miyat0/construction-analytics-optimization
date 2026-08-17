from rest_framework import serializers


class AttendanceHistoryQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, min_value=1, max_value=30, default=10)


class AttendanceClockInSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
