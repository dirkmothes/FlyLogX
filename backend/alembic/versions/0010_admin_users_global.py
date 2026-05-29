"""make admin users global

Revision ID: 0010_admin_users_global
Revises: 0009_aircraft_mnt_dates
Create Date: 2026-05-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_admin_users_global"
down_revision = "0009_aircraft_mnt_dates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("organization_id", existing_type=sa.String(length=64), nullable=True)

    bind = op.get_bind()
    bind.execute(sa.text("UPDATE users SET organization_id = NULL, unit_id = NULL WHERE role = 'admin'"))


def downgrade() -> None:
    bind = op.get_bind()
    fallback_org = bind.execute(
        sa.text("SELECT id FROM organizations WHERE is_deleted = 0 ORDER BY name LIMIT 1")
    ).scalar_one_or_none()
    if fallback_org is not None:
        bind.execute(
            sa.text(
                "UPDATE users SET organization_id = :organization_id WHERE role = 'admin' AND organization_id IS NULL"
            ),
            {"organization_id": fallback_org},
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("organization_id", existing_type=sa.String(length=64), nullable=False)
