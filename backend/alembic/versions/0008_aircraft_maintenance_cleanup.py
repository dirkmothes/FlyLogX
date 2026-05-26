"""remove aircraft maintenance status

Revision ID: 0008_aircraft_maint_clean
Revises: 0007_aircraft_release_status
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_aircraft_maint_clean"
down_revision = "0007_aircraft_release_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.drop_column("maintenance_status")


def downgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.add_column(sa.Column("maintenance_status", sa.String(length=128), nullable=False, server_default="ok"))
