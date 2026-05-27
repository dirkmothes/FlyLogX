from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RoleName(str, Enum):
    pilot = "pilot"
    supervisor = "supervisor"
    admin = "admin"


class FlightStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    reviewed = "reviewed"
    approved = "approved"
    rejected = "rejected"


class AircraftStatus(str, Enum):
    active = "active"
    maintenance = "maintenance"
    retired = "retired"


class FlightCategory(str, Enum):
    u = "U Flights"
    s = "S Flights"
    eh = "E-H Flights"
    t = "T Flights"
    a = "A Flights"


class ReviewDecision(str, Enum):
    approve = "approve"
    reject = "reject"


class Organization(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    parent_id: str | None = None
    is_deleted: bool = False


class OrganizationCreateRequest(BaseModel):
    name: str
    parent_id: str | None = None


class OrganizationUpdateRequest(BaseModel):
    name: str | None = None
    parent_id: str | None = None
    is_deleted: bool | None = None


class Unit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    code: str
    is_deleted: bool = False


class UnitCreateRequest(BaseModel):
    organization_id: str
    name: str
    code: str | None = None


class UnitUpdateRequest(BaseModel):
    organization_id: str | None = None
    name: str | None = None
    code: str | None = None
    is_deleted: bool | None = None


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    unit_id: str | None = None
    role: RoleName
    username: str
    first_name: str
    last_name: str
    name: str
    email: str
    active: bool = True
    is_deleted: bool = False
    supervised_organization_ids: list[str] = Field(default_factory=list)


class UserCreateRequest(BaseModel):
    organization_id: str
    unit_id: str | None = None
    role: RoleName = RoleName.pilot
    username: str
    first_name: str
    last_name: str
    email: str
    password: str
    active: bool = True
    supervised_organization_ids: list[str] = Field(default_factory=list)


class UserUpdateRequest(BaseModel):
    organization_id: str | None = None
    unit_id: str | None = None
    role: RoleName | None = None
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    password: str | None = None
    active: bool | None = None
    is_deleted: bool | None = None
    supervised_organization_ids: list[str] | None = None


class UserPasswordResetRequest(BaseModel):
    password: str


class OwnProfileUpdateRequest(BaseModel):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    password: str | None = None


class Aircraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    identifier: str
    manufacturer: str
    model: str
    serial_number: str
    category: str
    aircraft_type: str
    uas_class: str
    weight_kg: float
    use_case: str
    registration_number: str | None = None
    internal_identifier: str
    owner_unit_id: str | None = None
    battery_type: str | None = None
    battery_count: int = 0
    energy_source: str | None = None
    payload: str | None = None
    max_duration_minutes: int | None = None
    operating_hours: float = 0.0
    availability: str = "available"
    status: AircraftStatus = AircraftStatus.active
    notes: str | None = None


class AircraftCreateRequest(BaseModel):
    organization_id: str
    owner_unit_id: str | None = None
    name: str
    identifier: str
    manufacturer: str
    model: str
    serial_number: str
    category: str
    aircraft_type: str
    uas_class: str
    weight_kg: float = Field(gt=0)
    use_case: str
    registration_number: str | None = None
    internal_identifier: str
    battery_type: str | None = None
    battery_count: int = 0
    energy_source: str | None = None
    payload: str | None = None
    max_duration_minutes: int | None = None
    operating_hours: float = 0.0
    availability: str = "available"
    status: AircraftStatus = AircraftStatus.active
    notes: str | None = None


class FlightEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    unit_id: str
    pilot_id: str
    aircraft_id: str
    aircraft_identifier: str
    aircraft_name: str | None = None
    flight_number: str | None = None
    category: FlightCategory
    flight_type: str
    status: FlightStatus = FlightStatus.draft
    date: date
    flight_count: int = 1
    duration_minutes: int
    day_flight: bool = True
    night_flight: bool = False
    location: str
    coordinates: str | None = None
    special_notes: str | None = None
    remarks: str | None = None
    pilot_name: str | None = None
    unit_name: str | None = None
    unit_code: str | None = None
    flight_supervisor_name: str | None = None
    flight_supervisor_id: str | None = None
    flight_supervisor_signature: str | None = None
    previous_flights: int = 0
    previous_hours: float = 0.0
    monthly_carryover: float = 0.0
    yearly_carryover: float = 0.0
    total_flights: int = 0
    total_hours: float = 0.0
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    approved_at: datetime | None = None
    reviewed_by: str | None = None
    approved_by: str | None = None
    rejected_by: str | None = None
    rejection_reason: str | None = None
    change_request: str | None = None
    is_deleted: bool = False


class AuditEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    entity_type: str
    entity_id: str
    action: str
    actor_id: str
    actor_name: str
    timestamp: datetime
    before_state: dict | None = None
    after_state: dict | None = None
    comment: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 0


class ReviewRequest(BaseModel):
    decision: ReviewDecision
    comment: str | None = None
    signature: str | None = None


class FlightCreateRequest(BaseModel):
    organization_id: str
    unit_id: str
    pilot_id: str
    aircraft_id: str
    aircraft_identifier: str
    category: FlightCategory
    flight_type: str
    date: date
    flight_count: int = Field(default=1, ge=1)
    duration_minutes: int = Field(ge=1)
    day_flight: bool = True
    night_flight: bool = False
    location: str
    coordinates: str | None = None
    special_notes: str | None = None
    remarks: str | None = None
    flight_supervisor_name: str | None = None
    flight_supervisor_id: str | None = None
    flight_supervisor_signature: str | None = None
    previous_flights: int = 0
    previous_hours: float = 0.0
    monthly_carryover: float = 0.0
    yearly_carryover: float = 0.0


class FlightUpdateRequest(FlightCreateRequest):
    pass


class DashboardSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    total_hours: float
    total_flights: int
    open_entries: int
    rejected_entries: int
    approved_entries: int
    by_category: dict[str, float]
    by_aircraft: dict[str, float]
    by_month: dict[str, float]
    recent_flights: list[FlightEntry]
    incomplete_entries: int = 0
    pending_reviews: int = 0
    unit_comparison: list[dict[str, float | str]] = Field(default_factory=list)


class ExportRequest(BaseModel):
    format: str
    organization_id: str | None = None
    user_id: str | None = None
    status: FlightStatus | None = None
