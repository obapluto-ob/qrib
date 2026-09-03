import os
from app import create_app
from flask_migrate import upgrade

app = create_app()

# Run pending migrations automatically on every startup.
# This ensures the production DB is always in sync with the models.
with app.app_context():
    try:
        upgrade()
    except Exception as e:
        print(f"[startup] Migration warning: {e}")

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true", host="0.0.0.0", port=5000)
