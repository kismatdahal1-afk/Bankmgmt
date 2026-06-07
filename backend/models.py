import datetime
import uuid
from decimal import Decimal
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import db

def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

class User(db.Model):
    """System operators (Admins and Staff)."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='staff') # 'admin' or 'staff'
    created_at = db.Column(db.DateTime, default=_utcnow)

    def set_password(self, password):
        """Hashes the password and stores the hash."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verifies a hashed password."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Customer(db.Model):
    """Customer profile details."""
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.String(20), unique=True, nullable=True)
    full_name = db.Column(db.String(100), nullable=False)
    father_name = db.Column(db.String(100), nullable=True)
    grandfather_name = db.Column(db.String(100), nullable=True)
    dob = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    citizenship_id = db.Column(db.String(50), unique=True, nullable=False)
    citizenship_issue_district = db.Column(db.String(100), nullable=True)
    marital_status = db.Column(db.String(20), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    alternate_mobile = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    address = db.Column(db.Text, nullable=False)
    permanent_address = db.Column(db.Text, nullable=True)
    temporary_address = db.Column(db.Text, nullable=True)
    nominee_name = db.Column(db.String(100), nullable=True)
    nominee_contact = db.Column(db.String(20), nullable=True)
    nominee_relationship = db.Column(db.String(50), nullable=True)
    username = db.Column(db.String(50), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=True)
    must_change_password = db.Column(db.Boolean, default=True, nullable=False)
    mobile_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    email_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False) # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=_utcnow)

    # Relationships
    accounts = db.relationship('Account', backref='customer', lazy=True, cascade="all, delete-orphan")
    loans = db.relationship('Loan', backref='customer', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<Customer {self.full_name}>"


class Account(db.Model):
    """Customer savings and current accounts."""
    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    account_number = db.Column(db.String(20), unique=True, nullable=False)
    account_type = db.Column(db.String(20), nullable=False)
    balance = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)
    last_transaction_date = db.Column(db.DateTime, nullable=True)
    total_deposits = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    total_withdrawals = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    transactions = db.relationship('Transaction', backref='account', lazy=True)

    def __repr__(self):
        return f"<Account {self.account_number} ({self.account_type}) - Bal: {self.balance}>"


class Transaction(db.Model):
    """Ledger table containing all financial transactions."""
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    transaction_uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: f"TXN-{uuid.uuid4().hex[:12].upper()}")
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    balance_after = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='successful', nullable=False)
    reference_number = db.Column(db.String(50), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<Transaction {self.transaction_uuid} - {self.type} of {self.amount}>"


class Loan(db.Model):
    """Loan tracker."""
    __tablename__ = 'loans'

    id = db.Column(db.Integer, primary_key=True)
    loan_number = db.Column(db.String(20), unique=True, nullable=False, default=lambda: f"LN-{uuid.uuid4().hex[:12].upper()}")
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False) # Principal amount
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False) # Annual interest rate (e.g. 12.00%)
    duration_months = db.Column(db.Integer, nullable=False)
    emi = db.Column(db.Numeric(15, 2), nullable=False)
    total_payable = db.Column(db.Numeric(15, 2), nullable=False)
    total_paid = db.Column(db.Numeric(15, 2), default=Decimal('0.00'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    applied_date = db.Column(db.DateTime, default=_utcnow)
    approved_date = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    last_payment_date = db.Column(db.DateTime, nullable=True)

    # Relationships
    repayments = db.relationship('Repayment', backref='loan', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Loan {self.loan_number} - Status: {self.status}>"


class Repayment(db.Model):
    """Repayments made against active loans."""
    __tablename__ = 'repayments'

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    emi_number = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), default='paid', nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    repayment_date = db.Column(db.DateTime, default=_utcnow)
    received_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def __repr__(self):
        return f"<Repayment against Loan {self.loan_id} of {self.amount}>"


class Notification(db.Model):
    """System notifications for users and customers."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), nullable=False, default='info')
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<Notification #{self.id} - {self.title}>"


class AuditLog(db.Model):
    """Audit trail for all critical system actions."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    username = db.Column(db.String(100), nullable=True)
    role = db.Column(db.String(20), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    resource_type = db.Column(db.String(50), nullable=True)
    resource_id = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    status = db.Column(db.String(20), default='success', nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<AuditLog #{self.id} - {self.action}>"
