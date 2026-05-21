import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_demo_user(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "pilot@flylogx.local", "password": "flylogx-demo"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
