import os
from flask import Flask
from app.config import Config
from app.database import db

def create_app(config_class=Config):
    # Initialize the flask app
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize SQLAlchemy database with Flask app
    db.init_app(app)

    # Ensure instance folder exists for SQLite db
    os.makedirs(app.instance_path, exist_ok=True)

    # Register Blueprints
    from app.auth.routes import auth_bp
    from app.customer.routes import customer_bp
    from app.transaction.routes import transaction_bp
    from app.loan.routes import loan_bp
    from app.reports.routes import reports_bp
    from app.customer_portal.routes import customer_portal_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(loan_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(customer_portal_bp)

    return app
