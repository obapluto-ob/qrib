import os
import sys
import smtplib
import threading
import time
from datetime import datetime, timezone, timedelta
from app import create_app
from flask_migrate import upgrade

def log(msg):
    print(msg, flush=True)
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()

app = create_app()

with app.app_context():
    try:
        upgrade()
        log("[startup] Migrations applied successfully")
    except Exception as e:
        log(f"[startup] Migration error: {e}")

    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD", "")
    if not gmail_user or not gmail_pass:
        log("[startup] SMTP: GMAIL_USER or GMAIL_APP_PASSWORD not set — emails disabled")
    else:
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as s:
                s.ehlo()
                s.starttls()
                s.ehlo()
                s.login(gmail_user, gmail_pass)
            log(f"[startup] SMTP: connected and authenticated as {gmail_user}")
        except Exception as e:
            log(f"[startup] SMTP: login failed — {e}")


def _expire_unpaid_bookings():
    """Every hour, cancel approved bookings older than 24h with no successful payment."""
    while True:
        time.sleep(3600)
        try:
            with app.app_context():
                from app.extensions import db
                from app.models import Booking, Payment, Notification
                cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                expired = (
                    Booking.query
                    .filter(Booking.status == "approved")
                    .filter(Booking.created_at < cutoff)
                    .all()
                )
                count = 0
                for booking in expired:
                    paid = Payment.query.filter_by(
                        booking_id=booking.id, status="successful"
                    ).first()
                    if not paid:
                        booking.status = "cancelled"
                        db.session.add(Notification(
                            user_id=booking.student_id,
                            title="Booking expired",
                            body=f"Your booking for '{booking.property.title if booking.property else 'a property'}' was cancelled — payment not received within 24 hours.",
                        ))
                        count += 1
                if count:
                    db.session.commit()
                    log(f"[expiry] Cancelled {count} unpaid booking(s)")
        except Exception as e:
            log(f"[expiry] Error: {e}")


threading.Thread(target=_expire_unpaid_bookings, daemon=True).start()

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", host="0.0.0.0", port=5000)
