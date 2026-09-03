import os
from app import create_app
from app.extensions import db
from flask_migrate import upgrade
from sqlalchemy import text

app = create_app()

with app.app_context():
    # If the DB is stuck on a migration that partially applied (e.g. DuplicateTable),
    # stamp it forward so alembic skips the broken step and runs only the missing ones.
    BROKEN_REVISIONS = {
        "97de0d72f2d3": "6b2c3d4e5f6a",  # payments table already existed — skip to after water_cost
    }
    try:
        row = db.session.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        if row and row[0] in BROKEN_REVISIONS:
            target = BROKEN_REVISIONS[row[0]]
            db.session.execute(text(f"UPDATE alembic_version SET version_num = '{target}'"))
            db.session.commit()
            print(f"[startup] Stamped alembic_version from {row[0]} to {target}")
    except Exception as e:
        print(f"[startup] Stamp check skipped: {e}")
    try:
        upgrade()
        print("[startup] Migrations applied successfully")
    except Exception as e:
        print(f"[startup] Migration warning: {e}")

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", host="0.0.0.0", port=5000)
