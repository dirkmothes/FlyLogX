from __future__ import annotations

from collections import defaultdict
from csv import writer
from io import StringIO
from io import BytesIO
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import AuditEventModel, AircraftModel, FlightModel, OrganizationModel, UnitModel, UserModel
from .domain import (
    Aircraft,
    AircraftCreateRequest,
    AuditEvent,
    DashboardSummary,
    FlightCreateRequest,
    FlightEntry,
    FlightStatus,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    Organization,
    ReviewDecision,
    UnitCreateRequest,
    UnitUpdateRequest,
    Unit,
    UserCreateRequest,
    UserUpdateRequest,
    User,
)


def _flight_to_domain(db: Session, item: FlightModel) -> FlightEntry:
    payload = FlightEntry.model_validate(item).model_dump()
    pilot = db.get(UserModel, item.pilot_id)
    unit = db.get(UnitModel, item.unit_id)
    aircraft = db.get(AircraftModel, item.aircraft_id)
    payload["pilot_name"] = pilot.name if pilot else None
    payload["unit_name"] = unit.name if unit else None
    payload["unit_code"] = unit.code if unit else None
    payload["aircraft_name"] = aircraft.name if aircraft else None
    if item.flight_supervisor_id:
        reviewer = db.get(UserModel, item.flight_supervisor_id)
        payload["flight_supervisor_name"] = reviewer.name if reviewer else item.flight_supervisor_name
    return FlightEntry.model_validate(payload)


def _organization_to_domain(item: OrganizationModel) -> Organization:
    return Organization.model_validate(item)


def _audit_to_domain(item: AuditEventModel) -> AuditEvent:
    return AuditEvent.model_validate(item)


def _unit_to_domain(item: UnitModel) -> Unit:
    return Unit.model_validate(item)


def _user_to_domain(item: UserModel) -> User:
    return User.model_validate(item)


def _actor_name(db: Session, actor_id: str) -> str:
    actor = db.get(UserModel, actor_id)
    return actor.name if actor else actor_id


def _require_organization(db: Session, organization_id: str) -> OrganizationModel:
    organization = db.get(OrganizationModel, organization_id)
    if organization is None or organization.is_deleted:
        raise KeyError("organization_not_found")
    return organization


def _require_unit(db: Session, unit_id: str) -> UnitModel:
    unit = db.get(UnitModel, unit_id)
    if unit is None or unit.is_deleted:
        raise KeyError("unit_not_found")
    return unit


def _require_user(db: Session, user_id: str, *, include_deleted: bool = False) -> UserModel:
    user = db.get(UserModel, user_id)
    if user is None or (user.is_deleted and not include_deleted):
        raise KeyError("user_not_found")
    return user


def _is_test_user(user: UserModel) -> bool:
    name = (user.name or "").strip().lower()
    email = (user.email or "").strip().lower()
    return (
        email.startswith("crud-")
        or email.startswith("test-")
        or "crud" in name
        or "updated name" in name
    )


def list_organizations(db: Session) -> list[Organization]:
    rows = db.scalars(select(OrganizationModel).where(OrganizationModel.is_deleted.is_(False)).order_by(OrganizationModel.name)).all()
    return [_organization_to_domain(row) for row in rows]


def list_users(db: Session) -> list[User]:
    rows = db.scalars(select(UserModel).order_by(UserModel.is_deleted.asc(), UserModel.active.desc(), UserModel.name)).all()
    rows = [row for row in rows if not _is_test_user(row)]
    return [_user_to_domain(row) for row in rows]


def list_units(db: Session) -> list[Unit]:
    rows = db.scalars(select(UnitModel).where(UnitModel.is_deleted.is_(False)).order_by(UnitModel.code)).all()
    return [_unit_to_domain(row) for row in rows]


def list_aircraft(db: Session) -> list[Aircraft]:
    rows = db.scalars(select(AircraftModel).where(AircraftModel.is_deleted.is_(False))).all()
    return [Aircraft.model_validate(row) for row in rows]


def create_organization(db: Session, payload: OrganizationCreateRequest, actor_id: str) -> Organization:
    if payload.parent_id is not None:
        _require_organization(db, payload.parent_id)

    organization = OrganizationModel(
        id=f"org-{uuid4().hex[:12]}",
        name=payload.name,
        parent_id=payload.parent_id,
    )
    db.add(organization)
    db.flush()
    append_audit(
        db,
        organization_id=organization.id,
        entity_type="organization",
        entity_id=organization.id,
        action="created",
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        after_state=Organization.model_validate(organization).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(organization)
    return Organization.model_validate(organization)


def update_organization(
    db: Session,
    organization_id: str,
    payload: OrganizationUpdateRequest,
    actor_id: str,
) -> Organization:
    organization = _require_organization(db, organization_id)
    before = Organization.model_validate(organization).model_dump(mode="json")
    changes = payload.model_dump(exclude_unset=True)

    if "parent_id" in changes and changes["parent_id"] is not None:
        if changes["parent_id"] == organization.id:
            raise KeyError("organization_parent_invalid")
        _require_organization(db, changes["parent_id"])

    if "name" in changes and changes["name"] is not None:
        organization.name = changes["name"]
    if "parent_id" in changes:
        organization.parent_id = changes["parent_id"]
    if "is_deleted" in changes and changes["is_deleted"] is not None:
        organization.is_deleted = changes["is_deleted"]

    db.flush()
    after = Organization.model_validate(organization).model_dump(mode="json")
    action = "updated"
    if before["is_deleted"] is False and after["is_deleted"] is True:
        action = "deleted"
    elif before["is_deleted"] is True and after["is_deleted"] is False:
        action = "restored"

    append_audit(
        db,
        organization_id=organization.id,
        entity_type="organization",
        entity_id=organization.id,
        action=action,
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        before_state=before,
        after_state=after,
    )
    db.commit()
    db.refresh(organization)
    return Organization.model_validate(organization)


def delete_organization(db: Session, organization_id: str, actor_id: str) -> Organization:
    return update_organization(db, organization_id, OrganizationUpdateRequest(is_deleted=True), actor_id)


def create_unit(db: Session, payload: UnitCreateRequest, actor_id: str) -> Unit:
    _require_organization(db, payload.organization_id)
    existing = db.scalar(select(UnitModel).where(UnitModel.code == payload.code))
    if existing is not None and not existing.is_deleted:
        raise KeyError("unit_code_exists")
    unit = UnitModel(
        id=f"unit-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        name=payload.name,
        code=payload.code,
    )
    db.add(unit)
    db.flush()
    append_audit(
        db,
        organization_id=unit.organization_id,
        entity_type="unit",
        entity_id=unit.id,
        action="created",
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        after_state=Unit.model_validate(unit).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(unit)
    return Unit.model_validate(unit)


def update_unit(db: Session, unit_id: str, payload: UnitUpdateRequest, actor_id: str) -> Unit:
    unit = _require_unit(db, unit_id)
    before = Unit.model_validate(unit).model_dump(mode="json")
    changes = payload.model_dump(exclude_unset=True)

    if "organization_id" in changes and changes["organization_id"] is not None:
        _require_organization(db, changes["organization_id"])
    if "organization_id" in changes:
        unit.organization_id = changes["organization_id"]
    if "name" in changes and changes["name"] is not None:
        unit.name = changes["name"]
    if "code" in changes and changes["code"] is not None:
        existing = db.scalar(select(UnitModel).where(UnitModel.code == changes["code"], UnitModel.id != unit.id))
        if existing is not None and not existing.is_deleted:
            raise KeyError("unit_code_exists")
        unit.code = changes["code"]
    if "is_deleted" in changes and changes["is_deleted"] is not None:
        unit.is_deleted = changes["is_deleted"]

    db.flush()
    after = Unit.model_validate(unit).model_dump(mode="json")
    action = "updated"
    if before["is_deleted"] is False and after["is_deleted"] is True:
        action = "deleted"
    elif before["is_deleted"] is True and after["is_deleted"] is False:
        action = "restored"

    append_audit(
        db,
        organization_id=unit.organization_id,
        entity_type="unit",
        entity_id=unit.id,
        action=action,
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        before_state=before,
        after_state=after,
    )
    db.commit()
    db.refresh(unit)
    return Unit.model_validate(unit)


def delete_unit(db: Session, unit_id: str, actor_id: str) -> Unit:
    return update_unit(db, unit_id, UnitUpdateRequest(is_deleted=True), actor_id)


def create_user(db: Session, payload: UserCreateRequest, actor_id: str) -> User:
    _require_organization(db, payload.organization_id)
    if payload.unit_id is not None:
        unit = _require_unit(db, payload.unit_id)
        if unit.organization_id != payload.organization_id:
            raise KeyError("unit_organization_mismatch")

    existing = db.scalar(select(UserModel).where(func.lower(UserModel.email) == payload.email.lower()))
    if existing is not None and not existing.is_deleted:
        raise KeyError("user_email_exists")

    from .core.security import hash_password

    user = UserModel(
        id=f"user-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        unit_id=payload.unit_id,
        role=payload.role,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        active=payload.active,
    )
    db.add(user)
    db.flush()
    append_audit(
        db,
        organization_id=user.organization_id,
        entity_type="user",
        entity_id=user.id,
        action="created",
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        after_state=User.model_validate(user).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(user)
    return User.model_validate(user)


def update_user(db: Session, user_id: str, payload: UserUpdateRequest, actor_id: str) -> User:
    user = _require_user(db, user_id, include_deleted=True)
    changes = payload.model_dump(exclude_unset=True)
    before = User.model_validate(user).model_dump(mode="json")

    if user.id == actor_id and (changes.get("active") is False or changes.get("is_deleted") is True):
        raise KeyError("cannot_delete_self")

    if "organization_id" in changes and changes["organization_id"] is not None:
        _require_organization(db, changes["organization_id"])
        if "unit_id" not in changes and user.unit_id is not None:
            current_unit = db.get(UnitModel, user.unit_id)
            if current_unit is None or current_unit.organization_id != changes["organization_id"]:
                user.unit_id = None
    if "unit_id" in changes and changes["unit_id"] is not None:
        unit = _require_unit(db, changes["unit_id"])
        target_org_id = changes.get("organization_id", user.organization_id)
        if unit.organization_id != target_org_id:
            raise KeyError("unit_organization_mismatch")

    if "organization_id" in changes:
        user.organization_id = changes["organization_id"]
    if "unit_id" in changes:
        user.unit_id = changes["unit_id"]
    if "role" in changes and changes["role"] is not None:
        user.role = changes["role"]
    if "name" in changes and changes["name"] is not None:
        user.name = changes["name"]
    if "email" in changes and changes["email"] is not None:
        existing = db.scalar(select(UserModel).where(func.lower(UserModel.email) == changes["email"].lower(), UserModel.id != user.id))
        if existing is not None and not existing.is_deleted:
            raise KeyError("user_email_exists")
        user.email = changes["email"]
    if "password" in changes and changes["password"]:
        from .core.security import hash_password

        user.password_hash = hash_password(changes["password"])
    if "active" in changes and changes["active"] is not None:
        user.active = changes["active"]
    if "is_deleted" in changes and changes["is_deleted"] is not None:
        user.is_deleted = changes["is_deleted"]
        if changes["is_deleted"]:
            user.active = False
        elif changes.get("active") is None:
            user.active = True

    db.flush()
    after = User.model_validate(user).model_dump(mode="json")
    action = "updated"
    if before["is_deleted"] is False and after["is_deleted"] is True:
        action = "deleted"
    elif before["is_deleted"] is True and after["is_deleted"] is False:
        action = "restored"
    elif before["active"] is True and after["active"] is False:
        action = "deactivated"
    elif before["active"] is False and after["active"] is True:
        action = "activated"

    append_audit(
        db,
        organization_id=user.organization_id,
        entity_type="user",
        entity_id=user.id,
        action=action,
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        before_state=before,
        after_state=after,
    )
    db.commit()
    db.refresh(user)
    return User.model_validate(user)


def delete_user(db: Session, user_id: str, actor_id: str) -> User:
    if user_id == actor_id:
        raise KeyError("cannot_delete_self")
    return update_user(db, user_id, UserUpdateRequest(active=False, is_deleted=True), actor_id)


def create_aircraft(db: Session, payload: AircraftCreateRequest, actor_id: str) -> Aircraft:
    aircraft = AircraftModel(
        id=f"aircraft-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        owner_unit_id=payload.owner_unit_id,
        name=payload.name,
        identifier=payload.identifier,
        manufacturer=payload.manufacturer,
        model=payload.model,
        serial_number=payload.serial_number,
        category=payload.category,
        aircraft_type=payload.aircraft_type,
        uas_class=payload.uas_class,
        weight_kg=payload.weight_kg,
        use_case=payload.use_case,
        registration_number=payload.registration_number,
        internal_identifier=payload.internal_identifier,
        battery_type=payload.battery_type,
        battery_count=payload.battery_count,
        energy_source=payload.energy_source,
        payload=payload.payload,
        max_duration_minutes=payload.max_duration_minutes,
        operating_hours=payload.operating_hours,
        maintenance_status=payload.maintenance_status,
        last_maintenance=payload.last_maintenance,
        next_maintenance=payload.next_maintenance,
        release_status=payload.release_status,
        availability=payload.availability,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(aircraft)
    db.flush()
    append_audit(
        db,
        organization_id=aircraft.organization_id,
        entity_type="aircraft",
        entity_id=aircraft.id,
        action="created",
        actor_id=actor_id,
        actor_name=db.get(UserModel, actor_id).name,
        after_state=Aircraft.model_validate(aircraft).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(aircraft)
    return Aircraft.model_validate(aircraft)


def list_flights(
    db: Session,
    organization_id: str | None = None,
    user_id: str | None = None,
    aircraft_id: str | None = None,
    status: FlightStatus | None = None,
) -> list[FlightEntry]:
    stmt = select(FlightModel).where(FlightModel.is_deleted.is_(False))
    if organization_id:
        stmt = stmt.where(FlightModel.organization_id == organization_id)
    if user_id:
        stmt = stmt.where(FlightModel.pilot_id == user_id)
    if aircraft_id:
        stmt = stmt.where(FlightModel.aircraft_id == aircraft_id)
    if status:
        stmt = stmt.where(FlightModel.status == status)
    stmt = stmt.order_by(FlightModel.date.desc(), FlightModel.start_time.desc())
    return [_flight_to_domain(db, row) for row in db.scalars(stmt).all()]


def get_flight(db: Session, flight_id: str) -> FlightEntry | None:
    row = db.get(FlightModel, flight_id)
    if row is None or row.is_deleted:
        return None
    return _flight_to_domain(db, row)


def create_flight(db: Session, payload: FlightCreateRequest, actor_id: str) -> FlightEntry:
    aircraft = db.get(AircraftModel, payload.aircraft_id)
    if aircraft is None or aircraft.is_deleted:
        raise KeyError("aircraft_not_found")

    flight = FlightModel(
        id=f"flight-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        unit_id=payload.unit_id,
        pilot_id=payload.pilot_id,
        aircraft_id=payload.aircraft_id,
        aircraft_identifier=payload.aircraft_identifier or aircraft.identifier,
        category=payload.category,
        flight_type=payload.flight_type,
        status=FlightStatus.draft,
        date=payload.date,
        start_time=payload.start_time,
        landing_time=payload.landing_time,
        flight_count=payload.flight_count,
        duration_minutes=payload.duration_minutes,
        day_flight=payload.day_flight,
        night_flight=payload.night_flight,
        location=payload.location,
        coordinates=payload.coordinates,
        special_notes=payload.special_notes,
        remarks=payload.remarks,
        flight_supervisor_name=payload.flight_supervisor_name,
        flight_supervisor_id=payload.flight_supervisor_id,
        flight_supervisor_signature=payload.flight_supervisor_signature,
        previous_flights=payload.previous_flights,
        previous_hours=payload.previous_hours,
        monthly_carryover=payload.monthly_carryover,
        yearly_carryover=payload.yearly_carryover,
        total_flights=payload.previous_flights + payload.flight_count,
        total_hours=round(payload.previous_hours + payload.duration_minutes / 60.0, 2),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        created_by=actor_id,
        updated_by=actor_id,
    )
    db.add(flight)
    db.flush()
    append_audit(
        db,
        organization_id=flight.organization_id,
        entity_type="flight_entry",
        entity_id=flight.id,
        action="created",
        actor_id=actor_id,
        actor_name=db.get(UserModel, actor_id).name,
        after_state=_flight_to_domain(db, flight).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(flight)
    return _flight_to_domain(db, flight)


def submit_flight(db: Session, flight_id: str, actor_id: str) -> FlightEntry:
    flight = db.get(FlightModel, flight_id)
    if flight is None or flight.is_deleted:
        raise KeyError("flight_not_found")
    before = _flight_to_domain(db, flight).model_dump(mode="json")
    flight.status = FlightStatus.submitted
    flight.submitted_at = datetime.now(timezone.utc)
    flight.updated_at = datetime.now(timezone.utc)
    flight.updated_by = actor_id
    append_audit(
        db,
        organization_id=flight.organization_id,
        entity_type="flight_entry",
        entity_id=flight.id,
        action="submitted",
        actor_id=actor_id,
        actor_name=db.get(UserModel, actor_id).name,
        before_state=before,
        after_state=_flight_to_domain(db, flight).model_dump(mode="json"),
    )
    db.commit()
    db.refresh(flight)
    return _flight_to_domain(db, flight)


def review_flight(
    db: Session,
    flight_id: str,
    actor_id: str,
    decision: ReviewDecision,
    comment: str | None = None,
    signature: str | None = None,
) -> FlightEntry:
    flight = db.get(FlightModel, flight_id)
    if flight is None or flight.is_deleted:
        raise KeyError("flight_not_found")
    before = _flight_to_domain(db, flight).model_dump(mode="json")
    flight.reviewed_at = datetime.now(timezone.utc)
    flight.reviewed_by = actor_id
    flight.updated_at = datetime.now(timezone.utc)
    flight.updated_by = actor_id
    flight.flight_supervisor_signature = signature or flight.flight_supervisor_signature
    flight.rejection_reason = comment if decision == ReviewDecision.reject else None
    if decision == ReviewDecision.approve:
        flight.status = FlightStatus.approved
        flight.approved_at = datetime.now(timezone.utc)
        flight.approved_by = actor_id
    else:
        flight.status = FlightStatus.rejected
        flight.rejected_by = actor_id
    append_audit(
        db,
        organization_id=flight.organization_id,
        entity_type="flight_entry",
        entity_id=flight.id,
        action=decision.value,
        actor_id=actor_id,
        actor_name=db.get(UserModel, actor_id).name,
        before_state=before,
        after_state=_flight_to_domain(db, flight).model_dump(mode="json"),
        comment=comment,
    )
    db.commit()
    db.refresh(flight)
    return _flight_to_domain(db, flight)


def append_audit(
    db: Session,
    organization_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str,
    actor_name: str,
    before_state: dict | None = None,
    after_state: dict | None = None,
    comment: str | None = None,
) -> AuditEvent:
    event = AuditEventModel(
        id=f"audit-{uuid4().hex[:12]}",
        organization_id=organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_name=actor_name,
        timestamp=datetime.now(timezone.utc),
        before_state=before_state,
        after_state=after_state,
        comment=comment,
    )
    db.add(event)
    db.flush()
    return _audit_to_domain(event)


def dashboard_for_user(db: Session, user_id: str) -> DashboardSummary:
    user = db.get(UserModel, user_id)
    if user is None or user.is_deleted:
        raise KeyError("user_not_found")
    flights = list_flights(db, organization_id=user.organization_id, user_id=user_id)
    return build_dashboard_summary(flights, title=f"{user.name} Dashboard")


def dashboard_for_unit(db: Session, unit_id: str) -> DashboardSummary:
    unit = db.get(UnitModel, unit_id)
    if unit is None or unit.is_deleted:
        raise KeyError("unit_not_found")
    flights = list_flights(db, organization_id=unit.organization_id)
    flights = [flight for flight in flights if flight.unit_id == unit_id]
    summary = build_dashboard_summary(flights, title=f"Einheit {unit.name}")
    summary.unit_comparison = [
        {"label": "Piloten", "value": len({flight.pilot_id for flight in flights})},
        {"label": "Flüge", "value": len(flights)},
        {"label": "Freigaben", "value": len([flight for flight in flights if flight.status == FlightStatus.approved])},
    ]
    summary.pending_reviews = len([flight for flight in flights if flight.status == FlightStatus.submitted])
    summary.incomplete_entries = len([flight for flight in flights if flight.status == FlightStatus.draft])
    return summary


def build_dashboard_summary(flights: list[FlightEntry], title: str) -> DashboardSummary:
    total_minutes = sum(flight.duration_minutes for flight in flights if flight.status != FlightStatus.draft)
    total_hours = round(total_minutes / 60.0, 2)
    total_flights = sum(flight.flight_count for flight in flights if flight.status != FlightStatus.draft)
    open_entries = len([flight for flight in flights if flight.status in {FlightStatus.draft, FlightStatus.submitted}])
    rejected_entries = len([flight for flight in flights if flight.status == FlightStatus.rejected])
    approved_entries = len([flight for flight in flights if flight.status == FlightStatus.approved])

    by_category: dict[str, float] = defaultdict(float)
    by_aircraft: dict[str, float] = defaultdict(float)
    by_month: dict[str, float] = defaultdict(float)
    for flight in flights:
        if flight.status == FlightStatus.draft:
            continue
        duration_hours = round(flight.duration_minutes / 60.0, 2)
        by_category[flight.category.value] += duration_hours
        by_aircraft[flight.aircraft_identifier] += duration_hours
        by_month[flight.date.strftime("%Y-%m")] += duration_hours

    recent = sorted(flights, key=lambda item: (item.date, item.start_time), reverse=True)[:5]
    return DashboardSummary(
        title=title,
        total_hours=total_hours,
        total_flights=total_flights,
        open_entries=open_entries,
        rejected_entries=rejected_entries,
        approved_entries=approved_entries,
        by_category=dict(by_category),
        by_aircraft=dict(by_aircraft),
        by_month=dict(by_month),
        recent_flights=recent,
        incomplete_entries=len([flight for flight in flights if flight.status == FlightStatus.draft]),
        pending_reviews=len([flight for flight in flights if flight.status == FlightStatus.submitted]),
    )


def audit_for_organization(db: Session, organization_id: str | None = None) -> list[AuditEvent]:
    stmt = select(AuditEventModel)
    if organization_id:
        stmt = stmt.where(AuditEventModel.organization_id == organization_id)
    stmt = stmt.order_by(AuditEventModel.timestamp.desc())
    return [_audit_to_domain(row) for row in db.scalars(stmt).all()]


def export_summary(format_name: str, db: Session) -> dict[str, str | int]:
    flights_count = db.query(FlightModel).filter(FlightModel.is_deleted.is_(False)).count()
    return {
        "format": format_name,
        "entries": flights_count,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "message": "Export pipeline active; PDF/CSV output is available and XLSX can be added as a follow-up extension.",
    }


def export_flights_csv(db: Session, organization_id: str | None = None, user_id: str | None = None, status: FlightStatus | None = None) -> str:
    flights = list_flights(db, organization_id=organization_id, user_id=user_id, status=status)
    buffer = StringIO()
    csv_writer = writer(buffer)
    csv_writer.writerow(
        [
            "flight_number",
            "date",
            "pilot",
            "unit",
            "aircraft",
            "category",
            "status",
            "duration_minutes",
            "location",
            "coordinates",
            "reviewer",
        ]
    )
    for flight in flights:
        csv_writer.writerow(
            [
                flight.flight_number or flight.id,
                flight.date.isoformat(),
                flight.pilot_name or flight.pilot_id,
                flight.unit_code or flight.unit_name or flight.unit_id,
                flight.aircraft_name or flight.aircraft_identifier,
                flight.category.value,
                flight.status.value,
                flight.duration_minutes,
                flight.location,
                flight.coordinates or "",
                flight.flight_supervisor_name or "",
            ]
        )
    return buffer.getvalue()


def export_flights_pdf(db: Session, organization_id: str | None = None, user_id: str | None = None, status: FlightStatus | None = None) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    flights = list_flights(db, organization_id=organization_id, user_id=user_id, status=status)
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("FlyLogX Flugzeitennachweisheft", styles["Title"]),
        Spacer(1, 10),
        Paragraph("Revisionssichere Übersicht der Flugeinträge", styles["Heading2"]),
        Spacer(1, 12),
    ]

    rows = [
        [
            "Flugnummer",
            "Datum",
            "Pilot",
            "Einheit",
            "Luftfahrzeug",
            "Kategorie",
            "Status",
            "Dauer",
            "Ort",
        ]
    ]
    for flight in flights:
        rows.append(
            [
                flight.flight_number or flight.id,
                flight.date.isoformat(),
                flight.pilot_name or flight.pilot_id,
                flight.unit_code or flight.unit_name or flight.unit_id,
                flight.aircraft_name or flight.aircraft_identifier,
                flight.category.value,
                flight.status.value,
                f"{flight.duration_minutes} min",
                flight.location,
            ]
        )

    table = Table(rows, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15253d")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d7dee8")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7fb")]),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 14))
    story.append(Paragraph(f"Einträge gesamt: {len(flights)}", styles["Normal"]))
    story.append(Paragraph(f"Erstellt am: {datetime.now(timezone.utc).isoformat()}", styles["Normal"]))
    document.build(story)
    return buffer.getvalue()
