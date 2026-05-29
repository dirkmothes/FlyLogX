"""add immutable flight scope snapshots

Revision ID: 0011_flight_scope_snapshots
Revises: 0010_admin_users_global
Create Date: 2026-05-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_flight_scope_snapshots"
down_revision = "0010_admin_users_global"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("flights") as batch_op:
        batch_op.add_column(sa.Column("organization_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("unit_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("unit_code", sa.String(length=64), nullable=True))

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE flights
            SET
                organization_name = (SELECT name FROM organizations WHERE organizations.id = flights.organization_id),
                unit_name = (SELECT name FROM units WHERE units.id = flights.unit_id),
                unit_code = (SELECT code FROM units WHERE units.id = flights.unit_id)
            """
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("flights") as batch_op:
        batch_op.drop_column("unit_code")
        batch_op.drop_column("unit_name")
        batch_op.drop_column("organization_name")
