from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models import User, Booking, Notification, SupportTicket

support_bp = Blueprint("support", __name__, url_prefix="/api/support")


def ticket_to_dict(t):
    return {
        "id": t.id,
        "category": t.category,
        "subject": t.subject,
        "message": t.message,
        "status": t.status,
        "admin_reply": t.admin_reply,
        "replied_at": t.replied_at.isoformat() if t.replied_at else None,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
        "booking_id": t.booking_id,
        "user_id": t.user_id,
        "user_name": t.user.name if t.user else None,
        "user_email": t.user.email if t.user else None,
        "booking_property": t.booking.property.title if t.booking and t.booking.property else None,
    }


# ============================================================
# STUDENT — create ticket
# ============================================================
@support_bp.post("")
@jwt_required()
def create_ticket():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()
    category = (data.get("category") or "general").strip()
    booking_id = data.get("booking_id")

    if not subject:
        return jsonify({"error": "Subject is required"}), 400
    if not message:
        return jsonify({"error": "Message is required"}), 400
    if category not in ("general", "payment", "booking", "property", "other"):
        category = "general"

    # Validate booking belongs to this user if provided
    if booking_id:
        booking = db.session.get(Booking, int(booking_id))
        if not booking or booking.student_id != user_id:
            booking_id = None

    ticket = SupportTicket(
        user_id=user_id,
        booking_id=booking_id,
        category=category,
        subject=subject,
        message=message,
    )
    db.session.add(ticket)
    db.session.commit()

    return jsonify({"message": "Ticket submitted", "ticket": ticket_to_dict(ticket)}), 201


# ============================================================
# STUDENT — list own tickets
# ============================================================
@support_bp.get("")
@jwt_required()
def list_tickets():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role == "admin":
        # Admin gets all tickets
        status_filter = request.args.get("status", "all")
        query = SupportTicket.query
        if status_filter != "all":
            query = query.filter_by(status=status_filter)
        tickets = query.order_by(SupportTicket.created_at.desc()).all()
    else:
        tickets = SupportTicket.query.filter_by(user_id=user_id)\
            .order_by(SupportTicket.created_at.desc()).all()

    return jsonify([ticket_to_dict(t) for t in tickets]), 200


# ============================================================
# ADMIN — reply to ticket
# ============================================================
@support_bp.patch("/<int:ticket_id>/reply")
@jwt_required()
def reply_ticket(ticket_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or user.role != "admin":
        return jsonify({"error": "Admin only"}), 403

    ticket = db.session.get(SupportTicket, ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    data = request.get_json(silent=True) or {}
    reply = (data.get("reply") or "").strip()
    if not reply:
        return jsonify({"error": "Reply message is required"}), 400

    ticket.admin_reply = reply
    ticket.replied_at = datetime.now(timezone.utc)
    ticket.status = "in_review"
    ticket.updated_at = datetime.now(timezone.utc)

    # Notify the student
    db.session.add(Notification(
        user_id=ticket.user_id,
        title="Support ticket update",
        body=f"Admin replied to your ticket: \"{ticket.subject}\"",
    ))
    db.session.commit()

    return jsonify({"message": "Reply sent", "ticket": ticket_to_dict(ticket)}), 200


# ============================================================
# ADMIN — close / resolve ticket
# ============================================================
@support_bp.patch("/<int:ticket_id>/status")
@jwt_required()
def update_ticket_status(ticket_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or user.role != "admin":
        return jsonify({"error": "Admin only"}), 403

    ticket = db.session.get(SupportTicket, ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("open", "in_review", "resolved", "closed"):
        return jsonify({"error": "Invalid status"}), 400

    ticket.status = status
    ticket.updated_at = datetime.now(timezone.utc)

    if status in ("resolved", "closed"):
        db.session.add(Notification(
            user_id=ticket.user_id,
            title="Support ticket closed",
            body=f"Your ticket \"{ticket.subject}\" has been marked as {status}.",
        ))

    db.session.commit()
    return jsonify({"message": "Status updated", "ticket": ticket_to_dict(ticket)}), 200
