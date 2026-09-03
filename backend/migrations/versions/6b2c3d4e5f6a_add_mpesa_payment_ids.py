"""add Daraja payment identifiers

Revision ID: 6b2c3d4e5f6a
Revises: 5a1b2c3d4e5f
"""
from alembic import op
import sqlalchemy as sa


revision = "6b2c3d4e5f6a"
down_revision = "5a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("payments")}
    if "checkout_request_id" not in columns:
        op.add_column("payments", sa.Column("checkout_request_id", sa.String(120), nullable=True))
    if "merchant_request_id" not in columns:
        op.add_column("payments", sa.Column("merchant_request_id", sa.String(120), nullable=True))


def downgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("payments")}
    if "merchant_request_id" in columns:
        op.drop_column("payments", "merchant_request_id")
    if "checkout_request_id" in columns:
        op.drop_column("payments", "checkout_request_id")
