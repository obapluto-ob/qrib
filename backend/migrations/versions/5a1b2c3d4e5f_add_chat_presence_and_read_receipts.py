"""add chat presence and read receipts

Revision ID: 5a1b2c3d4e5f
Revises: 4f8e2c1a6b7d
"""
from alembic import op
import sqlalchemy as sa


revision = "5a1b2c3d4e5f"
down_revision = "4f8e2c1a6b7d"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    message_columns = {column["name"] for column in sa.inspect(bind).get_columns("messages")}
    user_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}

    if "read_at" not in message_columns:
        op.add_column("messages", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    if "typing_to_id" not in user_columns:
        op.add_column("users", sa.Column("typing_to_id", sa.Integer(), nullable=True))
    if "typing_until" not in user_columns:
        op.add_column("users", sa.Column("typing_until", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    bind = op.get_bind()
    message_columns = {column["name"] for column in sa.inspect(bind).get_columns("messages")}
    user_columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}

    if "read_at" in message_columns:
        op.drop_column("messages", "read_at")
    if "typing_until" in user_columns:
        op.drop_column("users", "typing_until")
    if "typing_to_id" in user_columns:
        op.drop_column("users", "typing_to_id")