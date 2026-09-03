import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM = "Qrib <noreply@qrib.co.ke>"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://qrib-mu.vercel.app")
BRAND = "#2563EB"


def _send(to: str, subject: str, html: str):
    if not resend.api_key:
        return
    try:
        resend.Emails.send({"from": FROM, "to": [to], "subject": subject, "html": html})
    except Exception:
        pass


def _base(content: str) -> str:
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:40px 16px">
      <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <div style="background:{BRAND};padding:20px 32px">
          <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Qrib</span>
          <span style="color:#bfdbfe;font-size:13px;margin-left:10px">Student Accommodation</span>
        </div>
        <div style="padding:32px">{content}</div>
        <div style="padding:16px 32px;background:#f1f5f9;font-size:12px;color:#94a3b8;text-align:center">
          Qrib Kenya &mdash; Student accommodation made easier.
        </div>
      </div>
    </div>"""


def _btn(text: str, url: str, color: str = None) -> str:
    bg = color or BRAND
    return f'<p style="margin:28px 0"><a href="{url}" style="background:{bg};color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">{text}</a></p>'


def _row(label: str, value: str, highlight: bool = False) -> str:
    bg = "#f0fdf4" if highlight else "#f8fafc"
    color = "#16a34a" if highlight else "#64748b"
    return f'<tr><td style="padding:10px 14px;background:{bg};border-radius:6px 0 0 6px;color:{color};font-size:14px;width:40%">{label}</td><td style="padding:10px 14px;background:{bg};border-radius:0 6px 6px 0;font-weight:700;color:#0f172a;font-size:14px">{value}</td></tr>'


# ─── Welcome ────────────────────────────────────────────────────────────────

def send_welcome(to: str, name: str, role: str):
    cta = _btn(
        "Complete Host Verification" if role == "host" else "Find Accommodation",
        f"{FRONTEND_URL}/host/verification" if role == "host" else f"{FRONTEND_URL}/student/dashboard"
    )
    note = "Complete your verification to start listing properties." if role == "host" else "Start exploring student accommodation near your university."
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Welcome to Qrib, {name}!</h2>
    <p style="color:#475569;line-height:1.6">Your account is ready. {note}</p>
    {cta}
    <p style="color:#94a3b8;font-size:13px">If you did not create this account, you can ignore this email.</p>"""
    _send(to, "Welcome to Qrib", _base(body))


# ─── Password reset ──────────────────────────────────────────────────────────

def send_password_reset(to: str, name: str, token: str):
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Reset your password</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, we received a request to reset your Qrib password. Click the button below to set a new one.</p>
    {_btn("Reset Password", link)}
    <p style="color:#94a3b8;font-size:13px">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>"""
    _send(to, "Reset your Qrib password", _base(body))


# ─── Booking: new request (to host) ─────────────────────────────────────────

def send_booking_request(host_email: str, host_name: str, student_name: str,
                          property_title: str, move_in: str, booking_id: int):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">New booking request</h2>
    <p style="color:#475569;line-height:1.6">Hi {host_name}, <strong>{student_name}</strong> has requested to book your property.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:20px 0">
      {_row("Property", property_title)}
      {_row("Move-in date", move_in)}
      {_row("Student", student_name)}
    </table>
    {_btn("Review Request", f"{FRONTEND_URL}/host/dashboard")}
    <p style="color:#94a3b8;font-size:13px">Log in to approve or reject this request from your dashboard.</p>"""
    _send(host_email, f"New booking request — {property_title}", _base(body))


# ─── Booking: approved (to student) ─────────────────────────────────────────

def send_booking_approved(to: str, name: str, property_title: str,
                           move_in: str, booking_id: int):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Booking approved</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, great news — your booking request has been approved by the host.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:20px 0">
      {_row("Property", property_title, highlight=True)}
      {_row("Move-in date", move_in, highlight=True)}
    </table>
    {_btn("Proceed to Payment", f"{FRONTEND_URL}/booking/{booking_id}", "#16a34a")}
    <p style="color:#94a3b8;font-size:13px">Complete your payment to secure the accommodation.</p>"""
    _send(to, f"Booking approved — {property_title}", _base(body))


# ─── Booking: rejected (to student) ─────────────────────────────────────────

def send_booking_rejected(to: str, name: str, property_title: str):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Booking update</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, unfortunately your booking request for <strong>{property_title}</strong> was not approved at this time.</p>
    <p style="color:#475569;line-height:1.6">Don't worry — there are many other great options available on Qrib.</p>
    {_btn("Find Other Accommodation", f"{FRONTEND_URL}/search")}"""
    _send(to, f"Booking update — {property_title}", _base(body))


# ─── Booking: payment confirmed (to student) ────────────────────────────────

def send_booking_confirmation(to: str, name: str, property_title: str, move_in: str):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Booking confirmed</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, your payment is confirmed and your accommodation is secured.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:20px 0">
      {_row("Property", property_title, highlight=True)}
      {_row("Move-in date", move_in, highlight=True)}
    </table>
    {_btn("View Dashboard", f"{FRONTEND_URL}/student/dashboard")}
    <p style="color:#94a3b8;font-size:13px">Keep this email as your booking confirmation record.</p>"""
    _send(to, f"Booking confirmed — {property_title}", _base(body))


# ─── Booking: payment received (to host) ────────────────────────────────────

def send_payment_received(to: str, host_name: str, student_name: str,
                           property_title: str, amount: str, move_in: str):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Payment received</h2>
    <p style="color:#475569;line-height:1.6">Hi {host_name}, <strong>{student_name}</strong> has completed payment for your property.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:20px 0">
      {_row("Property", property_title, highlight=True)}
      {_row("Amount paid", f"KSh {amount}", highlight=True)}
      {_row("Move-in date", move_in)}
      {_row("Student", student_name)}
    </table>
    {_btn("View Dashboard", f"{FRONTEND_URL}/host/dashboard")}"""
    _send(to, f"Payment received — {property_title}", _base(body))


# ─── Verification: approved (to host) ───────────────────────────────────────

def send_verification_approved(to: str, name: str):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Verification approved</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, your host account has been verified. You can now list properties on Qrib and start receiving bookings.</p>
    {_btn("Add Your First Property", f"{FRONTEND_URL}/host/add-property", "#16a34a")}"""
    _send(to, "Host verification approved", _base(body))


# ─── Verification: rejected (to host) ───────────────────────────────────────

def send_verification_rejected(to: str, name: str, reason: str):
    body = f"""<h2 style="margin:0 0 12px;color:#0f172a">Verification update</h2>
    <p style="color:#475569;line-height:1.6">Hi {name}, your verification submission needs an update before we can approve your account.</p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;border-radius:6px;margin:20px 0">
      <p style="margin:0;color:#b91c1c;font-size:14px"><strong>Reason:</strong> {reason}</p>
    </div>
    {_btn("Resubmit Verification", f"{FRONTEND_URL}/host/verification", "#dc2626")}
    <p style="color:#94a3b8;font-size:13px">Address the issue above and resubmit your documents.</p>"""
    _send(to, "Host verification update", _base(body))
