import os
import uuid
import base64
import re
from datetime import datetime, timezone

import requests

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Booking, Payment, Property, User, Notification


payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def payment_to_dict(payment):
    return {
        "id": payment.id,
        "booking_id": payment.booking_id,
        "student_id": payment.student_id,
        "property_id": payment.property_id,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "provider": payment.provider,
        "status": payment.status,
        "reference": payment.reference,
        "transaction_id": payment.transaction_id,
        "gateway_response": payment.gateway_response,
        "checkout_request_id": payment.checkout_request_id,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
    }


@payments_bp.post("/initiate")
@jwt_required()
def initiate_payment():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if not user or user.role != "student":
        return jsonify({"error": "Only students can initiate payments"}), 403

    data = request.get_json(silent=True) or {}
    booking_id = data.get("booking_id")
    amount = data.get("amount")
    currency = (data.get("currency") or "KES").upper()

    if booking_id in (None, ""):
        return jsonify({"error": "booking_id is required"}), 400

    try:
        booking_id = int(booking_id)
    except (TypeError, ValueError):
        return jsonify({"error": "booking_id must be an integer"}), 400

    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    if booking.student_id != user_id:
        return jsonify({"error": "You can only pay for your own booking"}), 403

    if booking.status != "approved":
        return jsonify({
            "error": "Payment is available only after the host approves the booking",
            "status": booking.status,
        }), 409

    property_id = booking.property_id
    property = db.session.get(Property, property_id)
    if not property:
        return jsonify({"error": "Property not found"}), 404

    parsed_amount = float(amount) if amount not in (None, "") else float(property.price_per_month)
    if parsed_amount <= 0:
        return jsonify({"error": "Payment amount must be greater than zero"}), 400

    existing_payment = Payment.query.filter_by(booking_id=booking.id).first()
    if existing_payment:
        return jsonify({
            "message": "A payment already exists for this booking",
            "payment": payment_to_dict(existing_payment),
            "provider": "flutterwave",
            "sandbox": True,
            "demo_mode": not all([
                os.getenv("FLUTTERWAVE_PUBLIC_KEY"),
                os.getenv("FLUTTERWAVE_SECRET_KEY"),
                os.getenv("FLUTTERWAVE_ENCRYPTION_KEY"),
            ]),
            "checkout": {
                "public_key": os.getenv("FLUTTERWAVE_PUBLIC_KEY", ""),
                "amount": float(existing_payment.amount),
                "currency": existing_payment.currency,
                "reference": existing_payment.reference,
            },
        }), 200

    reference = f"QRIB-{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc)

    payment = Payment(
        booking_id=booking.id,
        student_id=user_id,
        property_id=property_id,
        amount=parsed_amount,
        currency=currency,
        provider="flutterwave",
        status="pending",
        reference=reference,
        created_at=now,
        updated_at=now,
    )

    db.session.add(payment)
    db.session.commit()

    public_key = os.getenv("FLUTTERWAVE_PUBLIC_KEY", "")
    secret_key = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
    encryption_key = os.getenv("FLUTTERWAVE_ENCRYPTION_KEY", "")
    has_real_keys = all([public_key, secret_key, encryption_key])

    return jsonify({
        "message": "Payment session created successfully",
        "provider": "flutterwave",
        "sandbox": True,
        "demo_mode": not has_real_keys,
        "payment": payment_to_dict(payment),
        "checkout": {
            "public_key": public_key,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "reference": payment.reference,
            "customer": {
                "email": user.email,
                "name": user.name,
            },
            "customizations": {
                "title": "Qrib Accommodation",
                "description": "Student housing payment",
            },
            "payment_options": "card,mobilemoney,ussd",
        },
        "note": (
            "Flutterwave sandbox is ready for Kenya-friendly student payments. "
            "Set FLUTTERWAVE_PUBLIC_KEY, FLUTTERWAVE_SECRET_KEY and "
            "FLUTTERWAVE_ENCRYPTION_KEY to enable live checkout."
            if not has_real_keys else ""
        ),
    }), 201


def normalize_mpesa_phone(phone):
    digits = re.sub(r"\D", "", str(phone or ""))
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith(("7", "1")):
        digits = "254" + digits
    if not re.fullmatch(r"254[17]\d{8}", digits):
        raise ValueError("Use a Kenyan M-Pesa number such as 0712345678")
    return digits


def mpesa_configured():
    return all(os.getenv(name) for name in (
        "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY",
        "MPESA_SHORTCODE", "MPESA_CALLBACK_URL",
    ))


def mpesa_base_url():
    if os.getenv("MPESA_ENVIRONMENT", "sandbox").lower() == "production":
        return "https://api.safaricom.co.ke"
    return "https://sandbox.safaricom.co.ke"


@payments_bp.post("/mpesa/stk-push")
@jwt_required()
def initiate_mpesa_payment():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    data = request.get_json(silent=True) or {}

    if not user or user.role != "student":
        return jsonify({"error": "Only students can initiate payments"}), 403
    if not mpesa_configured():
        return jsonify({"error": "M-Pesa is not configured on the server"}), 503

    try:
        booking_id = int(data.get("booking_id"))
        phone = normalize_mpesa_phone(data.get("phone"))
    except (TypeError, ValueError) as error:
        return jsonify({"error": str(error) or "booking_id and phone are required"}), 400

    booking = db.session.get(Booking, booking_id)
    if not booking or booking.student_id != user_id:
        return jsonify({"error": "Booking not found"}), 404
    if booking.status != "approved":
        return jsonify({"error": "Payment is available only after host approval"}), 409

    property = db.session.get(Property, booking.property_id)
    amount = int(float(property.price_per_month))
    payment = Payment.query.filter_by(booking_id=booking.id).first()
    if payment and payment.status == "successful":
        return jsonify({"message": "Payment already completed", "payment": payment_to_dict(payment)}), 200
    if not payment:
        payment = Payment(
            booking_id=booking.id, student_id=user_id, property_id=booking.property_id,
            amount=amount, currency="KES", provider="mpesa", status="pending",
            reference=f"QRIB-{uuid.uuid4().hex[:12].upper()}",
        )
        db.session.add(payment)
        db.session.flush()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    raw_password = f"{os.environ['MPESA_SHORTCODE']}{os.environ['MPESA_PASSKEY']}{timestamp}"
    password = base64.b64encode(raw_password.encode()).decode()
    try:
        token_response = requests.get(
            f"{mpesa_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            auth=(os.environ["MPESA_CONSUMER_KEY"], os.environ["MPESA_CONSUMER_SECRET"]),
            timeout=15,
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]
        stk_response = requests.post(
            f"{mpesa_base_url()}/mpesa/stkpush/v1/processrequest",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "BusinessShortCode": os.environ["MPESA_SHORTCODE"],
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount, "PartyA": phone,
                "PartyB": os.environ["MPESA_SHORTCODE"], "PhoneNumber": phone,
                "CallBackURL": os.environ["MPESA_CALLBACK_URL"],
                "AccountReference": payment.reference,
                "TransactionDesc": "Qrib accommodation payment",
            },
            timeout=15,
        )
        stk_data = stk_response.json()
        stk_response.raise_for_status()
        if stk_data.get("ResponseCode") not in (None, "0"):
            raise RuntimeError(stk_data.get("ResponseDescription", "M-Pesa request failed"))
    except (requests.RequestException, ValueError, KeyError, RuntimeError) as error:
        db.session.rollback()
        return jsonify({"error": str(error)}), 502

    payment.checkout_request_id = stk_data.get("CheckoutRequestID")
    payment.merchant_request_id = stk_data.get("MerchantRequestID")
    payment.gateway_response = stk_data.get("ResponseDescription")
    payment.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "M-Pesa payment prompt sent", "payment": payment_to_dict(payment)}), 201


@payments_bp.post("/mpesa/callback")
def mpesa_callback():
    callback = (request.get_json(silent=True) or {}).get("Body", {}).get("stkCallback", {})
    checkout_id = callback.get("CheckoutRequestID")
    payment = Payment.query.filter_by(checkout_request_id=checkout_id).first() if checkout_id else None
    if payment:
        success = callback.get("ResultCode") in (0, "0")
        payment.status = "successful" if success else "failed"
        payment.gateway_response = callback.get("ResultDesc")
        items = callback.get("CallbackMetadata", {}).get("Item", [])
        metadata = {item.get("Name"): item.get("Value") for item in items}
        payment.transaction_id = metadata.get("MpesaReceiptNumber") or payment.transaction_id
        payment.updated_at = datetime.now(timezone.utc)

        if success:
            # Mark booking completed
            booking = db.session.get(Booking, payment.booking_id)
            if booking:
                booking.status = "completed"
            # Notify student
            prop = db.session.get(Property, payment.property_id)
            prop_title = prop.title if prop else "your property"
            db.session.add(Notification(
                user_id=payment.student_id,
                title="Payment confirmed",
                body=f"Your payment of KSh {int(payment.amount):,} for '{prop_title}' was received. You can now leave a review after moving in.",
            ))
            # Notify host
            if prop:
                db.session.add(Notification(
                    user_id=prop.host_id,
                    title="Payment received",
                    body=f"A student has paid KSh {int(payment.amount):,} for '{prop_title}'. Payout will be processed by Qrib.",
                ))

        db.session.commit()
    return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200


@payments_bp.get("/<int:payment_id>")
@jwt_required()
def get_payment(payment_id):
    user_id = int(get_jwt_identity())
    payment = db.session.get(Payment, payment_id)

    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    if payment.student_id != user_id:
        return jsonify({"error": "Access denied"}), 403

    return jsonify({"payment": payment_to_dict(payment)}), 200


@payments_bp.patch("/<int:payment_id>/status")
@jwt_required()
def update_payment_status(payment_id):
    user_id = int(get_jwt_identity())
    payment = db.session.get(Payment, payment_id)

    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    if payment.student_id != user_id:
        return jsonify({"error": "Access denied"}), 403

    if payment.provider == "mpesa":
        return jsonify({"error": "M-Pesa status is updated by Safaricom callback"}), 403

    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if not status:
        return jsonify({"error": "status is required"}), 400

    allowed_statuses = ["pending", "successful", "failed", "cancelled"]
    if status not in allowed_statuses:
        return jsonify({"error": "Invalid status", "allowed_statuses": allowed_statuses}), 400

    payment.status = status
    payment.gateway_response = data.get("gateway_response") or payment.gateway_response
    payment.transaction_id = data.get("transaction_id") or payment.transaction_id
    payment.updated_at = datetime.now(timezone.utc)

    if status == "successful":
        booking = db.session.get(Booking, payment.booking_id)
        if booking:
            booking.status = "completed"
        prop = db.session.get(Property, payment.property_id)
        prop_title = prop.title if prop else "your property"
        db.session.add(Notification(
            user_id=payment.student_id,
            title="Payment confirmed",
            body=f"Your payment of KSh {int(payment.amount):,} for '{prop_title}' was received. You can now leave a review after moving in.",
        ))
        if prop:
            db.session.add(Notification(
                user_id=prop.host_id,
                title="Payment received",
                body=f"A student has paid KSh {int(payment.amount):,} for '{prop_title}'. Payout will be processed by Qrib.",
            ))

    db.session.commit()

    return jsonify({
        "message": "Payment status updated",
        "payment": payment_to_dict(payment),
    }), 200
