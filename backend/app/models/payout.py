from datetime import datetime, timezone
from app.extensions import db


class Payout(db.Model):
    __tablename__ = "payouts"

    id = db.Column(db.Integer, primary_key=True)

    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id"), nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    host_phone = db.Column(db.String(20), nullable=False)

    # pending | processing | successful | failed
    status = db.Column(db.String(30), nullable=False, default="pending")

    conversation_id = db.Column(db.String(120), nullable=True)
    originator_conversation_id = db.Column(db.String(120), nullable=True)
    transaction_id = db.Column(db.String(120), nullable=True)
    gateway_response = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    payment = db.relationship("Payment", backref="payout", uselist=False)
    host = db.relationship("User", foreign_keys=[host_id])
