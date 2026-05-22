"""add username and split user names

Revision ID: 0005_user_identity_fields
Revises: 0004_flight_category_en
Create Date: 2026-05-22 00:00:00.000000
"""

from __future__ import annotations

import re

from alembic import op
import sqlalchemy as sa

revision = "0005_user_identity_fields"
down_revision = "0004_flight_category_en"
branch_labels = None
depends_on = None


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or "user"


def _split_name(full_name: str | None) -> tuple[str, str]:
    parts = [part for part in (full_name or "").strip().split() if part]
    if not parts:
        return "Unknown", "User"
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], " ".join(parts[1:])


def _unique_username(base: str, used: set[str]) -> str:
    candidate = base
    suffix = 2
    while candidate in used:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("first_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=255), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, email, name FROM users ORDER BY id")).mappings().all()
    used_usernames: set[str] = set()

    for row in rows:
        email = (row["email"] or "").strip()
        name = (row["name"] or "").strip()
        local_part = email.split("@", 1)[0] if "@" in email else email
        base_username = _slugify(local_part or name or row["id"])
        username = _unique_username(base_username, used_usernames)
        first_name, last_name = _split_name(name or local_part or username)
        bind.execute(
            sa.text(
                """
                UPDATE users
                SET username = :username,
                    first_name = :first_name,
                    last_name = :last_name
                WHERE id = :id
                """
            ).bindparams(
                id=row["id"],
                username=username,
                first_name=first_name,
                last_name=last_name,
            )
        )

    op.alter_column("users", "username", nullable=False, existing_type=sa.String(length=255))
    op.alter_column("users", "first_name", nullable=False, existing_type=sa.String(length=255))
    op.alter_column("users", "last_name", nullable=False, existing_type=sa.String(length=255))
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "username")
