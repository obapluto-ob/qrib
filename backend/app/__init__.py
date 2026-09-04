import os
import re
from datetime import timedelta

from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager

from .extensions import db, migrate
from .models import User, Property, University, Booking, Payment

UNIVERSITY_SEED = [
    {"id": 1, "name": "University of Nairobi", "city": "Nairobi"},
    {"id": 2, "name": "Kenyatta University", "city": "Nairobi"},
    {"id": 3, "name": "Jomo Kenyatta University of Agriculture and Technology", "city": "Kiambu"},
    {"id": 4, "name": "Strathmore University", "city": "Nairobi"},
    {"id": 5, "name": "United States International University - Africa", "city": "Nairobi"},
    {"id": 6, "name": "Moi University", "city": "Eldoret"},
    {"id": 7, "name": "Egerton University", "city": "Njoro"},
    {"id": 8, "name": "Maseno University", "city": "Kisumu"},
    {"id": 9, "name": "Kisii University", "city": "Kisii"},
    {"id": 10, "name": "Maasai Mara University", "city": "Narok"},
    {"id": 11, "name": "Mount Kenya University", "city": "Thika"},
    {"id": 12, "name": "Daystar University", "city": "Nairobi"},
    {"id": 13, "name": "Catholic University of Eastern Africa", "city": "Nairobi"},
    {"id": 14, "name": "Africa Nazarene University", "city": "Nairobi"},
    {"id": 15, "name": "University of Embu", "city": "Embu"},
    {"id": 16, "name": "Dedan Kimathi University of Technology", "city": "Nyeri"},
    {"id": 17, "name": "Technical University of Kenya", "city": "Nairobi"},
    {"id": 18, "name": "Multimedia University of Kenya", "city": "Nairobi"},
    {"id": 19, "name": "KCA University", "city": "Nairobi"},
    {"id": 20, "name": "Riara University", "city": "Nairobi"},
    {"id": 21, "name": "St. Paul’s University", "city": "Limuru"},
    {"id": 22, "name": "University of Eldoret", "city": "Eldoret"},
    {"id": 23, "name": "Machakos University", "city": "Machakos"},
    {"id": 24, "name": "Nakuru University", "city": "Nakuru"},
    {"id": 25, "name": "Meru University of Science and Technology", "city": "Meru"},
    {"id": 26, "name": "Murang’a University of Technology", "city": "Murang’a"},
    {"id": 27, "name": "Co-operative University of Kenya", "city": "Nairobi"},
    {"id": 28, "name": "Karatina University", "city": "Karatina"},
]
from .routes.properties import properties_bp
from .routes.universities import universities_bp
from .routes.bookings import bookings_bp
from .routes.auth import auth_bp
from .routes.payments import payments_bp
from .routes.admin import admin_bp
from .routes.reviews import reviews_bp
from .routes.messages import messages_bp
from .routes.host_verification import host_verification_bp
from .routes.notifications import notifications_bp
from .routes.trust_score import trust_score_bp
from .routes.support import support_bp


load_dotenv()


def create_app():
    app = Flask(__name__)

    # ============================================================
    # DATABASE
    # ============================================================

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///qrib.db",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ============================================================
    # JWT
    # ============================================================

    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable is not set")
    app.config["JWT_SECRET_KEY"] = jwt_secret
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

    # ============================================================
    # INITIALIZE EXTENSIONS
    # ============================================================

    db.init_app(app)
    migrate.init_app(app, db)
    JWTManager(app)

    with app.app_context():
        db.create_all()

        # Ensure message_type column exists (safe on every startup)
        db.session.execute(db.text(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS "
            "message_type VARCHAR(30) NOT NULL DEFAULT 'text'"
        ))
        db.session.execute(db.text(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS "
            "read_at TIMESTAMP WITH TIME ZONE"
        ))
        db.session.execute(db.text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS typing_to_id INTEGER"
        ))
        db.session.execute(db.text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "typing_until TIMESTAMP WITH TIME ZONE"
        ))
        db.session.execute(db.text(
            "ALTER TABLE payments ADD COLUMN IF NOT EXISTS "
            "checkout_request_id VARCHAR(120)"
        ))
        db.session.execute(db.text(
            "ALTER TABLE payments ADD COLUMN IF NOT EXISTS "
            "merchant_request_id VARCHAR(120)"
        ))
        # All columns added by migrations — safe to run every startup
        db.session.execute(db.text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(120)"))
        db.session.execute(db.text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response TEXT"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_cost NUMERIC(10,2) DEFAULT 0"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS electricity_cost NUMERIC(10,2) DEFAULT 0"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_from VARCHAR(20)"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_to VARCHAR(20)"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS semester_label VARCHAR(50)"))
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)"))
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)"))
        db.session.execute(db.text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)"))
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'"))
        db.session.commit()

        for university in UNIVERSITY_SEED:
            entry = db.session.get(University, university["id"])
            if entry is None:
                db.session.add(
                    University(
                        id=university["id"],
                        name=university["name"],
                        city=university["city"],
                    )
                )
            else:
                entry.name = university["name"]
                entry.city = university["city"]

        db.session.commit()

    # ============================================================
    # CORS
    # ============================================================

    configured_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    allowed_origins = [
        "http://172.29.254.86:5173",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://0.0.0.0:5173",
        "https://qrib-mu.vercel.app",
        "https://qrib-f4sk.onrender.com",
        os.getenv("FRONTEND_URL", "https://qrib-mu.vercel.app"),
    ]

    if configured_origins:
        allowed_origins.extend(
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        )

    allowed_origins = [
        origin.strip()
        for origin in allowed_origins
        if origin and origin.strip()
    ]
    allowed_origins = list(dict.fromkeys(allowed_origins))

    def is_allowed_origin(origin):
        if not origin:
            return False

        if origin in allowed_origins:
            return True

        return bool(
            re.match(r"^https://[a-z0-9-]+\.vercel\.app$", origin)
            or re.match(r"^https://[a-z0-9-]+\.onrender\.com$", origin)
        )

    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin")

        if origin and is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

            if request.method == "OPTIONS":
                response.headers["Access-Control-Max-Age"] = "600"

        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        from flask import jsonify as _jsonify
        import traceback
        origin = request.headers.get("Origin")
        resp = _jsonify({"error": str(e), "trace": traceback.format_exc()})
        resp.status_code = 500
        if origin and is_allowed_origin(origin):
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
        return resp

    @app.route("/api/<path:subpath>", methods=["OPTIONS"])
    def api_preflight(subpath):
        origin = request.headers.get("Origin")
        if not origin or not is_allowed_origin(origin):
            return jsonify({"error": "Origin not allowed"}), 403

        response = jsonify({"ok": True})
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "600"
        response.headers["Vary"] = "Origin"
        return response, 200

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
    )

    # ============================================================
    # ROUTES
    # ============================================================

    app.register_blueprint(auth_bp)
    app.register_blueprint(properties_bp)
    app.register_blueprint(universities_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(host_verification_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(trust_score_bp)
    app.register_blueprint(support_bp)

    # ============================================================
    # FLASK SHELL
    # ============================================================

    @app.shell_context_processor
    def make_shell_context():
        return {
            "db": db,
            "User": User,
            "Property": Property,
            "University": University,
            "Booking": Booking,
        }

    # ============================================================
    # HEALTH CHECK
    # ============================================================

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "message": "Qrib API is running",
        }

    return app
