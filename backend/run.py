import os
from app import create_app
from flask_migrate import upgrade

app = create_app()

with app.app_context():
    try:
        upgrade()
        print("[startup] Migrations applied successfully")
    except Exception as e:
        print(f"[startup] Migration error: {e}")

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", host="0.0.0.0", port=5000)
