"""remove flight time fields

Revision ID: 0006_remove_flight_time_fields
Revises: 0005_user_identity_fields
Create Date: 2026-05-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_remove_flight_time_fields"
down_revision = "0005_user_identity_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("flights") as batch_op:
        batch_op.drop_column("landing_time")
        batch_op.drop_column("start_time")


def downgrade() -> None:
    with op.batch_alter_table("flights") as batch_op:
        batch_op.add_column(
            sa.Column("start_time", sa.Time(), nullable=False, server_default=sa.text("'00:00:00'"))
        )
        batch_op.add_column(
            sa.Column("landing_time", sa.Time(), nullable=False, server_default=sa.text("'00:00:00'"))
        )
