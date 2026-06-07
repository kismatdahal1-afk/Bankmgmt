from app import create_app
from database.db import db
from models import User, Customer, Account
from decimal import Decimal

def init_database():
    app = create_app()
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            print("Seeding default Admin operator...")
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
        else:
            print("Admin user already exists.")

        staff_user = User.query.filter_by(username='staff').first()
        if not staff_user:
            print("Seeding default Staff operator...")
            staff = User(username='staff', role='staff')
            staff.set_password('staff123')
            db.session.add(staff)
        else:
            print("Staff user already exists.")

        sample_customer = Customer.query.filter_by(username='john').first()
        if not sample_customer:
            print("Seeding sample customer (john/password123)...")
            customer = Customer(
                full_name='John Doe',
                address='14 Garden Lane, Village Kothrud',
                phone_number='9876543210',
                citizenship_id='AADHR-1234-5678',
                username='john',
                status='active'
            )
            customer.set_password('password123')
            db.session.add(customer)
            db.session.flush()

            import uuid
            savings = Account(
                customer_id=customer.id,
                account_number=f"SAV-{uuid.uuid4().hex[:8].upper()}",
                account_type='savings',
                balance=Decimal('58420.50'),
                status='active'
            )
            db.session.add(savings)

            current = Account(
                customer_id=customer.id,
                account_number=f"CUR-{uuid.uuid4().hex[:8].upper()}",
                account_type='current',
                balance=Decimal('26160.00'),
                status='active'
            )
            db.session.add(current)
        else:
            print("Sample customer already exists.")

        db.session.commit()
        print("Database initialized and seeded successfully!")

if __name__ == '__main__':
    init_database()
