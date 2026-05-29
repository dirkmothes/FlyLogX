from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime, timezone
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

from .core.config import get_settings
from .domain import AircraftStatus, FlightCategory, FlightStatus, RoleName

settings = get_settings()
DATABASE_URL = settings.database_url


class Base(DeclarativeBase):
    pass


def build_engine():
    if DATABASE_URL.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if ":memory:" in DATABASE_URL:
            kwargs["poolclass"] = StaticPool
        return create_engine(DATABASE_URL, future=True, **kwargs)
    return create_engine(DATABASE_URL, future=True, pool_pre_ping=True)


engine = build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=True)
    supervisor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class OrganizationSupervisorModel(Base):
    __tablename__ = "organization_supervisors"

    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), primary_key=True)
    supervisor_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), primary_key=True)


class UnitModel(Base):
    __tablename__ = "units"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=True, index=True)
    unit_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("units.id"), nullable=True, index=True)
    role: Mapped[RoleName] = mapped_column(
        Enum(RoleName, name="role_name", values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
    )
    username: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AircraftModel(Base):
    __tablename__ = "aircraft"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    identifier: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    aircraft_type: Mapped[str] = mapped_column(String(128), nullable=False)
    uas_class: Mapped[str] = mapped_column(String(64), nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    use_case: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    internal_identifier: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    owner_unit_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("units.id"), nullable=True)
    battery_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    battery_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    energy_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    operating_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    availability: Mapped[str] = mapped_column(String(128), default="available", nullable=False)
    status: Mapped[AircraftStatus] = mapped_column(
        Enum(AircraftStatus, name="aircraft_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        default=AircraftStatus.active,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class FlightModel(Base):
    __tablename__ = "flights"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    organization_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit_id: Mapped[str] = mapped_column(String(64), ForeignKey("units.id"), nullable=False, index=True)
    unit_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pilot_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    aircraft_id: Mapped[str] = mapped_column(String(64), ForeignKey("aircraft.id"), nullable=False, index=True)
    aircraft_identifier: Mapped[str] = mapped_column(String(64), nullable=False)
    flight_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[FlightCategory] = mapped_column(
        Enum(FlightCategory, name="flight_category", values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
    )
    flight_type: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[FlightStatus] = mapped_column(
        Enum(FlightStatus, name="flight_status", values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        default=FlightStatus.draft,
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    flight_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    day_flight: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    night_flight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    coordinates: Mapped[str | None] = mapped_column(String(128), nullable=True)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    flight_supervisor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flight_supervisor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    flight_supervisor_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    previous_flights: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    previous_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    monthly_carryover: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    yearly_carryover: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_flights: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    updated_by: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    rejected_by: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_request: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    actor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    before_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def migration_config() -> Config:
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    return config


def run_migrations() -> None:
    command.upgrade(migration_config(), "head")


def create_schema() -> None:
    Base.metadata.create_all(bind=engine)


def seed_database(session) -> None:
    if session.query(OrganizationModel).count() > 0:
        return

    from .core.security import hash_password

    org = OrganizationModel(id="org-bw-01", name="Bundeswehr Cyber and Information Domain Service")
    unit = UnitModel(id="unit-ops-01", organization_id=org.id, name="Drone Squadron North", code="DS-NORTH")
    pilot = UserModel(
        id="user-pilot-01",
        organization_id=org.id,
        unit_id=unit.id,
        role=RoleName.pilot,
        username="pilot",
        first_name="Max",
        last_name="Example",
        name="Max Example",
        email="pilot@flylogx.local",
        password_hash=hash_password("flylogx-demo"),
    )
    supervisor = UserModel(
        id="user-supervisor-01",
        organization_id=org.id,
        unit_id=unit.id,
        role=RoleName.supervisor,
        username="supervisor",
        first_name="Anna",
        last_name="Leader",
        name="Anna Leader",
        email="supervisor@flylogx.local",
        password_hash=hash_password("flylogx-demo"),
    )
    admin = UserModel(
        id="user-admin-01",
        organization_id=None,
        unit_id=None,
        role=RoleName.admin,
        username="admin",
        first_name="Frank",
        last_name="Admin",
        name="Frank Admin",
        email="admin@flylogx.local",
        password_hash=hash_password("flylogx-demo"),
    )
    drone = AircraftModel(
        id="aircraft-01",
        organization_id=org.id,
        name="Recon Drone A1",
        identifier="FLX-A1",
        manufacturer="FlyLogX Systems",
        model="R-14 Recon",
        serial_number="SN-2025-0001",
        category="UAS",
        aircraft_type="Multirotor",
        uas_class="C2",
        weight_kg=8.4,
        use_case="Reconnaissance",
        registration_number="BW-DR-014",
        internal_identifier="INT-DR-014",
        owner_unit_id=unit.id,
        battery_type="Li-ion",
        battery_count=4,
        energy_source="Battery",
        payload="EO/IR payload",
        max_duration_minutes=45,
        operating_hours=148.6,
        availability="available",
        status=AircraftStatus.active,
        notes="Ready for day and night operations.",
    )
    trainer = AircraftModel(
        id="aircraft-02",
        organization_id=org.id,
        name="Training Platform T7",
        identifier="FLX-T7",
        manufacturer="FlyLogX Systems",
        model="Trainer 7",
        serial_number="SN-2025-0002",
        category="UAS",
        aircraft_type="Multirotor",
        uas_class="C1",
        weight_kg=3.2,
        use_case="Training",
        internal_identifier="INT-TR-007",
        owner_unit_id=unit.id,
        battery_type="LiPo",
        battery_count=2,
        energy_source="Battery",
        payload="Camera",
        max_duration_minutes=28,
        operating_hours=76.2,
        availability="maintenance",
        status=AircraftStatus.maintenance,
        notes="Locked for training purposes only.",
    )
    flight_1 = FlightModel(
        id="flight-01",
        organization_id=org.id,
        organization_name=org.name,
        unit_id=unit.id,
        unit_name=unit.name,
        unit_code=unit.code,
        pilot_id=pilot.id,
        aircraft_id=drone.id,
        aircraft_identifier=drone.identifier,
        flight_number="FLX-2026-0041",
        category=FlightCategory.u,
        flight_type="Reconnaissance Flight",
        status=FlightStatus.approved,
        date=date(2026, 5, 18),
        flight_count=1,
        duration_minutes=42,
        day_flight=True,
        night_flight=False,
        location="Training Area North",
        coordinates="52.5200, 13.4050",
        special_notes="Gusts up to 18 km/h, visibility stable.",
        remarks="Completed as planned.",
        flight_supervisor_name=supervisor.name,
        flight_supervisor_id=supervisor.id,
        flight_supervisor_signature="sig-001",
        previous_flights=18,
        previous_hours=24.6,
        monthly_carryover=2.1,
        yearly_carryover=24.6,
        total_flights=19,
        total_hours=25.3,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        created_by=pilot.id,
        updated_by=supervisor.id,
        submitted_at=datetime.now(timezone.utc),
        reviewed_at=datetime.now(timezone.utc),
        approved_at=datetime.now(timezone.utc),
        reviewed_by=supervisor.id,
        approved_by=supervisor.id,
    )
    flight_2 = FlightModel(
        id="flight-02",
        organization_id=org.id,
        organization_name=org.name,
        unit_id=unit.id,
        unit_name=unit.name,
        unit_code=unit.code,
        pilot_id=pilot.id,
        aircraft_id=trainer.id,
        aircraft_identifier=trainer.identifier,
        category=FlightCategory.s,
        flight_type="Training Flight",
        status=FlightStatus.submitted,
        date=date(2026, 5, 20),
        flight_count=1,
        duration_minutes=26,
        day_flight=False,
        night_flight=True,
        location="Airfield West",
        coordinates="52.4980, 13.3777",
        special_notes="Night flight with light guidance.",
        remarks="Submitted for review.",
        flight_supervisor_name=supervisor.name,
        flight_supervisor_id=supervisor.id,
        flight_supervisor_signature=None,
        previous_flights=19,
        previous_hours=25.3,
        monthly_carryover=2.5,
        yearly_carryover=25.3,
        total_flights=20,
        total_hours=25.7,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        created_by=pilot.id,
        updated_by=pilot.id,
        submitted_at=datetime.now(timezone.utc),
    )
    flight_3 = FlightModel(
        id="flight-03",
        organization_id=org.id,
        organization_name=org.name,
        unit_id=unit.id,
        unit_name=unit.name,
        unit_code=unit.code,
        pilot_id=pilot.id,
        aircraft_id=drone.id,
        aircraft_identifier=drone.identifier,
        category=FlightCategory.t,
        flight_type="Technical Test Flight",
        status=FlightStatus.draft,
        date=date(2026, 5, 21),
        flight_count=1,
        duration_minutes=15,
        day_flight=True,
        night_flight=False,
        location="Hangar 3",
        coordinates=None,
        special_notes="Sensor check and calibration.",
        remarks="Draft saved.",
        flight_supervisor_name=supervisor.name,
        flight_supervisor_id=supervisor.id,
        flight_supervisor_signature=None,
        previous_flights=20,
        previous_hours=25.7,
        monthly_carryover=2.7,
        yearly_carryover=25.7,
        total_flights=21,
        total_hours=25.95,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        created_by=pilot.id,
        updated_by=pilot.id,
    )
    audit = AuditEventModel(
        id="audit-01",
        organization_id=org.id,
        entity_type="flight_entry",
        entity_id=flight_1.id,
        action="approved",
        actor_id=supervisor.id,
        actor_name=supervisor.name,
        timestamp=datetime.now(timezone.utc),
        before_state=None,
        after_state={},
        comment="Approval with plausibility check.",
    )

    session.add_all([org, unit, pilot, supervisor, admin])
    session.flush()

    session.add(OrganizationSupervisorModel(organization_id=org.id, supervisor_user_id=supervisor.id))
    session.flush()

    session.add_all([drone, trainer])
    session.flush()

    session.add_all([flight_1, flight_2, flight_3, audit])
    session.commit()


def bootstrap_database() -> None:
    if DATABASE_URL.startswith("sqlite"):
        create_schema()
    else:
        run_migrations()
    with session_scope() as session:
        seed_database(session)
