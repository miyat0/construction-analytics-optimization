from rest_framework import status
from rest_framework.response import Response


def success_response(message, data=None, status_code=status.HTTP_200_OK):
    return Response(
        {
            "success": True,
            "message": message,
            "data": data or {},
        },
        status=status_code,
    )


def error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST, error_code=None):
    response = {
        "success": False,
        "message": message,
        "errors": errors or {},
    }

    if error_code:
        response["error_code"] = error_code

    return Response(response, status=status_code)
