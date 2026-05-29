from uuid import uuid4

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
        json={"username": "pilot", "password": "flylogx-demo"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body


def test_admin_me_has_no_membership(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    response = client.get("/api/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "admin"
    assert body["organization_id"] is None
    assert body["unit_id"] is None

    flights = client.get("/api/flights")
    assert flights.status_code == 200
    assert isinstance(flights.json(), list)


def test_admin_can_create_global_user_without_scope(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    response = client.post(
        "/api/users",
        json={
            "organization_id": None,
            "unit_id": None,
            "role": "admin",
            "username": "global-admin-test",
            "first_name": "Global",
            "last_name": "Admin",
            "email": "global-admin-test@flylogx.local",
            "password": "flylogx-demo",
            "active": True,
            "supervised_organization_ids": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "admin"
    assert body["organization_id"] is None
    assert body["unit_id"] is None


def test_pilot_requires_organization_and_unit(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    response = client.post(
        "/api/users",
        json={
            "organization_id": None,
            "unit_id": None,
            "role": "pilot",
            "username": "pilot-scope-test",
            "first_name": "Pilot",
            "last_name": "Scope",
            "email": "pilot-scope-test@flylogx.local",
            "password": "flylogx-demo",
            "active": True,
            "supervised_organization_ids": [],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Organization is required for pilot and supervisor users"


def test_unit_delete_lists_blocking_area(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    suffix = uuid4().hex[:8]
    org_response = client.post("/api/organizations", json={"name": f"Linked Org {suffix}"})
    assert org_response.status_code == 200
    organization_id = org_response.json()["id"]

    unit_response = client.post(
        "/api/units",
        json={
            "organization_id": organization_id,
            "name": f"Linked Unit {suffix}",
        },
    )
    assert unit_response.status_code == 200
    unit_id = unit_response.json()["id"]

    user_response = client.post(
        "/api/users",
        json={
            "organization_id": organization_id,
            "unit_id": unit_id,
            "role": "pilot",
            "username": f"linked-user-{suffix}",
            "first_name": "Linked",
            "last_name": "User",
            "email": f"linked-user-{suffix}@flylogx.local",
            "password": "flylogx-demo",
            "active": True,
            "supervised_organization_ids": [],
        },
    )
    assert user_response.status_code == 200

    delete_response = client.delete(f"/api/units/{unit_id}")
    assert delete_response.status_code == 409
    assert "Users" in delete_response.json()["detail"]


def test_unit_delete_allows_approved_flights(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    organizations = client.get("/api/organizations")
    assert organizations.status_code == 200
    organization_id = organizations.json()[0]["id"]

    unit_response = client.post(
        "/api/units",
        json={
            "organization_id": organization_id,
            "name": f"Approved Only Unit {uuid4().hex[:8]}",
        },
    )
    assert unit_response.status_code == 200
    unit_id = unit_response.json()["id"]

    aircraft = client.get("/api/aircraft")
    assert aircraft.status_code == 200
    aircraft_id = next(item["id"] for item in aircraft.json() if item["organization_id"] == organization_id)

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    pilot_id = me_response.json()["id"]

    flight_response = client.post(
        "/api/flights",
        json={
            "organization_id": organization_id,
            "unit_id": unit_id,
            "pilot_id": pilot_id,
            "aircraft_id": aircraft_id,
            "aircraft_identifier": next(item["identifier"] for item in aircraft.json() if item["id"] == aircraft_id),
            "category": "U Flights",
            "flight_type": "Approval Snapshot Test",
            "date": "2026-05-29",
            "flight_count": 1,
            "duration_minutes": 10,
            "day_flight": True,
            "night_flight": False,
            "location": "Test Field",
            "coordinates": None,
            "special_notes": None,
            "remarks": None,
            "flight_supervisor_name": None,
            "flight_supervisor_id": None,
            "flight_supervisor_signature": None,
            "previous_flights": 0,
            "previous_hours": 0,
            "monthly_carryover": 0,
            "yearly_carryover": 0,
        },
    )
    assert flight_response.status_code == 200
    flight_id = flight_response.json()["id"]

    submit_response = client.post(f"/api/flights/{flight_id}/submit")
    assert submit_response.status_code == 200

    review_response = client.post(
        f"/api/flights/{flight_id}/review",
        json={"decision": "approve", "comment": None, "signature": None},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert review_response.json()["unit_name"] is not None
    assert review_response.json()["unit_code"] is not None

    delete_response = client.delete(f"/api/units/{unit_id}")
    assert delete_response.status_code == 200

    flight_after_delete = client.get(f"/api/flights/{flight_id}")
    assert flight_after_delete.status_code == 200
    body = flight_after_delete.json()
    assert body["unit_name"] is not None
    assert body["unit_code"] is not None


def test_admin_can_edit_blocked_user_and_delete_in_any_state(client):
    login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "flylogx-demo"},
    )
    assert login.status_code == 200

    organizations = client.get("/api/organizations")
    assert organizations.status_code == 200
    organization_id = organizations.json()[0]["id"]

    units = client.get("/api/units")
    assert units.status_code == 200
    unit_id = next(unit["id"] for unit in units.json() if unit["organization_id"] == organization_id)

    suffix = uuid4().hex[:8]
    create_response = client.post(
        "/api/users",
        json={
            "organization_id": organization_id,
            "unit_id": unit_id,
            "role": "pilot",
            "username": f"state-flow-{suffix}",
            "first_name": "State",
            "last_name": "Flow",
            "email": f"state-flow-{suffix}@flylogx.local",
            "password": "flylogx-demo",
            "active": True,
            "supervised_organization_ids": [],
        },
    )
    assert create_response.status_code == 200
    user_id = create_response.json()["id"]

    block_response = client.patch(
        f"/api/users/{user_id}",
        json={"active": False, "is_deleted": True},
    )
    assert block_response.status_code == 200
    assert block_response.json()["is_deleted"] is True

    edit_response = client.patch(
        f"/api/users/{user_id}",
        json={
            "first_name": "Restored",
            "last_name": "Pilot",
            "active": True,
            "is_deleted": False,
        },
    )
    assert edit_response.status_code == 200
    assert edit_response.json()["is_deleted"] is False
    assert edit_response.json()["active"] is True

    reblock_response = client.patch(
        f"/api/users/{user_id}",
        json={"active": False, "is_deleted": True},
    )
    assert reblock_response.status_code == 200
    assert reblock_response.json()["is_deleted"] is True

    delete_response = client.delete(f"/api/users/{user_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["is_deleted"] is True
