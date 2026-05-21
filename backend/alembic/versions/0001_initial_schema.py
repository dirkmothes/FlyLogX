"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

from app.domain import AircraftStatus, FlightCategory, FlightStatus, RoleName

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("parent_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "units",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("unit_id", sa.String(length=64), sa.ForeignKey("units.id"), nullable=True, index=True),
        sa.Column("role", sa.Enum("pilot", "supervisor", "admin", name="role_name"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("two_factor_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "aircraft",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("identifier", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("manufacturer", sa.String(length=255), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("serial_number", sa.String(length=128), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("aircraft_type", sa.String(length=128), nullable=False),
        sa.Column("uas_class", sa.String(length=64), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("use_case", sa.String(length=255), nullable=False),
        sa.Column("registration_number", sa.String(length=128), nullable=True),
        sa.Column("internal_identifier", sa.String(length=128), nullable=False, unique=True),
        sa.Column("owner_unit_id", sa.String(length=64), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("battery_type", sa.String(length=128), nullable=True),
        sa.Column("battery_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("energy_source", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("max_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("operating_hours", sa.Float(), nullable=False, server_default="0"),
        sa.Column("maintenance_status", sa.String(length=128), nullable=False, server_default="ok"),
        sa.Column("last_maintenance", sa.Date(), nullable=True),
        sa.Column("next_maintenance", sa.Date(), nullable=True),
        sa.Column("release_status", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("availability", sa.String(length=128), nullable=False, server_default="available"),
        sa.Column("status", sa.Enum("active", "maintenance", "retired", name="aircraft_status"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "flights",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("unit_id", sa.String(length=64), sa.ForeignKey("units.id"), nullable=False, index=True),
        sa.Column("pilot_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("aircraft_id", sa.String(length=64), sa.ForeignKey("aircraft.id"), nullable=False, index=True),
        sa.Column("aircraft_identifier", sa.String(length=64), nullable=False),
        sa.Column("flight_number", sa.String(length=128), nullable=True),
        sa.Column("category", sa.Enum("Ü-Flüge", "S-Flüge", "E-H-Flüge", "T-Flüge", "A-Flüge", name="flight_category"), nullable=False),
        sa.Column("flight_type", sa.String(length=128), nullable=False),
        sa.Column("status", sa.Enum("draft", "submitted", "reviewed", "approved", "rejected", name="flight_status"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("landing_time", sa.Time(), nullable=False),
        sa.Column("flight_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("day_flight", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("night_flight", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("coordinates", sa.String(length=128), nullable=True),
        sa.Column("special_notes", sa.Text(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("flight_supervisor_name", sa.String(length=255), nullable=True),
        sa.Column("flight_supervisor_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("flight_supervisor_signature", sa.String(length=255), nullable=True),
        sa.Column("previous_flights", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("previous_hours", sa.Float(), nullable=False, server_default="0"),
        sa.Column("monthly_carryover", sa.Float(), nullable=False, server_default="0"),
        sa.Column("yearly_carryover", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_flights", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_hours", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_by", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.String(length=64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_by", sa.String(length=64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejected_by", sa.String(length=64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("change_request", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("entity_type", sa.String(length=128), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("actor_name", sa.String(length=255), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("flights")
    op.drop_table("aircraft")
    op.drop_table("users")
    op.drop_table("units")
    op.drop_table("organizations")
    sa.Enum(name="flight_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="flight_category").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="aircraft_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="role_name").drop(op.get_bind(), checkfirst=True)
