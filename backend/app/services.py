from __future__ import annotations

from collections import defaultdict
from csv import writer
from io import StringIO
from io import BytesIO
from datetime import datetime, timezone
import re
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import (
    AuditEventModel,
    AircraftModel,
    FlightModel,
    OrganizationModel,
    OrganizationSupervisorModel,
    UnitModel,
    UserModel,
)
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
    RoleName,
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


def _user_to_domain(db: Session, item: UserModel) -> User:
    payload = User.model_validate(item).model_dump()
    payload["supervised_organization_ids"] = supervisor_organization_ids(db, item.id)
    return User.model_validate(payload)


def _actor_name(db: Session, actor_id: str) -> str:
    actor = db.get(UserModel, actor_id)
    return actor.name if actor else actor_id


def _require_organization(db: Session, organization_id: str) -> OrganizationModel:
    organization = db.get(OrganizationModel, organization_id)
    if organization is None or organization.is_deleted:
        raise KeyError("organization_not_found")
    return organization


def _require_supervisor(db: Session, user_id: str) -> UserModel:
    user = db.get(UserModel, user_id)
    if user is None or user.is_deleted or user.role != RoleName.supervisor:
        raise KeyError("supervisor_not_found")
    return user


def _validate_organization_ids(db: Session, organization_ids: list[str]) -> None:
    for organization_id in organization_ids:
        _require_organization(db, organization_id)


def _require_unit(db: Session, unit_id: str) -> UnitModel:
    unit = db.get(UnitModel, unit_id)
    if unit is None or unit.is_deleted:
        raise KeyError("unit_not_found")
    return unit


def _normalize_user_name(first_name: str | None, last_name: str | None) -> tuple[str, str, str]:
    normalized_first_name = (first_name or "").strip()
    normalized_last_name = (last_name or "").strip()
    if not normalized_first_name or not normalized_last_name:
        raise KeyError("user_name_required")
    display_name = f"{normalized_first_name} {normalized_last_name}".strip()
    return normalized_first_name, normalized_last_name, display_name


def _normalize_unit_code(name: str, code: str | None = None) -> str:
    candidate = (code or "").strip()
    if candidate:
        return candidate
    fallback = re.sub(r"[^A-Za-z0-9]+", "-", name.strip().lower()).strip("-")
    return fallback.upper() if fallback else f"UNIT-{uuid4().hex[:6].upper()}"


def _unique_unit_code(db: Session, name: str, code: str | None = None, *, exclude_id: str | None = None) -> str:
    base_code = _normalize_unit_code(name, code)
    candidate = base_code
    suffix = 2
    while True:
        stmt = select(UnitModel.id).where(func.lower(UnitModel.code) == candidate.lower())
        if exclude_id is not None:
            stmt = stmt.where(UnitModel.id != exclude_id)
        existing = db.scalar(stmt)
        if existing is None:
            return candidate
        if code:
            raise KeyError("unit_code_exists")
        candidate = f"{base_code}-{suffix}"
        suffix += 1


def organization_has_dependencies(db: Session, organization_id: str) -> bool:
    scope_ids = organization_scope_ids(db, organization_id)
    if scope_ids != {organization_id}:
        return True

    if db.scalar(
        select(OrganizationSupervisorModel.supervisor_user_id).where(OrganizationSupervisorModel.organization_id == organization_id)
    ) is not None:
        return True

    if db.scalar(select(UserModel.id).where(UserModel.organization_id.in_(scope_ids), UserModel.is_deleted.is_(False))) is not None:
        return True

    if db.scalar(select(UnitModel.id).where(UnitModel.organization_id.in_(scope_ids), UnitModel.is_deleted.is_(False))) is not None:
        return True

    if db.scalar(select(AircraftModel.id).where(AircraftModel.organization_id.in_(scope_ids), AircraftModel.is_deleted.is_(False))) is not None:
        return True

    return db.scalar(select(FlightModel.id).where(FlightModel.organization_id.in_(scope_ids), FlightModel.is_deleted.is_(False))) is not None


def unit_has_dependencies(db: Session, unit_id: str) -> bool:
    if db.scalar(select(UserModel.id).where(UserModel.unit_id == unit_id, UserModel.is_deleted.is_(False))) is not None:
        return True

    if db.scalar(select(AircraftModel.id).where(AircraftModel.owner_unit_id == unit_id, AircraftModel.is_deleted.is_(False))) is not None:
        return True

    return db.scalar(select(FlightModel.id).where(FlightModel.unit_id == unit_id, FlightModel.is_deleted.is_(False))) is not None


def _require_user(db: Session, user_id: str, *, include_deleted: bool = False) -> UserModel:
    user = db.get(UserModel, user_id)
    if user is None or (user.is_deleted and not include_deleted):
        raise KeyError("user_not_found")
    return user


def _is_test_user(user: UserModel) -> bool:
    username = (getattr(user, "username", "") or "").strip().lower()
    name = (user.name or "").strip().lower()
    email = (user.email or "").strip().lower()
    return (
        username.startswith("crud-")
        or username.startswith("test-")
        or "crud" in username
        or email.startswith("crud-")
        or email.startswith("test-")
        or "crud" in name
        or "updated name" in name
    )


def organization_scope_ids(db: Session, root_organization_id: str) -> set[str]:
    scope: set[str] = set()
    frontier = {root_organization_id}
    while frontier:
        rows = db.execute(
            select(OrganizationModel.id).where(
                OrganizationModel.parent_id.in_(frontier),
                OrganizationModel.is_deleted.is_(False),
            )
        ).scalars().all()
        next_frontier = {row for row in rows if row not in scope}
        scope.update(frontier)
        frontier = next_frontier - scope
    return scope


def supervisor_organization_ids(db: Session, supervisor_user_id: str) -> list[str]:
    return sorted(
        db.execute(
            select(OrganizationSupervisorModel.organization_id).where(
                OrganizationSupervisorModel.supervisor_user_id == supervisor_user_id
            )
        ).scalars().all()
    )


def supervisor_scope_ids(db: Session, supervisor_user_id: str) -> set[str]:
    roots: set[str] = set()
    for organization_id in supervisor_organization_ids(db, supervisor_user_id):
        organization = db.get(OrganizationModel, organization_id)
        if organization is not None and not organization.is_deleted:
            roots.add(organization_id)
    scope: set[str] = set()
    frontier = roots
    while frontier:
        scope.update(frontier)
        rows = db.execute(
            select(OrganizationModel.id).where(
                OrganizationModel.parent_id.in_(frontier),
                OrganizationModel.is_deleted.is_(False),
            )
        ).scalars().all()
        frontier = {row for row in rows if row not in scope}
    return scope


def accessible_organization_ids(db: Session, user: UserModel) -> set[str]:
    if user.role == RoleName.admin:
        return set(db.execute(select(OrganizationModel.id).where(OrganizationModel.is_deleted.is_(False))).scalars().all())
    if user.role == RoleName.supervisor:
        return supervisor_scope_ids(db, user.id)
    return {user.organization_id}


def organization_in_scope(db: Session, user: UserModel, organization_id: str) -> bool:
    return organization_id in accessible_organization_ids(db, user)


def unit_in_scope(db: Session, user: UserModel, unit_id: str) -> bool:
    unit = db.get(UnitModel, unit_id)
    if unit is None or unit.is_deleted:
        return False
    return organization_in_scope(db, user, unit.organization_id)


def user_in_scope(db: Session, user: UserModel, user_id: str) -> bool:
    target_user = db.get(UserModel, user_id)
    if target_user is None or target_user.is_deleted:
        return False
    return organization_in_scope(db, user, target_user.organization_id)


def list_organizations(db: Session, user: UserModel | None = None) -> list[Organization]:
    stmt = select(OrganizationModel).where(OrganizationModel.is_deleted.is_(False))
    if user is not None and user.role != RoleName.admin:
        stmt = stmt.where(OrganizationModel.id.in_(accessible_organization_ids(db, user)))
    rows = db.scalars(stmt.order_by(OrganizationModel.name)).all()
    return [_organization_to_domain(row) for row in rows]


def list_users(db: Session, user: UserModel | None = None, include_admins: bool = True) -> list[User]:
    stmt = select(UserModel)
    if user is not None and user.role != RoleName.admin:
        stmt = stmt.where(UserModel.organization_id.in_(accessible_organization_ids(db, user)))
        if not include_admins:
            stmt = stmt.where(UserModel.role != RoleName.admin)
    rows = db.scalars(stmt.order_by(UserModel.is_deleted.asc(), UserModel.active.desc(), UserModel.name)).all()
    rows = [row for row in rows if not _is_test_user(row)]
    return [_user_to_domain(db, row) for row in rows]


def list_units(db: Session, user: UserModel | None = None) -> list[Unit]:
    stmt = select(UnitModel).where(UnitModel.is_deleted.is_(False))
    if user is not None and user.role != RoleName.admin:
        stmt = stmt.where(UnitModel.organization_id.in_(accessible_organization_ids(db, user)))
    rows = db.scalars(stmt.order_by(UnitModel.name)).all()
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

    if changes.get("is_deleted") is True and not before["is_deleted"] and organization_has_dependencies(db, organization_id):
        raise KeyError("organization_has_dependencies")

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


def get_supervisor_organization_ids(db: Session, supervisor_user_id: str) -> list[str]:
    return supervisor_organization_ids(db, supervisor_user_id)


def set_supervisor_organization_ids(db: Session, supervisor_user_id: str, organization_ids: list[str]) -> None:
    user = _require_user(db, supervisor_user_id, include_deleted=True)
    db.query(OrganizationSupervisorModel).filter(OrganizationSupervisorModel.supervisor_user_id == supervisor_user_id).delete(synchronize_session=False)
    if user.role != RoleName.supervisor:
        return
    unique_ids = list(dict.fromkeys(organization_ids))
    _validate_organization_ids(db, unique_ids)
    db.add_all(
        [
            OrganizationSupervisorModel(organization_id=organization_id, supervisor_user_id=supervisor_user_id)
            for organization_id in unique_ids
        ]
    )


def create_unit(db: Session, payload: UnitCreateRequest, actor_id: str) -> Unit:
    _require_organization(db, payload.organization_id)
    normalized_code = _unique_unit_code(db, payload.name, payload.code)
    unit = UnitModel(
        id=f"unit-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        name=payload.name,
        code=normalized_code,
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

    if changes.get("is_deleted") is True and not before["is_deleted"] and unit_has_dependencies(db, unit_id):
        raise KeyError("unit_has_dependencies")

    if "organization_id" in changes and changes["organization_id"] is not None:
        _require_organization(db, changes["organization_id"])
    if "organization_id" in changes:
        unit.organization_id = changes["organization_id"]
    if "name" in changes and changes["name"] is not None:
        unit.name = changes["name"]
    if "code" in changes and changes["code"] is not None:
        unit.code = _unique_unit_code(db, unit.name, changes["code"], exclude_id=unit.id)
    elif "name" in changes and changes["name"] is not None:
        unit.code = _normalize_unit_code(unit.name, unit.code)
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

    normalized_username = payload.username.strip()
    normalized_email = payload.email.strip()
    if not normalized_username:
        raise KeyError("user_username_required")
    if not normalized_email:
        raise KeyError("user_email_required")
    normalized_first_name, normalized_last_name, display_name = _normalize_user_name(payload.first_name, payload.last_name)

    existing_username = db.scalar(select(UserModel).where(func.lower(UserModel.username) == normalized_username.lower()))
    if existing_username is not None and not existing_username.is_deleted:
        raise KeyError("user_username_exists")

    existing_email = db.scalar(select(UserModel).where(func.lower(UserModel.email) == normalized_email.lower()))
    if existing_email is not None and not existing_email.is_deleted:
        raise KeyError("user_email_exists")

    from .core.security import hash_password

    user = UserModel(
        id=f"user-{uuid4().hex[:12]}",
        organization_id=payload.organization_id,
        unit_id=payload.unit_id,
        role=payload.role,
        username=normalized_username,
        first_name=normalized_first_name,
        last_name=normalized_last_name,
        name=display_name,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        active=payload.active,
    )
    db.add(user)
    db.flush()
    if user.role == RoleName.supervisor:
        set_supervisor_organization_ids(db, user.id, payload.supervised_organization_ids or [user.organization_id])
    domain_user = _user_to_domain(db, user)
    append_audit(
        db,
        organization_id=user.organization_id,
        entity_type="user",
        entity_id=user.id,
        action="created",
        actor_id=actor_id,
        actor_name=_actor_name(db, actor_id),
        after_state=domain_user.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(user)
    return _user_to_domain(db, user)


def update_user(db: Session, user_id: str, payload: UserUpdateRequest, actor_id: str) -> User:
    user = _require_user(db, user_id, include_deleted=True)
    changes = payload.model_dump(exclude_unset=True)
    before = User.model_validate(user).model_dump(mode="json")
    previous_role = user.role

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
    if "username" in changes and changes["username"] is not None:
        normalized_username = changes["username"].strip()
        if not normalized_username:
            raise KeyError("user_username_required")
        existing = db.scalar(select(UserModel).where(func.lower(UserModel.username) == normalized_username.lower(), UserModel.id != user.id))
        if existing is not None and not existing.is_deleted:
            raise KeyError("user_username_exists")
        user.username = normalized_username
    if "first_name" in changes and changes["first_name"] is not None:
        normalized_first_name = changes["first_name"].strip()
        if not normalized_first_name:
            raise KeyError("user_name_required")
        user.first_name = normalized_first_name
    if "last_name" in changes and changes["last_name"] is not None:
        normalized_last_name = changes["last_name"].strip()
        if not normalized_last_name:
            raise KeyError("user_name_required")
        user.last_name = normalized_last_name
    if "first_name" in changes or "last_name" in changes:
        _, _, display_name = _normalize_user_name(user.first_name, user.last_name)
        user.name = display_name
    if "email" in changes and changes["email"] is not None:
        normalized_email = changes["email"].strip()
        if not normalized_email:
            raise KeyError("user_email_required")
        existing = db.scalar(select(UserModel).where(func.lower(UserModel.email) == normalized_email.lower(), UserModel.id != user.id))
        if existing is not None and not existing.is_deleted:
            raise KeyError("user_email_exists")
        user.email = normalized_email
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
    if "role" in changes and changes["role"] is not None and changes["role"] != RoleName.supervisor:
        set_supervisor_organization_ids(db, user.id, [])
    if user.role == RoleName.supervisor:
        org_ids = changes.get("supervised_organization_ids")
        if org_ids is not None:
            set_supervisor_organization_ids(db, user.id, org_ids or [user.organization_id])
        elif previous_role != RoleName.supervisor:
            set_supervisor_organization_ids(db, user.id, [user.organization_id])
    after = _user_to_domain(db, user).model_dump(mode="json")
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
    return _user_to_domain(db, user)


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
        last_maintenance=payload.last_maintenance,
        next_maintenance=payload.next_maintenance,
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
    stmt = stmt.order_by(FlightModel.date.desc(), FlightModel.created_at.desc())
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
    return build_dashboard_summary(flights, title=f"{user.name} dashboard")


def dashboard_for_unit(db: Session, unit_id: str) -> DashboardSummary:
    unit = db.get(UnitModel, unit_id)
    if unit is None or unit.is_deleted:
        raise KeyError("unit_not_found")
    flights = list_flights(db, organization_id=unit.organization_id)
    flights = [flight for flight in flights if flight.unit_id == unit_id]
    summary = build_dashboard_summary(flights, title=f"Unit {unit.name}")
    summary.unit_comparison = [
        {"label": "Pilots", "value": len({flight.pilot_id for flight in flights})},
        {"label": "Flights", "value": len(flights)},
        {"label": "Approvals", "value": len([flight for flight in flights if flight.status == FlightStatus.approved])},
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

    recent = sorted(flights, key=lambda item: (item.date, item.created_at), reverse=True)[:5]
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
        Paragraph("FlyLogX flight logbook", styles["Title"]),
        Spacer(1, 10),
        Paragraph("Traceable overview of flight entries", styles["Heading2"]),
        Spacer(1, 12),
    ]

    rows = [
        [
            "Flight no.",
            "Date",
            "Pilot",
            "Unit",
            "Aircraft",
            "Category",
            "Status",
            "Duration",
            "Location",
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
    story.append(Paragraph(f"Total entries: {len(flights)}", styles["Normal"]))
    story.append(Paragraph(f"Created at: {datetime.now(timezone.utc).isoformat()}", styles["Normal"]))
    document.build(story)
    return buffer.getvalue()
