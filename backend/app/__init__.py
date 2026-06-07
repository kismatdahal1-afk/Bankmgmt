import os
from flask import Flask
from config.settings import Config
from database.db import db

def create_app(config_class=Config):
    _backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    app = Flask(__name__,
        template_folder=os.path.join(_backend_root, 'templates'),
        static_folder=os.path.join(_backend_root, 'static'),
        static_url_path='/static')
    app.config.from_object(config_class)
    db.init_app(app)
    os.makedirs(app.instance_path, exist_ok=True)

    from routes.auth_routes import auth_bp
    from routes.customer_routes import customer_bp
    from routes.transaction_routes import transaction_bp
    from routes.loan_routes import loan_bp
    from routes.dashboard_routes import reports_bp
    from routes.customer_portal_routes import customer_portal_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(loan_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(customer_portal_bp)

    return app
