import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import create_app
from database.db import db
from models import User, Customer, Account
from decimal import Decimal
from utils.helpers import generate_customer_id, generate_username_from_phone, generate_password_from_name_phone, generate_account_number

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

        sample_customer = Customer.query.filter_by(citizenship_id='AADHR-1234-5678').first()
        if not sample_customer:
            print("Seeding sample customer with username/password123...")
            customer_id_str = generate_customer_id()
            username = generate_username_from_phone('9876543210')
            temp_pass = generate_password_from_name_phone('John Doe', '9876543210')
            customer = Customer(
                customer_id=customer_id_str,
                full_name='John Doe',
                father_name='Robert Doe',
                grandfather_name='William Doe',
                gender='Male',
                citizenship_id='AADHR-1234-5678',
                citizenship_issue_district='Kathmandu',
                marital_status='Married',
                occupation='Teacher',
                phone_number='9876543210',
                email='john.doe@example.com',
                address='14 Garden Lane, Village Kothrud',
                permanent_address='14 Garden Lane, Village Kothrud',
                nominee_name='Jane Doe',
                nominee_contact='9876543211',
                nominee_relationship='Spouse',
                username=username,
                must_change_password=False
            )
            customer.set_password('password123')
            db.session.add(customer)
            db.session.flush()

            savings_acc_num = generate_account_number()
            savings = Account(
                customer_id=customer.id,
                account_number=savings_acc_num,
                account_type='savings',
                balance=Decimal('58420.50'),
                status='active'
            )
            db.session.add(savings)

            current_acc_num = generate_account_number()
            current = Account(
                customer_id=customer.id,
                account_number=current_acc_num,
                account_type='current',
                balance=Decimal('26160.00'),
                status='active'
            )
            db.session.add(current)

            print(f"Sample customer created with username: {username}, password: password123")
        else:
            print("Sample customer already exists.")

        db.session.commit()
        print("Database initialized and seeded successfully!")

if __name__ == '__main__':
    init_database()
