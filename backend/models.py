import datetime
import uuid
from decimal import Decimal
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import db

_NPT = datetime.timezone(datetime.timedelta(hours=5, minutes=45))
def _utcnow():
    return datetime.datetime.now(_NPT).replace(tzinfo=None)

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
    status = db.Column(db.String(20), default='active', nullable=False) # 'active', 'suspended', 'closed', 'archived'
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
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False, index=True)
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
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    balance_after = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='successful', nullable=False)
    reference_number = db.Column(db.String(50), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<Transaction {self.transaction_uuid} - {self.type} of {self.amount}>"


class Loan(db.Model):
    """Loan tracker."""
    __tablename__ = 'loans'

    id = db.Column(db.Integer, primary_key=True)
    loan_number = db.Column(db.String(20), unique=True, nullable=False, default=lambda: f"LN-{uuid.uuid4().hex[:12].upper()}")
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False, index=True)
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
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False, index=True)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), nullable=False, default='info')
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<Notification #{self.id} - {self.title}>"


class CustomerToken(db.Model):
    """Per-tab auth token for customer session isolation."""
    __tablename__ = 'customer_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    customer = db.relationship('Customer', backref='auth_tokens', lazy=True)

    def __repr__(self):
        return f"<CustomerToken #{self.id} for customer {self.customer_id}>"


class ReferenceSequence(db.Model):
    """Global sequential counter for transaction reference numbers."""
    __tablename__ = 'reference_sequence'

    id = db.Column(db.Integer, primary_key=True)
    counter = db.Column(db.BigInteger, default=0, nullable=False)

    @classmethod
    def next_value(cls):
        from sqlalchemy import text
        seq = cls.query.with_for_update().first()
        if not seq:
            seq = cls(counter=0)
            db.session.add(seq)
        seq.counter += 1
        return seq.counter


class LoanApplication(db.Model):
    __tablename__ = 'loan_applications'

    id = db.Column(db.Integer, primary_key=True)
    application_number = db.Column(db.String(30), unique=True, nullable=False, default=lambda: f"LA-{uuid.uuid4().hex[:10].upper()}")
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False, index=True)
    loan_type = db.Column(db.String(30), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    duration_months = db.Column(db.Integer, nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False, default=Decimal('12.00'))
    purpose = db.Column(db.Text, nullable=True)
    collateral_type = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(30), default='draft', nullable=False)
    assigned_staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    appointment_date = db.Column(db.Date, nullable=True)
    appointment_time = db.Column(db.String(10), nullable=True)
    staff_remark = db.Column(db.Text, nullable=True)
    admin_remark = db.Column(db.Text, nullable=True)
    processing_notes = db.Column(db.Text, nullable=True)
    expected_processing_days = db.Column(db.Integer, default=7)
    submitted_at = db.Column(db.DateTime, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    disbursed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    customer = db.relationship('Customer', backref='loan_applications', lazy=True)
    assigned_staff = db.relationship('User', backref='assigned_applications', lazy=True)
    documents = db.relationship('LoanDocument', backref='application', lazy=True, cascade="all, delete-orphan")
    status_history = db.relationship('LoanStatusHistory', backref='application', lazy=True, cascade="all, delete-orphan")
    clarification_requests = db.relationship('ClarificationRequest', backref='application', lazy=True, cascade="all, delete-orphan")
    verification_notes = db.relationship('VerificationNote', backref='application', lazy=True, cascade="all, delete-orphan")
    appointments = db.relationship('Appointment', backref='application', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LoanApplication {self.application_number} - {self.status}>"


class LoanDocument(db.Model):
    __tablename__ = 'loan_documents'

    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False, index=True)
    document_type = db.Column(db.String(50), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<LoanDocument {self.document_type} - {self.file_name}>"


class LoanStatusHistory(db.Model):
    __tablename__ = 'loan_status_history'

    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False, index=True)
    old_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by = db.Column(db.String(100), nullable=True)
    changed_at = db.Column(db.DateTime, default=_utcnow)
    remarks = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<LoanStatusHistory #{self.id} - {self.old_status} -> {self.new_status}>"


class ClarificationRequest(db.Model):
    __tablename__ = 'clarification_requests'

    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False, index=True)
    request_by = db.Column(db.String(100), nullable=True)
    reason = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=_utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<ClarificationRequest #{self.id} - Resolved: {self.is_resolved}>"


class VerificationNote(db.Model):
    __tablename__ = 'verification_notes'

    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False, index=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    notes = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    staff = db.relationship('User', backref='verification_notes', lazy=True)

    def __repr__(self):
        return f"<VerificationNote #{self.id}>"


class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True)
    loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=False, index=True)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.String(10), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    def __repr__(self):
        return f"<Appointment #{self.id} - {self.appointment_date}>"


class AuditLog(db.Model):
    """Audit trail for all critical system actions."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True, index=True)
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
