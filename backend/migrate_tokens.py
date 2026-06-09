from app import create_app
from database.db import db
from models import CustomerToken

app = create_app()
with app.app_context():
    db.create_all()
    print("customer_tokens table created successfully.")
