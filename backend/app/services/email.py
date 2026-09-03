import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM = "Qrib <noreply@qrib.co.ke>"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://qrib-mu.vercel.app")


def _send(to: str, subject: str, html: str):
    if not resend.api_key:
        return
    try:
        resend.Emails.send({"from": FROM, "to": [to], "subject": subject, "html": html})
    except Exception:
        pass


def send_welcome(to: str, name: str, role: str):
    cta = (
        f'<a href="{FRONTEND_URL}/host/verification" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Complete Host Verification</a>'
        if role == "host"
        else f'<a href="{FRONTEND_URL}/student/dashboard" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Find Accommodation</a>'
    )
    _send(to, "Welcome to Qrib 🎉", f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px">
      <h1 style="color:#7C3AED">Welcome to Qrib, {name}!</h1>
      <p>Your account is ready. {"As a host, complete your verification to start listing properties." if role == "host" else "Start exploring student accommodation near your university."}</p>
      <p style="margin:28px 0">{cta}</p>
      <p style="color:#888;font-size:13px">If you didn't create this account, ignore this email.</p>
    </div>
    """)


def send_password_reset(to: str, name: str, token: str):
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    _send(to, "Reset your Qrib password", f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px">
      <h1 style="color:#7C3AED">Password Reset</h1>
      <p>Hi {name}, we received a request to reset your password.</p>
      <p style="margin:28px 0">
        <a href="{link}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      </p>
      <p style="color:#888;font-size:13px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
    """)


def send_booking_confirmation(to: str, name: str, property_title: str, move_in: str):
    _send(to, f"Booking confirmed — {property_title}", f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px">
      <h1 style="color:#7C3AED">Booking Confirmed ✅</h1>
      <p>Hi {name}, your booking for <strong>{property_title}</strong> has been confirmed.</p>
      <p>Move-in date: <strong>{move_in}</strong></p>
      <p style="margin:28px 0">
        <a href="{FRONTEND_URL}/student/dashboard" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Dashboard</a>
      </p>
    </div>
    """)
