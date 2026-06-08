import datetime
import functools
import uuid
from decimal import Decimal
from flask import Blueprint, request, jsonify, session, g
from sqlalchemy.orm import joinedload, subqueryload
from extensions import limiter
from database.db import db
from models import User, Customer, Account, Transaction, Loan, Repayment, Notification, AuditLog
from utils.helpers import generate_customer_id, generate_username, generate_temporary_password, generate_account_number
from utils.emi_calculator import calculate_emi_and_payable
from utils.audit_helper import log_audit, create_notification, notify_customer, notify_staff
from utils.report_helper import (
    generate_deposit_report, generate_withdrawal_report, generate_loan_report,
    generate_emi_collection_report, generate_interest_report,
    generate_customer_report, generate_account_report, generate_customer_summary
)

def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

api_bp = Blueprint('api', __name__, url_prefix='/api')

def api_login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session and 'customer_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

def staff_or_admin_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

def customer_login_required_api(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'customer_id' not in session:
            return jsonify({'error': 'Customer authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

def _serialize_customer(c):
    return {
        'id': c.id,
        'customer_id': c.customer_id,
        'full_name': c.full_name,
        'father_name': c.father_name,
        'grandfather_name': c.grandfather_name,
        'dob': c.dob.isoformat() if c.dob else None,
        'gender': c.gender,
        'citizenship_id': c.citizenship_id,
        'citizenship_issue_district': c.citizenship_issue_district,
        'marital_status': c.marital_status,
        'occupation': c.occupation,
        'phone_number': c.phone_number,
        'alternate_mobile': c.alternate_mobile,
        'email': c.email,
        'address': c.address,
        'permanent_address': c.permanent_address,
        'temporary_address': c.temporary_address,
        'nominee_name': c.nominee_name,
        'nominee_contact': c.nominee_contact,
        'nominee_relationship': c.nominee_relationship,
        'username': c.username,
        'must_change_password': c.must_change_password,
        'mobile_confirmed': c.mobile_confirmed,
        'email_confirmed': c.email_confirmed,
        'status': c.status,
        'created_at': c.created_at.isoformat() if c.created_at else None,
        'accounts': [_serialize_account(a) for a in c.accounts] if c.accounts else []
    }

def _serialize_account(a):
    return {
        'id': a.id,
        'customer_id': a.customer_id,
        'account_number': a.account_number,
        'account_type': a.account_type,
        'balance': float(a.balance),
        'status': a.status,
        'last_transaction_date': a.last_transaction_date.isoformat() if a.last_transaction_date else None,
        'total_deposits': float(a.total_deposits),
        'total_withdrawals': float(a.total_withdrawals),
        'created_at': a.created_at.isoformat() if a.created_at else None,
        'customer': _simple_customer(a.customer) if a.customer else None
    }

def _simple_customer(c):
    return {
        'id': c.id,
        'full_name': c.full_name,
        'phone_number': c.phone_number,
        'citizenship_id': c.citizenship_id,
    }

def _simple_account(a):
    return {
        'id': a.id,
        'account_number': a.account_number,
        'account_type': a.account_type,
        'balance': float(a.balance),
        'status': a.status
    }

def _serialize_transaction(t):
    return {
        'id': t.id,
        'transaction_uuid': t.transaction_uuid,
        'account_id': t.account_id,
        'type': t.type,
        'amount': float(t.amount),
        'balance_after': float(t.balance_after),
        'description': t.description,
        'status': t.status,
        'reference_number': t.reference_number,
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'account': _serialize_account(t.account) if t.account else None
    }

def _compute_loan_overdue(l):
    if l.status != 'approved':
        return False
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if l.approved_date:
        months_elapsed = (now.year - l.approved_date.year) * 12 + (now.month - l.approved_date.month)
        expected_emis_paid = min(months_elapsed, l.duration_months)
        expected_min_paid = Decimal(str(expected_emis_paid)) * Decimal(str(l.emi or 0))
        if Decimal(str(l.total_paid)) < expected_min_paid * Decimal('0.5'):
            return True
    return l.last_payment_date and (now - l.last_payment_date).days > 60

def _compute_remaining_emis(l):
    emi = l.emi
    if not emi or emi <= 0:
        return 0
    remaining = Decimal(str(l.total_payable)) - Decimal(str(l.total_paid))
    emi = Decimal(str(emi))
    return max(0, int(remaining / emi) + (1 if remaining % emi > 0 else 0))

def _serialize_loan(l):
    overdue = _compute_loan_overdue(l)
    effective_status = 'overdue' if overdue and l.status == 'approved' else l.status
    remaining_emis = _compute_remaining_emis(l)
    return {
        'id': l.id,
        'loan_number': l.loan_number,
        'customer_id': l.customer_id,
        'amount': float(l.amount),
        'interest_rate': float(l.interest_rate),
        'duration_months': l.duration_months,
        'emi': float(l.emi),
        'total_payable': float(l.total_payable),
        'total_paid': float(l.total_paid),
        'status': effective_status,
        'raw_status': l.status,
        'is_overdue': overdue,
        'remaining_emis': remaining_emis,
        'applied_date': l.applied_date.isoformat() if l.applied_date else None,
        'approved_date': l.approved_date.isoformat() if l.approved_date else None,
        'last_payment_date': l.last_payment_date.isoformat() if l.last_payment_date else None,
        'customer': _simple_customer(l.customer) if l.customer else None,
        'repayments': [{
            'id': r.id,
            'amount': float(r.amount),
            'emi_number': r.emi_number,
            'status': r.status,
            'due_date': r.due_date.isoformat() if r.due_date else None,
            'repayment_date': r.repayment_date.isoformat() if r.repayment_date else None
        } for r in l.repayments] if l.repayments else []
    }

# ===== AUTH ENDPOINTS =====

@api_bp.route('/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json(silent=True) or request.form
        username = (data.get('username') or '').strip()
        password = data.get('password', '')
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            log_audit('login_failed', 'auth', None, f'Failed login attempt for user: {username}', 'failure')
            db.session.commit()
            return jsonify({'error': 'Invalid username or password'}), 401
        session.clear()
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        log_audit('login', 'auth', user.id, f'User {user.username} ({user.role}) logged in')
        db.session.commit()
        return jsonify({
            'user_id': user.id,
            'username': user.username,
            'role': user.role
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@api_bp.route('/auth/logout', methods=['POST'])
def api_logout():
    if 'user_id' in session:
        log_audit('logout', 'auth', session.get('user_id'), f'User {session.get("username")} logged out')
        db.session.commit()
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@api_bp.route('/customer/login', methods=['POST'])
def api_customer_login():
    try:
        data = request.get_json(silent=True) or request.form
        username = (data.get('username') or '').strip()
        password = data.get('password', '')
        customer = Customer.query.filter_by(username=username, status='active').first()
        if not customer or not customer.check_password(password):
            log_audit('customer_login_failed', 'auth', None, f'Failed customer login: {username}', 'failure')
            db.session.commit()
            return jsonify({'error': 'Invalid username or password'}), 401
        session.clear()
        session['customer_id'] = customer.id
        session['customer_name'] = customer.full_name
        log_audit('customer_login', 'auth', customer.id, f'Customer {customer.full_name} logged in')
        db.session.commit()
        return jsonify({
            'customer_id': customer.id,
            'customer_name': customer.full_name,
            'phone_number': customer.phone_number,
            'email': customer.email or '',
            'must_change_password': customer.must_change_password,
            'mobile_confirmed': customer.mobile_confirmed,
            'email_confirmed': customer.email_confirmed
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@api_bp.route('/customer/logout', methods=['POST'])
def api_customer_logout():
    if 'customer_id' in session:
        log_audit('customer_logout', 'auth', session.get('customer_id'), f'Customer {session.get("customer_name")} logged out')
        db.session.commit()
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

# ===== CUSTOMER ENDPOINTS =====

@api_bp.route('/customers/', methods=['GET'])
@staff_or_admin_required
def api_list_customers():
    customers = Customer.query.options(joinedload(Customer.accounts)).order_by(Customer.created_at.desc()).all()
    return jsonify({'customers': [_serialize_customer(c) for c in customers]})

@api_bp.route('/customers/<int:customer_id>', methods=['GET'])
@staff_or_admin_required
def api_get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    return jsonify({'customer': _serialize_customer(customer)})

@api_bp.route('/customers/create', methods=['POST'])
@staff_or_admin_required
def api_create_customer():
    data = request.get_json(silent=True) or request.form
    full_name = (data.get('full_name') or '').strip()
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400

    phone_number = (data.get('phone_number') or '').strip()
    citizenship_id = (data.get('citizenship_id') or '').strip()

    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400
    if not citizenship_id:
        return jsonify({'error': 'Citizenship ID is required'}), 400

    if Customer.query.filter_by(phone_number=phone_number).first():
        return jsonify({'error': 'Phone number already registered'}), 400
    if Customer.query.filter_by(citizenship_id=citizenship_id).first():
        return jsonify({'error': 'Citizenship ID already registered'}), 400

    email = (data.get('email') or '').strip()
    if email and '@' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    if email and Customer.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    try:
        customer_id_str = generate_customer_id()
        custom_username = (data.get('username') or '').strip()
        custom_password = data.get('password', '').strip()
        if custom_username:
            if len(custom_username) < 3:
                return jsonify({'error': 'Username must be at least 3 characters'}), 400
            if Customer.query.filter_by(username=custom_username).first():
                return jsonify({'error': 'Username already taken'}), 400
            username = custom_username
        else:
            username = generate_username()
        if custom_password:
            if len(custom_password) < 4:
                return jsonify({'error': 'Password must be at least 4 characters'}), 400
            temp_password = custom_password
        else:
            temp_password = generate_temporary_password()
        account_num = generate_account_number()

        dob_str = data.get('dob')
        dob = None
        if dob_str:
            try:
                dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for DOB. Use YYYY-MM-DD.'}), 400

        customer = Customer(
            customer_id=customer_id_str,
            full_name=full_name,
            father_name=(data.get('father_name') or '').strip() or None,
            grandfather_name=(data.get('grandfather_name') or '').strip() or None,
            dob=dob,
            gender=(data.get('gender') or '').strip() or None,
            citizenship_id=citizenship_id,
            citizenship_issue_district=(data.get('citizenship_issue_district') or '').strip() or None,
            marital_status=(data.get('marital_status') or '').strip() or None,
            occupation=(data.get('occupation') or '').strip() or None,
            phone_number=phone_number,
            alternate_mobile=(data.get('alternate_mobile') or '').strip() or None,
            email=(data.get('email') or '').strip() or None,
            address=(data.get('address') or '').strip() or None,
            permanent_address=(data.get('permanent_address') or '').strip() or None,
            temporary_address=(data.get('temporary_address') or '').strip() or None,
            nominee_name=(data.get('nominee_name') or '').strip() or None,
            nominee_contact=(data.get('nominee_contact') or '').strip() or None,
            nominee_relationship=(data.get('nominee_relationship') or '').strip() or None,
            username=username,
            must_change_password=True
        )
        customer.set_password(temp_password)
        db.session.add(customer)
        db.session.flush()

        account_type = data.get('account_type') or 'savings'
        valid_types = ['savings', 'current', 'fixed_deposit']
        if account_type not in valid_types:
            return jsonify({'error': f'Invalid account type. Must be one of: {", ".join(valid_types)}'}), 400
        initial_balance = Decimal('0.00')
        try:
            initial_balance = Decimal(str(data.get('initial_balance', '0')))
            if initial_balance < 0:
                initial_balance = Decimal('0.00')
        except (ValueError, TypeError, ArithmeticError):
            initial_balance = Decimal('0.00')

        new_account = Account(
            customer_id=customer.id,
            account_number=account_num,
            account_type=account_type,
            balance=initial_balance
        )
        db.session.add(new_account)
        db.session.flush()

        if initial_balance > 0:
            txn = Transaction(
                account_id=new_account.id,
                type='deposit',
                amount=initial_balance,
                balance_after=initial_balance,
                description='Initial Deposit'
            )
            db.session.add(txn)

        log_audit('customer_created', 'customer', customer.id, f'Customer {full_name} created with account {account_num}')
        notify_customer(customer.id, 'Welcome to Village Bank',
            f'Dear {full_name}, your account has been created. Username: {username}. Please log in and change your password.')

        db.session.commit()

        return jsonify({
            'message': 'Customer created successfully',
            'customer': _serialize_customer(customer),
            'credentials': {
                'customer_id': customer_id_str,
                'account_number': account_num,
                'username': username,
                'temporary_password': temp_password
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create customer: {str(e)}'}), 500

@api_bp.route('/customers/edit/<int:customer_id>', methods=['POST'])
@staff_or_admin_required
def api_edit_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json(silent=True) or request.form
    full_name = (data.get('full_name') or '').strip()
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400

    phone_number = (data.get('phone_number') or '').strip()
    citizenship_id = (data.get('citizenship_id') or '').strip()

    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400

    phone_exists = Customer.query.filter(Customer.phone_number == phone_number, Customer.id != customer_id).first()
    if phone_exists:
        return jsonify({'error': 'Phone number already registered'}), 400

    if citizenship_id:
        id_exists = Customer.query.filter(Customer.citizenship_id == citizenship_id, Customer.id != customer_id).first()
        if id_exists:
            return jsonify({'error': 'Citizenship ID already registered'}), 400

    dob_str = data.get('dob')
    dob = customer.dob
    if dob_str:
        try:
            dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format for DOB. Use YYYY-MM-DD.'}), 400

    customer.full_name = full_name
    customer.father_name = (data.get('father_name') or '').strip() or customer.father_name
    customer.grandfather_name = (data.get('grandfather_name') or '').strip() or customer.grandfather_name
    customer.dob = dob
    customer.gender = (data.get('gender') or '').strip() or customer.gender
    customer.citizenship_id = citizenship_id or customer.citizenship_id
    customer.citizenship_issue_district = (data.get('citizenship_issue_district') or '').strip() or customer.citizenship_issue_district
    customer.marital_status = (data.get('marital_status') or '').strip() or customer.marital_status
    customer.occupation = (data.get('occupation') or '').strip() or customer.occupation
    customer.phone_number = phone_number
    customer.alternate_mobile = (data.get('alternate_mobile') or '').strip() or customer.alternate_mobile
    customer.email = (data.get('email') or '').strip() or customer.email
    customer.address = (data.get('address') or '').strip() or customer.address
    customer.permanent_address = (data.get('permanent_address') or '').strip() or customer.permanent_address
    customer.temporary_address = (data.get('temporary_address') or '').strip() or customer.temporary_address
    customer.nominee_name = (data.get('nominee_name') or '').strip() or customer.nominee_name
    customer.nominee_contact = (data.get('nominee_contact') or '').strip() or customer.nominee_contact
    customer.nominee_relationship = (data.get('nominee_relationship') or '').strip() or customer.nominee_relationship

    log_audit('customer_updated', 'customer', customer_id, f'Customer {customer.full_name} profile updated')
    db.session.commit()
    return jsonify({'message': 'Customer updated successfully', 'customer': _serialize_customer(customer)})

@api_bp.route('/customers/delete/<int:customer_id>', methods=['POST'])
@staff_or_admin_required
def api_delete_customer(customer_id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Only admins can delete customers'}), 403
    customer = Customer.query.get_or_404(customer_id)
    customer.status = 'inactive'
    for account in customer.accounts:
        account.status = 'closed'
    log_audit('customer_deactivated', 'customer', customer_id, f'Customer {customer.full_name} deactivated (set inactive)')
    db.session.commit()
    return jsonify({'message': 'Customer account closed successfully'})

# ===== ACCOUNT ENDPOINTS =====

@api_bp.route('/accounts/', methods=['GET'])
@staff_or_admin_required
def api_list_accounts():
    accounts = Account.query.options(joinedload(Account.customer)).order_by(Account.created_at.desc()).all()
    return jsonify({'accounts': [_serialize_account(a) for a in accounts]})

@api_bp.route('/accounts/<account_number>', methods=['GET'])
@staff_or_admin_required
def api_get_account(account_number):
    account = Account.query.filter_by(account_number=account_number).first_or_404()
    return jsonify({'account': _serialize_account(account)})

@api_bp.route('/accounts/create', methods=['POST'])
@staff_or_admin_required
def api_create_account():
    data = request.get_json(silent=True) or request.form
    customer_id = data.get('customer_id')
    account_type = data.get('account_type', 'savings')
    valid_types = ['savings', 'current', 'fixed_deposit']
    if account_type not in valid_types:
        return jsonify({'error': f'Invalid account type. Must be one of: {", ".join(valid_types)}'}), 400
    if not customer_id:
        return jsonify({'error': 'Customer ID is required'}), 400
    try:
        customer_id = int(customer_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid customer ID format'}), 400
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    acc_num = generate_account_number()
    account = Account(
        customer_id=customer.id,
        account_number=acc_num,
        account_type=account_type
    )
    db.session.add(account)
    log_audit('account_created', 'account', account.id, f'{account_type} account {acc_num} created for {customer.full_name}')
    notify_customer(customer.id, 'New Account Created',
        f'A new {account_type} account ({acc_num}) has been created for you.')
    db.session.commit()
    return jsonify({'message': 'Account created', 'account': _serialize_account(account)})

@api_bp.route('/accounts/freeze/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_freeze_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status == 'closed':
        return jsonify({'error': 'Cannot freeze a closed account'}), 400
    account.status = 'frozen'
    log_audit('account_frozen', 'account', account_id, f'Account {account.account_number} frozen')
    db.session.commit()
    return jsonify({'message': 'Account frozen', 'account': _serialize_account(account)})

@api_bp.route('/accounts/unfreeze/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_unfreeze_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status != 'frozen':
        return jsonify({'error': 'Account is not frozen'}), 400
    account.status = 'active'
    log_audit('account_unfrozen', 'account', account_id, f'Account {account.account_number} unfrozen')
    db.session.commit()
    return jsonify({'message': 'Account unfrozen', 'account': _serialize_account(account)})

@api_bp.route('/accounts/close/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_close_account(account_id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Only admins can close accounts'}), 403
    account = Account.query.get_or_404(account_id)
    if account.balance > 0:
        return jsonify({'error': 'Account has remaining balance. Withdraw funds first.'}), 400
    account.status = 'closed'
    log_audit('account_closed', 'account', account_id, f'Account {account.account_number} closed')
    db.session.commit()
    return jsonify({'message': 'Account closed', 'account': _serialize_account(account)})

# ===== TRANSACTION ENDPOINTS =====

@api_bp.route('/transactions/', methods=['GET'])
@staff_or_admin_required
def api_list_transactions():
    transactions = Transaction.query.options(joinedload(Transaction.account).joinedload(Account.customer)).order_by(Transaction.created_at.desc()).all()
    return jsonify({'transactions': [_serialize_transaction(t) for t in transactions]})

@api_bp.route('/transactions/deposit', methods=['POST'])
@staff_or_admin_required
def api_deposit():
    data = request.get_json(silent=True) or request.form
    account_number = data.get('account_number')
    amount_str = data.get('amount')
    description = data.get('description', '')
    if not account_number:
        return jsonify({'error': 'Account number is required'}), 400
    try:
        amount = Decimal(str(amount_str))
    except Exception:
        return jsonify({'error': 'Invalid amount'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400
    account = Account.query.filter_by(account_number=account_number, status='active').with_for_update().first()
    if not account:
        return jsonify({'error': 'Account not found or not active'}), 404
    new_balance = account.balance + amount
    account.balance = new_balance
    account.last_transaction_date = _utcnow()
    account.total_deposits += amount
    txn = Transaction(
        transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        account_id=account.id,
        type='deposit',
        amount=amount,
        balance_after=new_balance,
        description=description or 'Deposit',
        status='successful',
        reference_number=f"DEP-{uuid.uuid4().hex[:8].upper()}",
        created_by=g.user.id if g.user else None
    )
    db.session.add(txn)
    log_audit('deposit', 'transaction', txn.id, f'Deposit of {amount} to account {account_number}. Ref: {txn.reference_number}')
    notify_customer(account.customer_id, 'Deposit Successful',
        f'NPR {float(amount):,.2f} has been deposited to account {account_number}. Balance: NPR {float(new_balance):,.2f}')
    db.session.commit()
    return jsonify({'message': 'Deposit successful', 'transaction': _serialize_transaction(txn)})

@api_bp.route('/transactions/withdraw', methods=['POST'])
@staff_or_admin_required
def api_withdraw():
    data = request.get_json(silent=True) or request.form
    account_number = data.get('account_number')
    amount_str = data.get('amount')
    description = data.get('description', '')
    if not account_number:
        return jsonify({'error': 'Account number is required'}), 400
    try:
        amount = Decimal(str(amount_str))
    except Exception:
        return jsonify({'error': 'Invalid amount'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400
    account = Account.query.filter_by(account_number=account_number, status='active').with_for_update().first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    if account.balance < amount:
        return jsonify({'error': 'Insufficient funds'}), 400
    new_balance = account.balance - amount
    account.balance = new_balance
    account.last_transaction_date = _utcnow()
    account.total_withdrawals += amount
    txn = Transaction(
        transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        account_id=account.id,
        type='withdrawal',
        amount=amount,
        balance_after=new_balance,
        description=description or 'Withdrawal',
        status='successful',
        reference_number=f"WTH-{uuid.uuid4().hex[:8].upper()}",
        created_by=g.user.id if g.user else None
    )
    db.session.add(txn)
    log_audit('withdrawal', 'transaction', txn.id, f'Withdrawal of {amount} from account {account_number}. Ref: {txn.reference_number}')
    notify_customer(account.customer_id, 'Withdrawal Successful',
        f'NPR {float(amount):,.2f} has been withdrawn from account {account_number}. Balance: NPR {float(new_balance):,.2f}')
    db.session.commit()
    return jsonify({'message': 'Withdrawal successful', 'transaction': _serialize_transaction(txn)})

@api_bp.route('/transactions/filter', methods=['GET'])
@staff_or_admin_required
def api_filter_transactions():
    txn_type = request.args.get('type', '')
    status = request.args.get('status', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    query = Transaction.query
    if txn_type:
        query = query.filter(Transaction.type == txn_type)
    if status:
        query = query.filter(Transaction.status == status)
    if date_from:
        try:
            df = datetime.datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(Transaction.created_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.datetime.strptime(date_to, '%Y-%m-%d') + datetime.timedelta(days=1)
            query = query.filter(Transaction.created_at < dt)
        except ValueError:
            pass
    transactions = query.order_by(Transaction.created_at.desc()).all()
    return jsonify({'transactions': [_serialize_transaction(t) for t in transactions], 'total': len(transactions)})

# ===== LOAN ENDPOINTS =====

@api_bp.route('/loans/', methods=['GET'])
@staff_or_admin_required
def api_list_loans():
    loans = Loan.query.options(joinedload(Loan.customer), subqueryload(Loan.repayments)).order_by(Loan.applied_date.desc()).all()
    return jsonify({'loans': [_serialize_loan(l) for l in loans]})

@api_bp.route('/loans/<int:loan_id>', methods=['GET'])
@staff_or_admin_required
def api_get_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    return jsonify({'loan': _serialize_loan(loan)})

@api_bp.route('/loans/apply', methods=['POST'])
@staff_or_admin_required
def api_apply_loan():
    data = request.get_json(silent=True) or request.form
    customer_id_str = data.get('customer_id')
    amount_str = data.get('amount')
    interest_rate_str = data.get('interest_rate')
    duration_str = data.get('duration_months')
    if not all([customer_id_str, amount_str, interest_rate_str, duration_str]):
        return jsonify({'error': 'All loan fields are required'}), 400
    try:
        customer_id = int(customer_id_str)
        amount = Decimal(amount_str)
        interest_rate = Decimal(interest_rate_str)
        duration_months = int(duration_str)
        if amount <= 0 or interest_rate < 0 or duration_months <= 0:
            return jsonify({'error': 'Invalid loan parameters'}), 400
    except Exception:
        return jsonify({'error': 'Invalid numeric values'}), 400
    customer = Customer.query.filter_by(id=customer_id, status='active').first()
    if not customer:
        return jsonify({'error': 'Customer not found or inactive'}), 404
    emi, total_payable = calculate_emi_and_payable(amount, interest_rate, duration_months)
    loan = Loan(
        customer_id=customer.id,
        amount=amount,
        interest_rate=interest_rate,
        duration_months=duration_months,
        emi=emi,
        total_payable=total_payable,
        status='pending'
    )
    db.session.add(loan)
    db.session.commit()
    return jsonify({'message': 'Loan application submitted', 'loan': _serialize_loan(loan)})

@api_bp.route('/loans/approve/<int:loan_id>', methods=['POST'])
@staff_or_admin_required
def api_approve_loan(loan_id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Only admins can approve loans'}), 403
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'pending':
        return jsonify({'error': 'Loan already processed'}), 400
    active_account = Account.query.filter_by(customer_id=loan.customer_id, status='active').with_for_update().first()
    if not active_account:
        return jsonify({'error': 'Customer has no active account'}), 400
    try:
        loan.status = 'approved'
        loan.approved_date = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        loan.approved_by = session.get('user_id')
        active_account.balance += loan.amount
        txn = Transaction(
            account_id=active_account.id,
            type='deposit',
            amount=loan.amount,
            balance_after=active_account.balance,
            description=f"Loan Disbursement ({loan.loan_number})",
            status='successful',
            reference_number=f"LND-{uuid.uuid4().hex[:8].upper()}",
            created_by=session.get('user_id')
        )
        db.session.add(txn)
        log_audit('loan_approved', 'loan', loan.id, f'Loan {loan.loan_number} for NPR {float(loan.amount):,.2f} approved and disbursed')
        notify_customer(loan.customer_id, 'Loan Approved',
            f'Your loan {loan.loan_number} of NPR {float(loan.amount):,.2f} has been approved and disbursed to your account.')
        db.session.commit()
        return jsonify({'message': 'Loan approved and disbursed', 'loan': _serialize_loan(loan)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/loans/reject/<int:loan_id>', methods=['POST'])
@staff_or_admin_required
def api_reject_loan(loan_id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Only admins can reject loans'}), 403
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'pending':
        return jsonify({'error': 'Loan already processed'}), 400
    loan.status = 'rejected'
    log_audit('loan_rejected', 'loan', loan.id, f'Loan {loan.loan_number} for {loan.customer.full_name} rejected')
    notify_customer(loan.customer_id, 'Loan Application Update',
        f'Your loan application {loan.loan_number} has been reviewed and was not approved at this time.')
    db.session.commit()
    return jsonify({'message': 'Loan rejected', 'loan': _serialize_loan(loan)})

@api_bp.route('/loans/repay/<int:loan_id>', methods=['POST'])
@staff_or_admin_required
def api_repay_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'approved':
        return jsonify({'error': 'Loan is not active'}), 400
    data = request.get_json(silent=True) or request.form
    amount_str = data.get('amount')
    payment_method = data.get('payment_method', 'cash')
    if not amount_str:
        return jsonify({'error': 'Amount is required'}), 400
    try:
        amount = Decimal(amount_str)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except Exception:
        return jsonify({'error': 'Invalid amount'}), 400
    remaining = loan.total_payable - loan.total_paid
    if amount > remaining:
        return jsonify({'error': 'Amount exceeds remaining balance'}), 400
    active_account = Account.query.filter_by(customer_id=loan.customer_id, status='active').with_for_update().first()
    if payment_method == 'account':
        if not active_account:
            return jsonify({'error': 'No active account for deduction'}), 400
        if active_account.balance < amount:
            return jsonify({'error': 'Insufficient account balance'}), 400
    try:
        loan.total_paid += amount
        loan.last_payment_date = _utcnow()
        is_full = loan.total_payable - loan.total_paid < Decimal('0.05')
        if is_full:
            loan.status = 'fully_paid'
            loan.total_paid = loan.total_payable
        if payment_method == 'account' and active_account:
            active_account.balance -= amount
            txn = Transaction(
                account_id=active_account.id,
                type='withdrawal',
                amount=amount,
                balance_after=active_account.balance,
                description=f"Loan Repayment ({loan.loan_number})",
                status='successful',
                reference_number=f"LNR-{uuid.uuid4().hex[:8].upper()}",
                created_by=session.get('user_id')
            )
            db.session.add(txn)
        emi_cnt = len(loan.repayments) + 1
        repay = Repayment(
            loan_id=loan.id,
            amount=amount,
            emi_number=emi_cnt,
            status='paid',
            received_by=session.get('user_id')
        )
        db.session.add(repay)
        log_audit('emi_collection', 'repayment', repay.id, f'EMI #{emi_cnt} of NPR {float(amount):,.2f} collected for loan {loan.loan_number}')
        notify_customer(loan.customer_id, 'EMI Payment Received',
            f'EMI #{emi_cnt} of NPR {float(amount):,.2f} received for loan {loan.loan_number}.')
        db.session.commit()
        return jsonify({'message': 'Repayment recorded', 'loan': _serialize_loan(loan)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== DASHBOARD ENDPOINTS =====

@api_bp.route('/dashboard', methods=['GET'])
@staff_or_admin_required
def api_dashboard():
    total_customers = Customer.query.filter_by(status='active').count()
    total_accounts = Account.query.filter(Account.status.in_(['active', 'frozen'])).count()
    frozen_accounts = Account.query.filter_by(status='frozen').count()
    total_deposits_balance = db.session.query(db.func.sum(Account.balance)).filter(Account.status == 'active').scalar() or Decimal('0.00')
    total_deposits_volume = db.session.query(db.func.sum(Transaction.amount)).filter(Transaction.type == 'deposit').scalar() or Decimal('0.00')
    total_withdrawals_volume = db.session.query(db.func.sum(Transaction.amount)).filter(Transaction.type == 'withdrawal').scalar() or Decimal('0.00')
    active_loans_count = Loan.query.filter(Loan.status == 'approved').count()
    total_loans_count = Loan.query.count()
    pending_loans_count = Loan.query.filter_by(status='pending').count()
    total_loan_disbursed = db.session.query(db.func.sum(Loan.amount)).filter(Loan.status.in_(['approved', 'fully_paid'])).scalar() or Decimal('0.00')
    total_loan_receivable = db.session.query(db.func.sum(Loan.total_payable - Loan.total_paid)).filter(Loan.status == 'approved').scalar() or Decimal('0.00')
    total_loan_collected = db.session.query(db.func.sum(Loan.total_paid)).filter(Loan.status.in_(['approved', 'fully_paid'])).scalar() or Decimal('0.00')
    total_turnover = total_deposits_volume + total_withdrawals_volume
    total_transactions = Transaction.query.count()
    today_txns = Transaction.query.filter(db.func.date(Transaction.created_at) == _utcnow().date()).count()
    recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()
    recent_loans = Loan.query.order_by(Loan.applied_date.desc()).limit(5).all()
    pending_loans = Loan.query.filter_by(status='pending').order_by(Loan.applied_date.desc()).limit(5).all()
    today = _utcnow().date()
    dates = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    date_labels = [d.strftime('%b %d') for d in dates]
    daily_deposits = []
    daily_withdrawals = []
    for d in dates:
        start = datetime.datetime.combine(d, datetime.time.min)
        end = datetime.datetime.combine(d, datetime.time.max)
        dep = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'deposit', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        wit = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'withdrawal', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        daily_deposits.append(float(dep))
        daily_withdrawals.append(float(wit))
    return jsonify({
        'total_customers': total_customers,
        'total_accounts': total_accounts,
        'frozen_accounts': frozen_accounts,
        'total_deposits_balance': float(total_deposits_balance),
        'total_deposits_volume': float(total_deposits_volume),
        'total_withdrawals_volume': float(total_withdrawals_volume),
        'active_loans_count': active_loans_count,
        'total_loans_count': total_loans_count,
        'pending_loans_count': pending_loans_count,
        'total_loan_disbursed': float(total_loan_disbursed),
        'total_loan_receivable': float(total_loan_receivable),
        'total_loan_collected': float(total_loan_collected),
        'total_turnover': float(total_turnover),
        'total_transactions': total_transactions,
        'today_transactions': today_txns,
        'recent_transactions': [_serialize_transaction(t) for t in recent_transactions],
        'recent_loans': [_serialize_loan(l) for l in recent_loans],
        'pending_loans': [_serialize_loan(l) for l in pending_loans],
        'date_labels': date_labels,
        'daily_deposits': daily_deposits,
        'daily_withdrawals': daily_withdrawals
    })

@api_bp.route('/reports', methods=['GET'])
@staff_or_admin_required
def api_reports():
    report_type = request.args.get('type', 'daily')
    today = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).date()
    customers = Customer.query.filter_by(status='active').order_by(Customer.full_name).all()
    daily_summary = {'deposits': 0.0, 'withdrawals': 0.0, 'repayments': 0.0}
    daily_transactions = []
    daily_repayments = []
    monthly_summary = {'deposits': 0.0, 'withdrawals': 0.0, 'repayments': 0.0}
    monthly_transactions_count = 0
    selected_customer = None
    customer_txns = []
    customer_loans = []
    if report_type == 'daily':
        start = datetime.datetime.combine(today, datetime.time.min)
        end = datetime.datetime.combine(today, datetime.time.max)
        daily_transactions = Transaction.query.filter(Transaction.created_at >= start, Transaction.created_at <= end).all()
        daily_repayments = Repayment.query.filter(Repayment.repayment_date >= start, Repayment.repayment_date <= end).all()
        daily_summary['deposits'] = float(sum((t.amount for t in daily_transactions if t.type == 'deposit'), Decimal('0.00')))
        daily_summary['withdrawals'] = float(sum((t.amount for t in daily_transactions if t.type == 'withdrawal'), Decimal('0.00')))
        daily_summary['repayments'] = float(sum((r.amount for r in daily_repayments), Decimal('0.00')))
    elif report_type == 'monthly':
        start_of_month = datetime.datetime(today.year, today.month, 1)
        if today.month == 12:
            end_of_month = datetime.datetime(today.year + 1, 1, 1) - datetime.timedelta(seconds=1)
        else:
            end_of_month = datetime.datetime(today.year, today.month + 1, 1) - datetime.timedelta(seconds=1)
        monthly_txns = Transaction.query.filter(Transaction.created_at >= start_of_month, Transaction.created_at <= end_of_month).all()
        monthly_repays = Repayment.query.filter(Repayment.repayment_date >= start_of_month, Repayment.repayment_date <= end_of_month).all()
        monthly_summary['deposits'] = float(sum((t.amount for t in monthly_txns if t.type == 'deposit'), Decimal('0.00')))
        monthly_summary['withdrawals'] = float(sum((t.amount for t in monthly_txns if t.type == 'withdrawal'), Decimal('0.00')))
        monthly_summary['repayments'] = float(sum((r.amount for r in monthly_repays), Decimal('0.00')))
        monthly_transactions_count = len(monthly_txns) + len(monthly_repays)
    elif report_type == 'customer':
        customer_id_str = request.args.get('customer_id', '')
        if customer_id_str:
            try:
                cid = int(customer_id_str)
                selected_customer = Customer.query.get(cid)
                if selected_customer:
                    acc_ids = [a.id for a in selected_customer.accounts]
                    customer_txns = Transaction.query.filter(Transaction.account_id.in_(acc_ids)).order_by(Transaction.created_at.desc()).all()
                    customer_loans = Loan.query.filter_by(customer_id=cid).order_by(Loan.applied_date.desc()).all()
            except ValueError:
                pass
    return jsonify({
        'report_type': report_type,
        'today': today.isoformat(),
        'customers': [_simple_customer(c) for c in customers],
        'selected_customer': _serialize_customer(selected_customer) if selected_customer else None,
        'customer_txns': [_serialize_transaction(t) for t in customer_txns],
        'customer_loans': [_serialize_loan(l) for l in customer_loans],
        'daily_transactions': [_serialize_transaction(t) for t in daily_transactions],
        'daily_repayments': [{'id': r.id, 'amount': float(r.amount), 'repayment_date': r.repayment_date.isoformat() if r.repayment_date else None, 'loan': {'loan_number': r.loan.loan_number, 'customer': {'full_name': r.loan.customer.full_name} if r.loan and r.loan.customer else None}} for r in daily_repayments],
        'daily_summary': daily_summary,
        'monthly_summary': monthly_summary,
        'monthly_transactions_count': monthly_transactions_count
    })

@api_bp.route('/reports/advanced', methods=['GET'])
@staff_or_admin_required
def api_advanced_reports():
    report_type = request.args.get('type', 'daily')
    category = request.args.get('category', 'deposit')
    year_str = request.args.get('year', '')
    quarter_str = request.args.get('quarter', '')
    year = int(year_str) if year_str else None
    quarter = int(quarter_str) if quarter_str else None
    generators = {
        'deposit': generate_deposit_report,
        'withdrawal': generate_withdrawal_report,
        'loan': generate_loan_report,
        'emi_collection': generate_emi_collection_report,
        'interest': generate_interest_report,
        'customer': generate_customer_report,
        'account': generate_account_report
    }
    gen = generators.get(category)
    if not gen:
        return jsonify({'error': 'Invalid report category'}), 400
    try:
        result = gen(report_type, year, quarter)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/reports/customer-summary/<int:customer_id>', methods=['GET'])
@staff_or_admin_required
def api_customer_summary_report(customer_id):
    result = generate_customer_summary(customer_id)
    if not result:
        return jsonify({'error': 'Customer not found'}), 404
    return jsonify(result)

@api_bp.route('/reports/export', methods=['GET'])
@staff_or_admin_required
def api_export_report():
    report_type = request.args.get('type', 'daily')
    category = request.args.get('category', 'deposit')
    fmt = request.args.get('format', 'csv')
    year_str = request.args.get('year', '')
    quarter_str = request.args.get('quarter', '')
    year = int(year_str) if year_str else None
    quarter = int(quarter_str) if quarter_str else None
    generators = {
        'deposit': generate_deposit_report,
        'withdrawal': generate_withdrawal_report,
        'loan': generate_loan_report,
        'emi_collection': generate_emi_collection_report,
        'interest': generate_interest_report,
        'customer': generate_customer_report,
        'account': generate_account_report
    }
    gen = generators.get(category)
    if not gen:
        return jsonify({'error': 'Invalid report category'}), 400
    try:
        data = gen(report_type, year, quarter)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    if fmt == 'csv':
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        if category in ('deposit', 'withdrawal'):
            writer.writerow(['UUID', 'Type', 'Amount', 'Balance After', 'Status', 'Reference', 'Account', 'Customer', 'Date'])
            for t in data.get('transactions', []):
                writer.writerow([t.get('uuid'), t.get('type'), t.get('amount'), t.get('balance_after'), t.get('status'), t.get('reference_number'), t.get('account_number'), t.get('customer_name'), t.get('created_at')])
        elif category == 'loan':
            writer.writerow(['Loan Number', 'Amount', 'Interest Rate', 'EMI', 'Total Payable', 'Total Paid', 'Status', 'Customer', 'Date'])
            for l in data.get('loans', []):
                writer.writerow([l.get('loan_number'), l.get('amount'), l.get('interest_rate'), l.get('emi'), l.get('total_payable'), l.get('total_paid'), l.get('status'), l.get('customer_name'), l.get('applied_date')])
        elif category == 'emi_collection':
            writer.writerow(['Amount', 'EMI #', 'Status', 'Loan', 'Customer', 'Date'])
            for r in data.get('repayments', []):
                writer.writerow([r.get('amount'), r.get('emi_number'), r.get('status'), r.get('loan_number'), r.get('customer_name'), r.get('repayment_date')])
        elif category in ('customer', 'account'):
            writer.writerow(['ID', 'Name', 'Details'])
            for item in data.get(category + 's', data.get('customers', data.get('accounts', []))):
                writer.writerow([item.get('id'), item.get('full_name') or item.get('account_number'), item.get('phone_number') or item.get('balance')])
        else:
            writer.writerow(['Field', 'Value'])
            for k, v in data.items():
                if not isinstance(v, list):
                    writer.writerow([k, v])
        csv_output = output.getvalue()
        return jsonify({'csv': csv_output, 'filename': f'{category}_{report_type}_report.csv'})
    return jsonify(data)

# ===== STAFF MANAGEMENT =====

@api_bp.route('/staff/', methods=['GET'])
@staff_or_admin_required
def api_list_staff():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    staff = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'staff': [{'id': s.id, 'username': s.username, 'role': s.role, 'created_at': s.created_at.isoformat() if s.created_at else None} for s in staff]})

@api_bp.route('/staff/create', methods=['POST'])
@staff_or_admin_required
def api_create_staff():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    data = request.get_json(silent=True) or request.form
    username = (data.get('username') or '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    role = data.get('role', 'staff')
    if role not in ('admin', 'staff'):
        return jsonify({'error': 'Role must be admin or staff'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    user = User(username=username, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Staff created', 'staff': {'id': user.id, 'username': user.username, 'role': user.role, 'created_at': user.created_at.isoformat() if user.created_at else None}})

@api_bp.route('/staff/delete/<int:user_id>', methods=['POST'])
@staff_or_admin_required
def api_delete_staff(user_id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    user = User.query.get_or_404(user_id)
    if user.role == 'admin' and User.query.filter_by(role='admin').count() <= 1:
        return jsonify({'error': 'Cannot delete the last admin'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Staff deleted'})

# ===== CUSTOMER PORTAL ENDPOINTS =====

@api_bp.route('/customer/dashboard', methods=['GET'])
@customer_login_required_api
def api_customer_dashboard():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    accounts = Account.query.filter_by(customer_id=customer.id, status='active').all()
    total_balance = sum((acc.balance or Decimal('0')) for acc in accounts)
    total_deposits = Decimal('0')
    total_withdrawals = Decimal('0')
    account_ids = [acc.id for acc in accounts]
    if account_ids:
        deposits = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)).filter(Transaction.account_id.in_(account_ids), Transaction.type == 'deposit').scalar()
        withdrawals = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)).filter(Transaction.account_id.in_(account_ids), Transaction.type == 'withdrawal').scalar()
        total_deposits = Decimal(str(deposits))
        total_withdrawals = Decimal(str(withdrawals))
    recent = Transaction.query.filter(Transaction.account_id.in_(account_ids)).order_by(Transaction.created_at.desc()).limit(5).all()
    loans = Loan.query.filter_by(customer_id=customer.id).all()
    active_loans = [l for l in loans if l.status == 'approved']
    total_loan_amount = sum((l.amount or Decimal('0')) for l in active_loans)
    total_loan_paid = sum((l.total_paid or Decimal('0')) for l in active_loans)
    total_loan_remaining = total_loan_amount - total_loan_paid
    next_emi_date = None
    next_emi_amount = None
    upcoming_emi_count = 0
    if active_loans:
        upcoming_emi_count = sum(1 for l in active_loans if l.total_payable - l.total_paid > 0)
        loan_with_nearest = None
        nearest_days = None
        for l in active_loans:
            if l.total_payable - l.total_paid <= 0:
                continue
            repay_count = len(l.repayments) if l.repayments else 0
            base = l.last_payment_date or l.approved_date
            if base:
                due = base.replace(day=1) + datetime.timedelta(days=32)
                due = due.replace(day=1) + datetime.timedelta(days=repay_count * 31 - 1)
                days_diff = (due - _utcnow()).days
                if nearest_days is None or abs(days_diff) < abs(nearest_days):
                    nearest_days = days_diff
                    loan_with_nearest = l
                    next_emi_date = due.date().isoformat()
        if loan_with_nearest:
            next_emi_amount = float(loan_with_nearest.emi)
    today = _utcnow().date()
    dates = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    date_labels = [d.strftime('%b %d') for d in dates]
    daily_deposits = []
    daily_withdrawals = []
    for d in dates:
        start = datetime.datetime.combine(d, datetime.time.min)
        end = datetime.datetime.combine(d, datetime.time.max)
        dep = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)).filter(
            Transaction.account_id.in_(account_ids),
            Transaction.type == 'deposit', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        wit = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)).filter(
            Transaction.account_id.in_(account_ids),
            Transaction.type == 'withdrawal', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        daily_deposits.append(float(dep))
        daily_withdrawals.append(float(wit))
    return jsonify({
        'customer': _serialize_customer(customer),
        'total_balance': float(total_balance),
        'total_deposits': float(total_deposits),
        'total_withdrawals': float(total_withdrawals),
        'active_accounts': len(accounts),
        'active_loans': len(active_loans),
        'total_loan_amount': float(total_loan_amount),
        'total_loan_paid': float(total_loan_paid),
        'total_loan_remaining': float(max(0, total_loan_remaining)),
        'next_emi_date': next_emi_date,
        'next_emi_amount': next_emi_amount,
        'upcoming_emi_count': upcoming_emi_count,
        'recent_transactions': [_serialize_transaction(t) for t in recent],
        'date_labels': date_labels,
        'daily_deposits': daily_deposits,
        'daily_withdrawals': daily_withdrawals
    })

@api_bp.route('/customer/accounts', methods=['GET'])
@customer_login_required_api
def api_customer_accounts():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    accounts = Account.query.filter_by(customer_id=customer.id).order_by(Account.created_at.desc()).all()
    return jsonify({'accounts': [_serialize_account(a) for a in accounts]})

@api_bp.route('/customer/accounts/apply', methods=['POST'])
@customer_login_required_api
def api_customer_account_apply():
    try:
        customer = db.session.get(Customer, session['customer_id'])
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        data = request.get_json(silent=True) or request.form
        account_type = (data.get('account_type') or '').strip().lower()
        valid_types = ['savings', 'current', 'fixed_deposit']
        if account_type not in valid_types:
            return jsonify({'error': f'Invalid type. Choose: {", ".join(valid_types)}'}), 400
        acc_num = generate_account_number()
        account = Account(
            customer_id=customer.id,
            account_number=acc_num,
            account_type=account_type,
            status='pending'
        )
        db.session.add(account)
        log_audit('account_applied', 'account', account.id,
            f'{account_type} account {acc_num} requested by {customer.full_name}')
        notify_customer(customer.id, 'Account Request Submitted',
            f'Your request for a new {account_type} account ({acc_num}) has been submitted for approval.')
        staff_users = User.query.filter(User.role.in_(['admin', 'staff'])).all()
        for u in staff_users:
            notify_staff(u.id, 'New Account Request',
                f'{customer.full_name} has requested a new {account_type} account. Review in Accounts.')
        db.session.commit()
        return jsonify({'message': 'Account request submitted for approval', 'account': _serialize_account(account)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/accounts/activate/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_activate_account(account_id):
    try:
        account = db.session.get(Account, account_id)
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        if account.status != 'pending':
            return jsonify({'error': 'Account is not pending'}), 400
        account.status = 'active'
        log_audit('account_activated', 'account', account.id,
            f'Account {account.account_number} activated by {session.get("user_id")}')
        notify_customer(account.customer_id, 'Account Activated',
            f'Your {account.account_type} account ({account.account_number}) has been approved and is now active.')
        db.session.commit()
        return jsonify({'message': 'Account activated', 'account': _serialize_account(account)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/loans', methods=['GET'])
@customer_login_required_api
def api_customer_loans():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    loans = Loan.query.filter_by(customer_id=customer.id).order_by(Loan.applied_date.desc()).all()
    return jsonify({'loans': [_serialize_loan(l) for l in loans]})

@api_bp.route('/customer/loans/apply', methods=['POST'])
@customer_login_required_api
def api_customer_loan_apply():
    try:
        customer = db.session.get(Customer, session['customer_id'])
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        data = request.get_json(silent=True) or request.form
        amount_str = data.get('amount')
        interest_rate_str = data.get('interest_rate')
        duration_str = data.get('duration_months')
        if not all([amount_str, interest_rate_str, duration_str]):
            return jsonify({'error': 'All loan fields are required'}), 400
        try:
            amount = Decimal(str(amount_str))
            interest_rate = Decimal(str(interest_rate_str))
            duration_months = int(duration_str)
            if amount <= 0 or interest_rate < 0 or duration_months <= 0:
                return jsonify({'error': 'Invalid loan parameters'}), 400
        except Exception:
            return jsonify({'error': 'Invalid numeric values'}), 400
        emi, total_payable = calculate_emi_and_payable(amount, interest_rate, duration_months)
        loan = Loan(
            customer_id=customer.id,
            amount=amount,
            interest_rate=interest_rate,
            duration_months=duration_months,
            emi=emi,
            total_payable=total_payable,
            status='pending'
        )
        db.session.add(loan)
        db.session.commit()
        return jsonify({'message': 'Loan application submitted', 'loan': _serialize_loan(loan)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/loans/repay/<int:loan_id>', methods=['POST'])
@customer_login_required_api
def api_customer_repay_loan(loan_id):
    try:
        customer = db.session.get(Customer, session['customer_id'])
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        loan = db.session.get(Loan, loan_id)
        if not loan or loan.customer_id != customer.id:
            return jsonify({'error': 'Loan not found'}), 404
        if loan.status != 'approved':
            return jsonify({'error': 'Loan is not active'}), 400
        data = request.get_json(silent=True) or request.form
        amount_str = data.get('amount')
        if not amount_str:
            return jsonify({'error': 'Amount is required'}), 400
        try:
            amount = Decimal(amount_str)
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except Exception:
            return jsonify({'error': 'Invalid amount'}), 400
        remaining = loan.total_payable - loan.total_paid
        if amount > remaining:
            return jsonify({'error': 'Amount exceeds remaining balance'}), 400
        active_account = Account.query.filter_by(customer_id=customer.id, status='active').with_for_update().first()
        if not active_account:
            return jsonify({'error': 'No active account for deduction'}), 400
        if active_account.balance < amount:
            return jsonify({'error': 'Insufficient account balance'}), 400
        loan.total_paid += amount
        loan.last_payment_date = _utcnow()
        is_full = loan.total_payable - loan.total_paid < Decimal('0.05')
        if is_full:
            loan.status = 'fully_paid'
            loan.total_paid = loan.total_payable
        active_account.balance -= amount
        txn = Transaction(
            account_id=active_account.id,
            type='withdrawal',
            amount=amount,
            balance_after=active_account.balance,
            description=f"Loan Repayment ({loan.loan_number})",
            status='successful',
            reference_number=f"LNR-{uuid.uuid4().hex[:8].upper()}",
            created_by=session['customer_id']
        )
        db.session.add(txn)
        emi_cnt = len(loan.repayments) + 1
        repay = Repayment(
            loan_id=loan.id,
            amount=amount,
            emi_number=emi_cnt,
            status='paid',
            received_by=session['customer_id']
        )
        db.session.add(repay)
        log_audit('emi_collection', 'repayment', repay.id, f'EMI #{emi_cnt} of NPR {float(amount):,.2f} collected from customer {customer.full_name} for loan {loan.loan_number}')
        notify_customer(loan.customer_id, 'EMI Payment Received',
            f'EMI #{emi_cnt} of NPR {float(amount):,.2f} received for loan {loan.loan_number}.')
        db.session.commit()
        return jsonify({'message': 'Repayment successful', 'loan': _serialize_loan(loan)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/transfer', methods=['POST'])
@customer_login_required_api
def api_customer_transfer():
    try:
        customer = db.session.get(Customer, session['customer_id'])
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        data = request.get_json(silent=True) or request.form
        from_account_id = data.get('from_account_id')
        to_account_number = data.get('to_account_number')
        amount_str = data.get('amount')
        description = (data.get('description') or '').strip()
        if not all([from_account_id, to_account_number, amount_str]):
            return jsonify({'error': 'Source account, target account, and amount are required'}), 400
        try:
            amount = Decimal(str(amount_str))
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except Exception:
            return jsonify({'error': 'Invalid amount'}), 400
        from_account = Account.query.filter_by(id=int(from_account_id), customer_id=customer.id, status='active').with_for_update().first()
        if not from_account:
            return jsonify({'error': 'Source account not found or not active'}), 404
        if from_account.balance < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        to_account = Account.query.filter_by(account_number=to_account_number, status='active').with_for_update().first()
        if not to_account:
            return jsonify({'error': 'Target account not found'}), 404
        if from_account.id == to_account.id:
            return jsonify({'error': 'Cannot transfer to the same account'}), 400
        ref = f"TRF-{uuid.uuid4().hex[:8].upper()}"
        from_balance = from_account.balance - amount
        from_account.balance = from_balance
        from_account.last_transaction_date = _utcnow()
        from_account.total_withdrawals += amount
        tx_out = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=from_account.id,
            type='transfer_out',
            amount=amount,
            balance_after=from_balance,
            description=description or f"Transfer to {to_account_number}",
            status='successful',
            reference_number=ref,
            created_by=session['customer_id']
        )
        db.session.add(tx_out)
        to_balance = to_account.balance + amount
        to_account.balance = to_balance
        to_account.last_transaction_date = _utcnow()
        to_account.total_deposits += amount
        tx_in = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=to_account.id,
            type='transfer_in',
            amount=amount,
            balance_after=to_balance,
            description=description or f"Transfer from {from_account.account_number}",
            status='successful',
            reference_number=ref,
            created_by=session['customer_id']
        )
        db.session.add(tx_in)
        log_audit('transfer', 'transaction', tx_out.id,
            f'Transfer of {amount} from account {from_account.account_number} to {to_account_number}. Ref: {ref}')
        notify_customer(customer.id, 'Transfer Sent',
            f'NPR {float(amount):,.2f} sent to account {to_account_number}. Ref: {ref}')
        to_customer = db.session.get(Customer, to_account.customer_id)
        if to_customer:
            notify_customer(to_customer.id, 'Transfer Received',
                f'NPR {float(amount):,.2f} received from {customer.full_name} ({from_account.account_number}). Ref: {ref}')
        db.session.commit()
        return jsonify({'message': 'Transfer successful', 'reference': ref})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/transactions', methods=['GET'])
@customer_login_required_api
def api_customer_transactions():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    account_ids = [acc.id for acc in Account.query.filter_by(customer_id=customer.id).all()]
    if not account_ids:
        return jsonify({'transactions': []})
    q = Transaction.query.filter(Transaction.account_id.in_(account_ids))
    txn_type = request.args.get('type')
    if txn_type:
        q = q.filter(Transaction.type == txn_type)
    status = request.args.get('status')
    if status:
        q = q.filter(Transaction.status == status)
    date_from = request.args.get('date_from')
    if date_from:
        q = q.filter(Transaction.created_at >= datetime.datetime.strptime(date_from, '%Y-%m-%d'))
    date_to = request.args.get('date_to')
    if date_to:
        q = q.filter(Transaction.created_at <= datetime.datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S'))
    transactions = q.order_by(Transaction.created_at.desc()).limit(200).all()
    return jsonify({'transactions': [_serialize_transaction(t) for t in transactions]})

@api_bp.route('/customer/profile', methods=['GET'])
@customer_login_required_api
def api_customer_profile():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    return jsonify({'customer': _serialize_customer(customer)})

@api_bp.route('/customer/profile/update', methods=['POST'])
@customer_login_required_api
def api_customer_profile_update():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    data = request.get_json(silent=True) or request.form
    email = (data.get('email') or '').strip()
    alternate_mobile = (data.get('alternate_mobile') or '').strip()
    address = (data.get('address') or '').strip()
    permanent_address = (data.get('permanent_address') or '').strip()
    temporary_address = (data.get('temporary_address') or '').strip()
    if email:
        customer.email = email
    if alternate_mobile:
        customer.alternate_mobile = alternate_mobile
    if address:
        customer.address = address
    if permanent_address:
        customer.permanent_address = permanent_address
    if temporary_address:
        customer.temporary_address = temporary_address
    db.session.commit()
    return jsonify({'message': 'Profile updated', 'customer': _serialize_customer(customer)})

@api_bp.route('/customer/change-password', methods=['POST'])
@customer_login_required_api
def api_customer_change_password():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    data = request.get_json(silent=True) or request.form
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    if not customer.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    if not new_password or len(new_password) < 4:
        return jsonify({'error': 'New password must be at least 4 characters'}), 400
    customer.set_password(new_password)
    customer.must_change_password = False
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'})

@api_bp.route('/customer/confirm-contact', methods=['POST'])
@customer_login_required_api
def api_customer_confirm_contact():
    customer = db.session.get(Customer, session['customer_id'])
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    data = request.get_json(silent=True) or request.form
    mobile = (data.get('phone_number') or '').strip()
    email = (data.get('email') or '').strip()
    if mobile:
        customer.phone_number = mobile
        customer.mobile_confirmed = True
    if email:
        customer.email = email
        customer.email_confirmed = True
    db.session.commit()
    return jsonify({'message': 'Contact info confirmed', 'customer': _serialize_customer(customer)})

# ===== NOTIFICATIONS =====

@api_bp.route('/notifications/', methods=['GET'])
@api_login_required
def api_list_notifications():
    query = Notification.query
    if 'customer_id' in session:
        query = query.filter_by(customer_id=session['customer_id'])
    elif 'user_id' in session:
        query = query.filter_by(user_id=session['user_id'])
    else:
        return jsonify({'notifications': []})
    unread_only = request.args.get('unread', '').lower() == 'true'
    if unread_only:
        query = query.filter_by(is_read=False)
    notifications = query.order_by(Notification.created_at.desc()).all()
    return jsonify({
        'notifications': [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat() if n.created_at else None
        } for n in notifications],
        'unread_count': Notification.query.filter_by(is_read=False).filter(
            *([Notification.customer_id == session['customer_id']] if 'customer_id' in session else []),
            *([Notification.user_id == session['user_id']] if 'user_id' in session else [])
        ).count()
    })

@api_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@api_login_required
def api_mark_notification_read(notification_id):
    notif = Notification.query.get_or_404(notification_id)
    if 'customer_id' in session and notif.customer_id != session['customer_id']:
        return jsonify({'error': 'Access denied'}), 403
    if 'user_id' in session and notif.user_id != session['user_id']:
        return jsonify({'error': 'Access denied'}), 403
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})

@api_bp.route('/notifications/read-all', methods=['POST'])
@api_login_required
def api_mark_all_read():
    query = Notification.query.filter_by(is_read=False)
    if 'customer_id' in session:
        query = query.filter_by(customer_id=session['customer_id'])
    elif 'user_id' in session:
        query = query.filter_by(user_id=session['user_id'])
    else:
        return jsonify({'error': 'Not authenticated'}), 401
    query.update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})

@api_bp.route('/notifications/clear', methods=['POST'])
@api_login_required
def api_clear_notifications():
    query = Notification.query
    if 'customer_id' in session:
        query = query.filter_by(customer_id=session['customer_id'])
    elif 'user_id' in session:
        query = query.filter_by(user_id=session['user_id'])
    else:
        return jsonify({'error': 'Not authenticated'}), 401
    query.delete()
    db.session.commit()
    return jsonify({'message': 'Notifications cleared'})

# ===== AUDIT LOGS =====

@api_bp.route('/audit-logs/', methods=['GET'])
@staff_or_admin_required
def api_list_audit_logs():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    limit = request.args.get('limit', '50')
    action_filter = request.args.get('action', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    try:
        limit = int(limit)
    except ValueError:
        limit = 50
    query = AuditLog.query
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    if date_from:
        try:
            dt_from = datetime.datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(AuditLog.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.datetime.strptime(date_to, '%Y-%m-%d') + datetime.timedelta(days=1)
            query = query.filter(AuditLog.created_at < dt_to)
        except ValueError:
            pass
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return jsonify({
        'logs': [{
            'id': l.id,
            'user_id': l.user_id,
            'customer_id': l.customer_id,
            'username': l.username,
            'role': l.role,
            'action': l.action,
            'resource_type': l.resource_type,
            'resource_id': l.resource_id,
            'description': l.description,
            'ip_address': l.ip_address,
            'status': l.status,
            'created_at': l.created_at.isoformat() if l.created_at else None
        } for l in logs] if logs else [],
        'total': AuditLog.query.count()
    })

@api_bp.route('/audit-logs/actions', methods=['GET'])
@staff_or_admin_required
def api_list_audit_actions():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    actions = db.session.query(AuditLog.action, db.func.count(AuditLog.id)).group_by(AuditLog.action).order_by(db.func.count(AuditLog.id).desc()).all()
    return jsonify({'actions': [{'action': a[0], 'count': a[1]} for a in actions]})

@api_bp.route('/audit-logs/summary', methods=['GET'])
@staff_or_admin_required
def api_audit_summary():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    total = AuditLog.query.count()
    today = _utcnow().date()
    start = datetime.datetime.combine(today, datetime.time.min)
    end = datetime.datetime.combine(today, datetime.time.max)
    today_count = AuditLog.query.filter(AuditLog.created_at >= start, AuditLog.created_at <= end).count()
    failed = AuditLog.query.filter(AuditLog.status == 'failure').count()
    recent = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
    return jsonify({
        'total_logs': total,
        'today_logs': today_count,
        'failed_actions': failed,
        'recent': [{
            'id': l.id, 'username': l.username, 'role': l.role,
            'action': l.action, 'description': l.description,
            'status': l.status, 'created_at': l.created_at.isoformat() if l.created_at else None
        } for l in recent]
    })
