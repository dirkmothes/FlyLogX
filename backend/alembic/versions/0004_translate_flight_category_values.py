"""translate flight category values to English

Revision ID: 0004_flight_category_en
Revises: 0003_org_supervisors
Create Date: 2026-05-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_flight_category_en"
down_revision = "0003_org_supervisors"
branch_labels = None
depends_on = None


OLD_TO_NEW = {
    "\u00dc-Fl\u00fcge": "U Flights",
    "S-Fl\u00fcge": "S Flights",
    "E-H-Fl\u00fcge": "E-H Flights",
    "T-Fl\u00fcge": "T Flights",
    "A-Fl\u00fcge": "A Flights",
}


def _rename_sqlite_labels() -> None:
    for old_value, new_value in OLD_TO_NEW.items():
        op.execute(sa.text("UPDATE flights SET category = :new_value WHERE category = :old_value").bindparams(new_value=new_value, old_value=old_value))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        labels = {
            row[0]
            for row in bind.execute(
                sa.text(
                    """
                    SELECT enumlabel
                    FROM pg_enum
                    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
                    WHERE pg_type.typname = 'flight_category'
                    """
                )
            )
        }
        if "\u00dc-Fl\u00fcge" in labels:
            for old_value, new_value in OLD_TO_NEW.items():
                op.execute(sa.text(f"ALTER TYPE flight_category RENAME VALUE '{old_value}' TO '{new_value}'"))
    else:
        _rename_sqlite_labels()


def downgrade() -> None:
    bind = op.get_bind()
    new_to_old = {new_value: old_value for old_value, new_value in OLD_TO_NEW.items()}
    if bind.dialect.name == "postgresql":
        labels = {
            row[0]
            for row in bind.execute(
                sa.text(
                    """
                    SELECT enumlabel
                    FROM pg_enum
                    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
                    WHERE pg_type.typname = 'flight_category'
                    """
                )
            )
        }
        if "U Flights" in labels:
            for new_value, old_value in new_to_old.items():
                op.execute(sa.text(f"ALTER TYPE flight_category RENAME VALUE '{new_value}' TO '{old_value}'"))
    else:
        for new_value, old_value in new_to_old.items():
            op.execute(sa.text("UPDATE flights SET category = :old_value WHERE category = :new_value").bindparams(old_value=old_value, new_value=new_value))
