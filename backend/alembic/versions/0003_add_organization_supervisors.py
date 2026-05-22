"""add organization supervisor mapping

Revision ID: 0003_org_supervisors
Revises: 0002_add_organization_supervisor
Create Date: 2026-05-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_org_supervisors"
down_revision = "0002_add_organization_supervisor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_supervisors",
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), primary_key=True),
        sa.Column("supervisor_user_id", sa.String(length=64), sa.ForeignKey("users.id"), primary_key=True),
    )
    op.execute(
        sa.text(
            "INSERT INTO organization_supervisors (organization_id, supervisor_user_id) "
            "SELECT id, supervisor_id FROM organizations WHERE supervisor_id IS NOT NULL"
        )
    )


def downgrade() -> None:
    op.drop_table("organization_supervisors")
