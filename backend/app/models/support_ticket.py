from datetime import datetime, timezone
from app.extensions import db


class SupportTicket(db.Model):
    __tablename__ = "support_tickets"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=True)

    category = db.Column(db.String(50), nullable=False, default="general")
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)

    # open | in_review | resolved | closed
    status = db.Column(db.String(30), nullable=False, default="open")

    admin_reply = db.Column(db.Text, nullable=True)
    replied_at = db.Column(db.DateTime(timezone=True), nullable=True)

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

    user = db.relationship("User", foreign_keys=[user_id])
    booking = db.relationship("Booking", foreign_keys=[booking_id])
