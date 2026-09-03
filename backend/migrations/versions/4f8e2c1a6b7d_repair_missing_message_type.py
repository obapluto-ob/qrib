"""repair databases missing the message_type column

Revision ID: 4f8e2c1a6b7d
Revises: d2c6e5ffa7df
"""
from alembic import op
import sqlalchemy as sa


revision = "4f8e2c1a6b7d"
down_revision = "d2c6e5ffa7df"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("messages")}

    if "message_type" not in columns:
        op.add_column(
            "messages",
            sa.Column(
                "message_type",
                sa.String(length=30),
                nullable=False,
                server_default="text",
            ),
        )


def downgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("messages")}

    if "message_type" in columns:
        op.drop_column("messages", "message_type")
