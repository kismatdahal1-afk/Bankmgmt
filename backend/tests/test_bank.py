import unittest
from decimal import Decimal
from app import create_app
from database.db import db
from models import User, Customer, Account
from config.settings import Config
from utils.emi_calculator import calculate_emi_and_payable

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class VillageBankTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_password_hashing(self):
        user = User(username='testoperator', role='staff')
        user.set_password('securepassword123')
        db.session.add(user)
        db.session.commit()

        retrieved_user = User.query.filter_by(username='testoperator').first()
        self.assertIsNotNone(retrieved_user)
        self.assertTrue(retrieved_user.check_password('securepassword123'))
        self.assertFalse(retrieved_user.check_password('wrongpassword'))
        self.assertNotEqual(retrieved_user.password_hash, 'securepassword123')

    def test_emi_calculation(self):
        emi, total_payable = calculate_emi_and_payable(Decimal('10000'), Decimal('12.00'), 12)
        self.assertAlmostEqual(float(emi), 888.49, places=2)
        self.assertAlmostEqual(float(total_payable), 10661.85, places=2)

    def test_customer_and_account_creation(self):
        customer = Customer(
            full_name='Alice Smith',
            address='456 Elm St, Greenfield',
            phone_number='555-9876',
            citizenship_id='US-90182-Y'
        )
        db.session.add(customer)
        db.session.flush()

        account = Account(
            customer_id=customer.id,
            account_number='2000000001',
            account_type='savings',
            balance=Decimal('500.00')
        )
        db.session.add(account)
        db.session.commit()

        saved_customer = Customer.query.filter_by(phone_number='555-9876').first()
        self.assertIsNotNone(saved_customer)
        self.assertEqual(saved_customer.full_name, 'Alice Smith')
        self.assertEqual(len(saved_customer.accounts), 1)
        self.assertEqual(saved_customer.accounts[0].account_number, '2000000001')
        self.assertEqual(float(saved_customer.accounts[0].balance), 500.00)

if __name__ == '__main__':
    unittest.main()
