from rest_framework.views import exception_handler


def _extract_message(data, default_message):
    if isinstance(data, dict):
        detail = data.get("detail")

        if isinstance(detail, (list, tuple)) and detail:
            return str(detail[0])

        if detail:
            return str(detail)

    if data:
        return str(data)

    return default_message


def authorization_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return None

    if response.status_code == 401:
        message = _extract_message(response.data, "Unauthorized.")
        response.data = {
            "success": False,
            "message": message,
            "errors": {"authentication": [message]},
            "error_code": "not_authenticated",
        }
    elif response.status_code == 403:
        message = _extract_message(response.data, "Forbidden.")
        response.data = {
            "success": False,
            "message": message,
            "errors": {"permission": [message]},
            "error_code": "permission_denied",
        }

    return response
