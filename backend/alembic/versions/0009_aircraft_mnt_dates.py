"""remove aircraft maintenance dates

Revision ID: 0009_aircraft_mnt_dates
Revises: 0008_aircraft_maint_clean
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_aircraft_mnt_dates"
down_revision = "0008_aircraft_maint_clean"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.drop_column("last_maintenance")
        batch_op.drop_column("next_maintenance")


def downgrade() -> None:
    with op.batch_alter_table("aircraft") as batch_op:
        batch_op.add_column(sa.Column("last_maintenance", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("next_maintenance", sa.Date(), nullable=True))
