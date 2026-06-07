import unittest
from decimal import Decimal
from app import create_app
from app.database import db
from app.models import User, Customer, Account
from app.config import Config
from app.loan.routes import calculate_emi_and_payable

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' # Use in-memory database for testing

class VillageBankTestCase(unittest.TestCase):
    def setUp(self):
        """Set up testing client and database in-memory."""
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Create all tables in memory
        db.create_all()

    def tearDown(self):
        """Teardown database and pop application context."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_password_hashing(self):
        """Test that user passwords are correctly hashed and checked."""
        user = User(username='testoperator', role='staff')
        user.set_password('securepassword123')
        db.session.add(user)
        db.session.commit()

        # Retrieve user and check password validity
        retrieved_user = User.query.filter_by(username='testoperator').first()
        self.assertIsNotNone(retrieved_user)
        self.assertTrue(retrieved_user.check_password('securepassword123'))
        self.assertFalse(retrieved_user.check_password('wrongpassword'))
        # Confirm hash is not raw text
        self.assertNotEqual(retrieved_user.password_hash, 'securepassword123')

    def test_emi_calculation(self):
        """Test that standard EMI calculator yields accurate figures."""
        # Principal: $10,000, 12% Annual Rate, 12 Months duration
        emi, total_payable = calculate_emi_and_payable(Decimal('10000'), Decimal('12.00'), 12)
        # Expected EMI should be around $888.49
        # Expected Total Payable should be around $10661.85
        self.assertAlmostEqual(float(emi), 888.49, places=2)
        self.assertAlmostEqual(float(total_payable), 10661.85, places=2)

    def test_customer_and_account_creation(self):
        """Test customer registration and linkage to account."""
        customer = Customer(
            full_name="Alice Smith",
            address="456 Elm St, Greenfield",
            phone_number="555-9876",
            citizenship_id="US-90182-Y"
        )
        db.session.add(customer)
        db.session.flush()

        account = Account(
            customer_id=customer.id,
            account_number="2000000001",
            account_type="savings",
            balance=Decimal('500.00')
        )
        db.session.add(account)
        db.session.commit()

        # Check queries
        saved_customer = Customer.query.filter_by(phone_number="555-9876").first()
        self.assertIsNotNone(saved_customer)
        self.assertEqual(saved_customer.full_name, "Alice Smith")
        self.assertEqual(len(saved_customer.accounts), 1)
        self.assertEqual(saved_customer.accounts[0].account_number, "2000000001")
        self.assertEqual(float(saved_customer.accounts[0].balance), 500.00)

if __name__ == '__main__':
    unittest.main()
