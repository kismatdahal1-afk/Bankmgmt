from app import create_app
from app.database import db
from app.models import User

def init_database():
    app = create_app()
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        
        # Check if default admin exists, if not create one
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            print("Seeding default Admin operator...")
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
        else:
            print("Admin user already exists.")

        # Check if default staff exists, if not create one
        staff_user = User.query.filter_by(username='staff').first()
        if not staff_user:
            print("Seeding default Staff operator...")
            staff = User(username='staff', role='staff')
            staff.set_password('staff123')
            db.session.add(staff)
        else:
            print("Staff user already exists.")

        db.session.commit()
        print("Database initialized and seeded successfully!")

if __name__ == '__main__':
    init_database()
