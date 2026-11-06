import os
from flask import Flask, jsonify, send_from_directory
from sqlalchemy import inspect as sa_inspect
from app.config import Config
from app.extensions import db, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.admin import admin_bp
    from app.api.fleet import fleet_bp
    from app.api.vehicles import vehicles_bp
    from app.api.tyres import tyres_bp
    from app.api.trips import trips_bp
    from app.api.inspections import inspections_bp
    from app.api.alerts import alerts_bp
    from app.api.analytics import analytics_bp
    from app.api.driver import driver_bp
    from app.api.treel import treel_bp
    from app.api.export import export_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(fleet_bp, url_prefix="/api/v1/fleets")
    app.register_blueprint(vehicles_bp, url_prefix="/api/v1/vehicles")
    app.register_blueprint(tyres_bp, url_prefix="/api/v1/tyres")
    app.register_blueprint(trips_bp, url_prefix="/api/v1/trips")
    app.register_blueprint(inspections_bp, url_prefix="/api/v1/inspections")
    app.register_blueprint(alerts_bp, url_prefix="/api/v1/alerts")
    app.register_blueprint(analytics_bp, url_prefix="/api/v1/analytics")
    app.register_blueprint(driver_bp, url_prefix="/api/v1/driver")
    app.register_blueprint(treel_bp, url_prefix="/api/v1/treel")
    app.register_blueprint(export_bp, url_prefix="/api/v1/export")

    # Auto-run schema migrations and seed on empty database
    with app.app_context():
        try:
            db.create_all()
            inspector = sa_inspect(db.engine)
            tyre_cols = [c["name"] for c in inspector.get_columns("tyres")]
            if "lifecycle_type" not in tyre_cols:
                from migrations.migrate_v3 import run_migration
                run_migration()

            # Ensure silent OEM Fleet Vault baseline sync for JK Tyre
            from app.services.oem_vault_service import OEMDataSyncService
            OEMDataSyncService.ensure_baseline_sync()

            # Automatic compliance cleanup: Purge any legacy vehicles below 10 wheels
            from app.models.vehicle import Vehicle
            dirty = False
            for v in Vehicle.query.all():
                total_w = v.layout.get("total_wheels", 10) if isinstance(v.layout, dict) else 10
                if total_w < 10 or v.wheel_config in ["4-Wheeler", "6-Wheeler", "Four-Wheeler", "Six-Wheeler"] or v.vehicle_number in ["DL-01-AF-3525", "TN04 BF5918", "MH-12-JK-8888"]:
                    app.logger.info(f"Purging legacy vehicle on startup: {v.vehicle_number} ({v.wheel_config})")
                    db.session.delete(v)
                    dirty = True
            if dirty:
                db.session.commit()

            # Check if this is a fresh cloud database (0 users registered) or 0 vehicles
            from app.models.user import User
            if User.query.first() is None or Vehicle.query.first() is None:
                app.logger.info("Fresh database or empty fleet detected. Auto-seeding commercial multi-axle fleet...")
                from synthetic.generator import generate_fleet_data
                generate_fleet_data(num_vehicles=20, seed=42, weeks_history=3)
        except Exception as exc:
            app.logger.warning(f"Migration, OEM sync, or auto-seed notice: {exc}")

    # Global Health Check & Info
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "JK Tyre Fleet Intelligence API",
            "demo_mode": app.config.get("DEMO_MODE", True),
            "rule_version": app.config.get("RULE_ENGINE_VERSION", "v1.0.0-demo-provisional"),
        }), 200

    # Production Static Files (Serve Vite React SPA)
    possible_dist_dirs = [
        os.path.abspath(os.path.join(app.root_path, "..", "..", "frontend", "dist")),
        os.path.abspath(os.path.join(app.root_path, "..", "dist")),
        os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
        os.path.abspath(os.path.join(os.getcwd(), "dist")),
    ]
    dist_dir = next((d for d in possible_dist_dirs if os.path.isdir(d) and os.path.isfile(os.path.join(d, "index.html"))), possible_dist_dirs[0])

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"error": "Endpoint not found"}), 404
        if path and os.path.isfile(os.path.join(dist_dir, path)):
            return send_from_directory(dist_dir, path)
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.isfile(index_file):
            resp = send_from_directory(dist_dir, "index.html")
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
            return resp
        return jsonify({
            "service": "JK Tyre Fleet Intelligence Platform",
            "status": "online",
            "message": "Frontend build not detected. Please run 'npm run build' inside frontend/"
        }), 200

    # Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "details": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app
