"""remove aircraft release status

Revision ID: 0007_aircraft_release_status
Revises: 0006_remove_flight_time_fields
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_aircraft_release_status"
down_revision = "0006_remove_flight_time_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.drop_column("release_status")


def downgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.add_column(sa.Column("release_status", sa.Boolean(), nullable=False, server_default=sa.true()))
