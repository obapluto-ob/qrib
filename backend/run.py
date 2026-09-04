import os
import sys
import smtplib
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
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as s:
                s.login(gmail_user, gmail_pass)
            log(f"[startup] SMTP: connected and authenticated as {gmail_user}")
        except Exception as e:
            log(f"[startup] SMTP: login failed — {e}")

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", host="0.0.0.0", port=5000)
