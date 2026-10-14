# DFD 1.0-9.0 - Application Factory & Blueprint Registration
import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config, BASE_DIR
from database import db
from routes.auth_routes import auth_bp
from routes.issue_routes import issue_bp
from routes.admin_routes import admin_bp
from routes.notification_routes import notification_bp
from routes.sla_routes import sla_bp
from routes.analytics_routes import analytics_bp
from services.escalation_service import init_scheduler

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend client
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize Database
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(sla_bp)
    app.register_blueprint(analytics_bp)

    # Static file route for uploads
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "CivicConnect REST API",
            "version": "1.0.0"
        }), 200

    # Ensure upload directory exists, create tables, and start scheduler
    with app.app_context():
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        db.create_all()
        if not app.config.get("TESTING", False):
            if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
                init_scheduler(app)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
