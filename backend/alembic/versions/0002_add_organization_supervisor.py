"""add organization supervisor assignment

Revision ID: 0002_add_organization_supervisor
Revises: 0001_initial_schema
Create Date: 2026-05-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_organization_supervisor"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("supervisor_id", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_organizations_supervisor_id"), "organizations", ["supervisor_id"], unique=False)
    op.create_foreign_key(
        "fk_organizations_supervisor_id_users",
        "organizations",
        "users",
        ["supervisor_id"],
        ["id"],
    )
    op.execute(
        sa.text(
            "UPDATE organizations SET supervisor_id = 'user-supervisor-01' WHERE id = 'org-bw-01'"
        )
    )


def downgrade() -> None:
    op.drop_constraint("fk_organizations_supervisor_id_users", "organizations", type_="foreignkey")
    op.drop_index(op.f("ix_organizations_supervisor_id"), table_name="organizations")
    op.drop_column("organizations", "supervisor_id")
