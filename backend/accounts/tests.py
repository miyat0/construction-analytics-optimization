from django.test import TestCase
from rest_framework.test import APIClient


class LoginApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_rejects_unknown_user(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "nobody@example.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)


class ProjectApiAuthTests(TestCase):
    def test_projects_without_token_is_401(self):
        client = APIClient()
        response = client.get("/api/projects/")
        self.assertEqual(response.status_code, 401)
