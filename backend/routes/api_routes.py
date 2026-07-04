import datetime
import functools
import os
import uuid
from decimal import Decimal
from flask import Blueprint, request, jsonify, session, g, send_from_directory
from sqlalchemy.orm import joinedload, subqueryload
from extensions import limiter
from database.db import db
from models import User, Customer, Account, Transaction, Loan, Repayment, Notification, AuditLog, LoanApplication, LoanDocument, LoanStatusHistory, ClarificationRequest, VerificationNote, Appointment
from utils.helpers import generate_customer_id, generate_username_from_phone, generate_password_from_name_phone, generate_account_number, validate_citizenship_format
from utils.emi_calculator import calculate_emi_and_payable
from utils.audit_helper import log_audit, create_notification, notify_customer, notify_staff
from utils.report_helper import (
    generate_deposit_report, generate_withdrawal_report, generate_loan_report,
    generate_emi_collection_report, generate_interest_report,
    generate_customer_report, generate_account_report, generate_customer_summary
)

_NPT = datetime.timezone(datetime.timedelta(hours=5, minutes=45))
def _utcnow():
    return datetime.datetime.now(_NPT).replace(tzinfo=None)

def _next_reference(prefix='TRF'):
    """Generate a globally sequential reference number."""
    from models import ReferenceSequence
    num = ReferenceSequence.next_value()
    db.session.flush()
    return f"{prefix}-{num:09d}"

api_bp = Blueprint('api', __name__, url_prefix='/api')

def api_login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        from models import CustomerToken
        auth_token = request.headers.get('X-Auth-Token')
        if auth_token:
            token_record = CustomerToken.query.filter_by(token=auth_token).first()
            if not token_record:
                return jsonify({'error': 'Invalid or expired session'}), 401
            g.current_customer = db.session.get(Customer, token_record.customer_id)
            if not g.current_customer:
                return jsonify({'error': 'Customer not found'}), 404
            return f(*args, **kwargs)
        if 'customer_id' not in session and 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

def staff_or_admin_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        g.current_user = User.query.get(session['user_id'])
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        user = User.query.get(session['user_id'])
        if not user or user.role != 'admin':
            return jsonify({'error': 'Only admins can perform this action'}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def customer_login_required_api(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        from models import CustomerToken
        auth_token = request.headers.get('X-Auth-Token')
        if auth_token:
            token_record = CustomerToken.query.filter_by(token=auth_token).first()
            if not token_record:
                return jsonify({'error': 'Invalid or expired session'}), 401
            g.current_customer = db.session.get(Customer, token_record.customer_id)
            if not g.current_customer:
                return jsonify({'error': 'Customer not found'}), 404
            return f(*args, **kwargs)
        if 'customer_id' not in session:
            return jsonify({'error': 'Customer authentication required'}), 401
        g.current_customer = db.session.get(Customer, session['customer_id'])
        if not g.current_customer:
            return jsonify({'error': 'Customer not found'}), 404
        return f(*args, **kwargs)
    return decorated

def _serialize_customer(c):
    active_loans = [l for l in c.loans if l.status in ('pending', 'approved', 'active')] if c.loans else []
    total_loan_amount = sum(float(l.amount) for l in active_loans)
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
        'accounts': [_serialize_account(a) for a in c.accounts] if c.accounts else [],
        'active_loans_count': len(active_loans),
        'total_loan_amount': total_loan_amount,
        'loans': [_serialize_loan_compact(l) for l in c.loans] if c.loans else []
    }

def _serialize_loan_compact(l):
    return {
        'id': l.id,
        'loan_number': l.loan_number,
        'amount': float(l.amount),
        'interest_rate': float(l.interest_rate),
        'emi': float(l.emi),
        'total_payable': float(l.total_payable),
        'total_paid': float(l.total_paid),
        'status': l.status,
        'applied_date': l.applied_date.isoformat() if l.applied_date else None
    }

def _serialize_account(a):
    cust = a.customer
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
        'customer': _simple_customer(cust) if cust else None,
        'customer_name': cust.full_name if cust else None
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
        'status': a.status,
        'customer_name': a.customer.full_name if a.customer else None
    }

def _serialize_transaction(t):
    acc = t.account
    if acc is None and t.account_id is not None:
        acc = db.session.get(Account, t.account_id)
    cust = acc.customer if acc else None

    # balance before transaction
    amt = float(t.amount)
    bal_after = float(t.balance_after)
    if t.type in ('deposit', 'transfer_in'):
        bal_before = bal_after - amt
    else:
        bal_before = bal_after + amt

    # initiated by
    initiated_by_type = 'system'
    initiated_by_name = None
    if t.created_by is not None:
        user = db.session.get(User, t.created_by)
        if user:
            initiated_by_type = user.role
            initiated_by_name = user.username
        else:
            cust_by = db.session.get(Customer, t.created_by)
            if cust_by:
                initiated_by_type = 'customer'
                initiated_by_name = cust_by.full_name

    # counterparty (for transfers)
    counterparty_name = None
    counterparty_account = None
    if t.type in ('transfer_out', 'transfer_in') and t.reference_number:
        ref = t.reference_number
        if t.type == 'transfer_out':
            partner = Transaction.query.filter_by(reference_number=ref, type='transfer_in').first()
        else:
            partner = Transaction.query.filter_by(reference_number=ref, type='transfer_out').first()
        if partner:
            p_acc = partner.account
            if p_acc is None and partner.account_id is not None:
                p_acc = db.session.get(Account, partner.account_id)
            if p_acc:
                counterparty_account = p_acc.account_number
                p_cust = p_acc.customer
                counterparty_name = p_cust.full_name if p_cust else None

    return {
        'id': t.id,
        'transaction_uuid': t.transaction_uuid,
        'account_id': t.account_id,
        'type': t.type,
        'amount': amt,
        'balance_before': bal_before,
        'balance_after': bal_after,
        'description': t.description,
        'status': t.status,
        'reference_number': t.reference_number,
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'account_number': acc.account_number if acc else None,
        'customer_name': cust.full_name if cust else None,
        'account': _serialize_account(acc) if acc else None,
        'initiated_by_type': initiated_by_type,
        'initiated_by_name': initiated_by_name,
        'counterparty_name': counterparty_name,
        'counterparty_account': counterparty_account
    }

def _compute_loan_overdue(l):
    if l.status != 'approved':
        return False
    now = datetime.datetime.now(_NPT).replace(tzinfo=None)
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
        for k in ['customer_id', 'customer_name']:
            session.pop(k, None)
        session['customer_id'] = customer.id
        session['customer_name'] = customer.full_name
        import secrets
        token_str = secrets.token_hex(32)
        from models import CustomerToken
        token = CustomerToken(token=token_str, customer_id=customer.id)
        db.session.add(token)
        log_audit('customer_login', 'auth', customer.id, f'Customer {customer.full_name} logged in')
        db.session.commit()
        return jsonify({
            'customer_id': customer.id,
            'customer_name': customer.full_name,
            'phone_number': customer.phone_number,
            'email': customer.email or '',
            'auth_token': token_str,
            'mobile_confirmed': customer.mobile_confirmed,
            'email_confirmed': customer.email_confirmed
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@api_bp.route('/customer/logout', methods=['POST'])
def api_customer_logout():
    from models import CustomerToken
    auth_token = request.headers.get('X-Auth-Token')
    if auth_token:
        CustomerToken.query.filter_by(token=auth_token).delete()
    if 'customer_id' in session:
        log_audit('customer_logout', 'auth', session.get('customer_id'), f'Customer {session.get("customer_name")} logged out')
        db.session.commit()
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

# ===== CUSTOMER ENDPOINTS =====

@api_bp.route('/customers/', methods=['GET'])
@staff_or_admin_required
def api_list_customers():
    query = Customer.query

    search = request.args.get('search', '').strip()
    name_filter = request.args.get('name', '').strip()
    phone_filter = request.args.get('phone', '').strip()
    citizenship_filter = request.args.get('citizenship', '').strip()
    account_filter = request.args.get('account_number', '').strip()
    account_type_filter = request.args.get('account_type', '').strip()
    status_filter = request.args.get('status', '').strip()

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Customer.full_name.ilike(like),
                Customer.phone_number.ilike(like),
                Customer.citizenship_id.ilike(like),
                Customer.email.ilike(like)
            )
        )
    if name_filter:
        query = query.filter(Customer.full_name.ilike(f'%{name_filter}%'))
    if phone_filter:
        query = query.filter(Customer.phone_number.ilike(f'%{phone_filter}%'))
    if citizenship_filter:
        query = query.filter(Customer.citizenship_id.ilike(f'%{citizenship_filter}%'))
    if status_filter:
        query = query.filter(Customer.status == status_filter)
    if account_type_filter:
        query = query.filter(Customer.accounts.any(Account.account_type == account_type_filter))
    if account_filter:
        query = query.filter(Customer.accounts.any(Account.account_number.ilike(f'%{account_filter}%')))

    customers = query.options(joinedload(Customer.accounts)).order_by(Customer.created_at.desc()).all()
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

    if not validate_citizenship_format(citizenship_id):
        return jsonify({'error': 'Invalid Citizenship Format. Expected format: 121516-1012'}), 400

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

        # Username = phone number
        username = generate_username_from_phone(phone_number)
        if Customer.query.filter_by(username=username).first():
            return jsonify({'error': 'Username (phone number) already registered'}), 400

        # Auto-generated password based on name + phone
        temp_password = generate_password_from_name_phone(full_name, phone_number)

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
            must_change_password=False
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

@api_bp.route('/customers/summary', methods=['GET'])
@staff_or_admin_required
def api_customers_summary():
    total = Customer.query.count()
    active = Customer.query.filter_by(status='active').count()
    suspended = Customer.query.filter_by(status='suspended').count()
    closed = Customer.query.filter_by(status='closed').count()
    archived = Customer.query.filter_by(status='archived').count()
    total_deposits = db.session.query(db.func.coalesce(db.func.sum(Account.total_deposits), 0)).scalar()
    total_loans = db.session.query(db.func.coalesce(db.func.sum(Loan.amount), 0)).filter(Loan.status.in_(['pending', 'approved', 'active'])).scalar()
    return jsonify({
        'total_customers': total,
        'active_customers': active,
        'suspended_customers': suspended,
        'closed_customers': closed,
        'archived_customers': archived,
        'total_deposits': float(total_deposits),
        'total_loans': float(total_loans)
    })

@api_bp.route('/customers/<int:customer_id>/status', methods=['POST'])
@admin_required
def api_update_customer_status(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json(silent=True) or request.form
    new_status = (data.get('status') or '').strip().lower()
    valid_statuses = ['active', 'suspended', 'closed', 'archived']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
    customer.status = new_status
    if new_status == 'closed':
        for account in customer.accounts:
            account.status = 'closed'
    elif new_status == 'active':
        for account in customer.accounts:
            account.status = 'active'
    db.session.commit()
    log_audit(f'customer_{new_status}', 'customer', customer_id, f'Customer {customer.full_name} status set to {new_status}')
    return jsonify({'message': f'Customer status updated to {new_status}', 'customer': _serialize_customer(customer)})

@api_bp.route('/customers/<int:customer_id>/reset-password', methods=['POST'])
@staff_or_admin_required
def api_reset_customer_password(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json(silent=True) or request.form
    new_password = (data.get('new_password') or '').strip()
    if new_password:
        current_password = data.get('current_password', '')
        if current_password and not customer.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        has_letter = any(c.isalpha() for c in new_password)
        has_digit = any(c.isdigit() for c in new_password)
        has_special = any(not c.isalnum() for c in new_password)
        if not (has_letter and has_digit and has_special):
            return jsonify({'error': 'Password must contain letters, numbers, and special characters'}), 400
        customer.set_password(new_password)
        db.session.flush()
        log_audit('customer_password_reset', 'customer', customer_id,
            f'Password reset by {g.current_user.role} ({g.current_user.username}) for {customer.full_name}')
        notify_customer(customer.id, 'Password Reset by Bank',
            'Your password was reset by bank staff. You can now log in using your new password.')
        db.session.commit()
        return jsonify({'message': 'Password updated successfully'})
    temp_password = generate_password_from_name_phone(customer.full_name, customer.phone_number)
    customer.set_password(temp_password)
    db.session.flush()
    log_audit('customer_password_reset', 'customer', customer_id,
        f'Password auto-generated by {g.current_user.role} ({g.current_user.username}) for {customer.full_name}')
    notify_customer(customer.id, 'Password Reset by Bank',
        'Your password was reset by bank staff. You can now log in using your new password.')
    db.session.commit()
    return jsonify({'message': 'Password reset successfully', 'temporary_password': temp_password})

# ===== ACCOUNT ENDPOINTS =====

@api_bp.route('/accounts/', methods=['GET'])
@staff_or_admin_required
def api_list_accounts():
    query = Account.query

    acc_num = request.args.get('account_number', '').strip()
    name = request.args.get('name', '').strip()
    phone = request.args.get('phone', '').strip()
    citizenship = request.args.get('citizenship', '').strip()
    acc_type = request.args.get('account_type', '').strip()
    status_filter = request.args.get('status', '').strip()
    bal_min = request.args.get('balance_min', '').strip()
    bal_max = request.args.get('balance_max', '').strip()
    created_at = request.args.get('created_at', '').strip()

    if acc_num:
        query = query.filter(Account.account_number.ilike(f'%{acc_num}%'))
    needs_join = name or phone or citizenship
    if needs_join:
        query = query.join(Customer, Account.customer_id == Customer.id)
    if name:
        query = query.filter(Customer.full_name.ilike(f'%{name}%'))
    if phone:
        query = query.filter(Customer.phone_number.ilike(f'%{phone}%'))
    if citizenship:
        query = query.filter(Customer.citizenship_id.ilike(f'%{citizenship}%'))
    if bal_min:
        try:
            query = query.filter(Account.balance >= Decimal(bal_min))
        except Exception:
            pass
    if bal_max:
        try:
            query = query.filter(Account.balance <= Decimal(bal_max))
        except Exception:
            pass
    if created_at:
        try:
            dt = datetime.datetime.strptime(created_at, '%Y-%m-%d')
            query = query.filter(db.func.date(Account.created_at) == dt.date())
        except ValueError:
            pass

    if acc_type:
        query = query.filter(Account.account_type == acc_type)
    if status_filter:
        query = query.filter(Account.status == status_filter)

    accounts = query.options(joinedload(Account.customer)).order_by(Account.created_at.desc()).all()
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

@api_bp.route('/accounts/detail/<int:account_id>', methods=['GET'])
@staff_or_admin_required
def api_account_detail(account_id):
    account = db.session.get(Account, account_id)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    customer = account.customer
    # Loans for this customer
    loans = Loan.query.filter_by(customer_id=customer.id).order_by(Loan.applied_date.desc()).all() if customer else []
    # Transactions for this account
    transactions = Transaction.query.filter_by(account_id=account.id).order_by(Transaction.created_at.desc()).all()
    # Activity log entries referencing this account or its customer
    activity = []
    if customer:
        activity = AuditLog.query.filter(
            db.or_(
                AuditLog.resource_type == 'account',
                AuditLog.resource_id == str(account.id),
                AuditLog.resource_type == 'customer',
                AuditLog.resource_id == str(customer.id)
            )
        ).order_by(AuditLog.created_at.desc()).limit(50).all()
    return jsonify({
        'account': _serialize_account(account),
        'customer': _serialize_customer(customer) if customer else None,
        'loans': [_serialize_loan(l) for l in loans],
        'transactions': [_serialize_transaction(t) for t in transactions],
        'activity': [{
            'id': l.id, 'action': l.action, 'description': l.description,
            'username': l.username, 'role': l.role,
            'status': l.status, 'created_at': l.created_at.isoformat() if l.created_at else None
        } for l in activity]
    })

@api_bp.route('/accounts/freeze/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_freeze_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status == 'closed':
        return jsonify({'error': 'Cannot freeze a closed account'}), 400
    account.status = 'frozen'
    log_audit('account_frozen', 'account', account_id, f'Account {account.account_number} frozen')
    notify_customer(account.customer_id, 'Account Frozen',
        f'Your account ({account.account_number}) has been frozen.')
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
    notify_customer(account.customer_id, 'Account Unfrozen',
        f'Your account ({account.account_number}) has been unfrozen.')
    db.session.commit()
    return jsonify({'message': 'Account unfrozen', 'account': _serialize_account(account)})

@api_bp.route('/accounts/close/<int:account_id>', methods=['POST'])
@admin_required
def api_close_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.balance > 0:
        return jsonify({'error': 'Account must have a zero balance before it can be closed.'}), 400
    account.status = 'closed'
    log_audit('account_closed', 'account', account_id, f'Account {account.account_number} closed')
    notify_customer(account.customer_id, 'Account Closed',
        f'Your account ({account.account_number}) has been closed.')
    db.session.commit()
    return jsonify({'message': 'Account closed successfully.', 'account': _serialize_account(account)})

@api_bp.route('/accounts/suspend/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_suspend_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status == 'closed':
        return jsonify({'error': 'Cannot suspend a closed account'}), 400
    account.status = 'suspended'
    log_audit('account_suspended', 'account', account_id, f'Account {account.account_number} suspended')
    notify_customer(account.customer_id, 'Account Suspended',
        f'Your account ({account.account_number}) has been suspended.')
    db.session.commit()
    return jsonify({'message': 'Account suspended', 'account': _serialize_account(account)})

@api_bp.route('/accounts/unsuspend/<int:account_id>', methods=['POST'])
@staff_or_admin_required
def api_unsuspend_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status != 'suspended':
        return jsonify({'error': 'Account is not suspended'}), 400
    account.status = 'active'
    log_audit('account_unsuspended', 'account', account_id, f'Account {account.account_number} unsuspended')
    notify_customer(account.customer_id, 'Account Unsuspended',
        f'Your account ({account.account_number}) has been unsuspended.')
    db.session.commit()
    return jsonify({'message': 'Account unsuspended', 'account': _serialize_account(account)})

@api_bp.route('/accounts/archive/<int:account_id>', methods=['POST'])
@admin_required
def api_archive_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.balance > 0:
        return jsonify({'error': 'Account must have a zero balance before it can be archived.'}), 400
    account.status = 'archived'
    log_audit('account_archived', 'account', account_id, f'Account {account.account_number} archived')
    notify_customer(account.customer_id, 'Account Archived',
        f'Your account ({account.account_number}) has been archived.')
    db.session.commit()
    return jsonify({'message': 'Account archived successfully.', 'account': _serialize_account(account)})

@api_bp.route('/accounts/unarchive/<int:account_id>', methods=['POST'])
@admin_required
def api_unarchive_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status != 'archived':
        return jsonify({'error': 'Account is not archived'}), 400
    account.status = 'active'
    log_audit('account_unarchived', 'account', account_id, f'Account {account.account_number} unarchived')
    notify_customer(account.customer_id, 'Account Unarchived',
        f'Your account ({account.account_number}) has been unarchived.')
    db.session.commit()
    return jsonify({'message': 'Account unarchived', 'account': _serialize_account(account)})

@api_bp.route('/accounts/reopen/<int:account_id>', methods=['POST'])
@admin_required
def api_reopen_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status != 'closed':
        return jsonify({'error': 'Account is not closed'}), 400
    account.status = 'active'
    log_audit('account_reopened', 'account', account_id, f'Account {account.account_number} reopened')
    notify_customer(account.customer_id, 'Account Reopened',
        f'Your account ({account.account_number}) has been reopened.')
    db.session.commit()
    return jsonify({'message': 'Account reopened successfully.', 'account': _serialize_account(account)})

@api_bp.route('/customers/forgot-password/verify', methods=['POST'])
@staff_or_admin_required
def api_forgot_password_verify():
    """Step 1: Verify customer identity using account#, citizenship, phone, DOB."""
    data = request.get_json(silent=True) or request.form
    account_number = (data.get('account_number') or '').strip()
    citizenship_id = (data.get('citizenship_id') or '').strip()
    phone_number = (data.get('phone_number') or '').strip()
    dob_str = (data.get('dob') or '').strip()
    if not all([account_number, citizenship_id, phone_number, dob_str]):
        return jsonify({'verified': False, 'error': 'All fields are required'}), 400
    account = Account.query.filter_by(account_number=account_number).first()
    if not account:
        return jsonify({'verified': False, 'error': 'Account not found'}), 404
    customer = account.customer
    if not customer:
        return jsonify({'verified': False, 'error': 'Customer not found'}), 404
    if customer.citizenship_id != citizenship_id:
        return jsonify({'verified': False, 'error': 'Citizenship number does not match'}), 400
    if customer.phone_number != phone_number:
        return jsonify({'verified': False, 'error': 'Phone number does not match'}), 400
    try:
        dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
        if customer.dob != dob:
            return jsonify({'verified': False, 'error': 'Date of birth does not match'}), 400
    except ValueError:
        return jsonify({'verified': False, 'error': 'Invalid date format'}), 400
    return jsonify({'verified': True, 'customer_id': customer.id, 'customer_name': customer.full_name})

@api_bp.route('/customers/forgot-password/set', methods=['POST'])
@staff_or_admin_required
def api_forgot_password_set():
    """Step 2: After verification, set new password using customer_id + new_password."""
    data = request.get_json(silent=True) or request.form
    customer_id = data.get('customer_id')
    new_password = (data.get('new_password') or '').strip()
    if not customer_id:
        return jsonify({'error': 'customer_id is required'}), 400
    try:
        customer = Customer.query.get(int(customer_id))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid customer_id'}), 400
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters and contain letters, numbers, and special characters'}), 400
    has_letter = any(c.isalpha() for c in new_password)
    has_digit = any(c.isdigit() for c in new_password)
    has_special = any(not c.isalnum() for c in new_password)
    if not (has_letter and has_digit and has_special):
        return jsonify({'error': 'Password must contain letters, numbers, and special characters'}), 400
    customer.set_password(new_password)
    db.session.flush()
    log_audit('customer_password_forgot', 'customer', customer.id,
        f'Password set via forgot-password flow by {g.current_user.role} ({g.current_user.username}) for {customer.full_name}')
    notify_customer(customer.id, 'Password Recovered',
        'Your password has been recovered and updated by bank staff.')
    db.session.commit()
    return jsonify({'message': 'Password has been updated successfully.'})

@api_bp.route('/customers/<int:customer_id>/forgot-password', methods=['POST'])
def api_customer_forgot_password():
    data = request.get_json(silent=True) or request.form
    account_number = (data.get('account_number') or '').strip()
    citizenship_id = (data.get('citizenship_id') or '').strip()
    phone_number = (data.get('phone_number') or '').strip()
    dob_str = (data.get('dob') or '').strip()
    if not all([account_number, citizenship_id, phone_number, dob_str]):
        return jsonify({'error': 'All fields are required'}), 400
    account = Account.query.filter_by(account_number=account_number).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    customer = account.customer
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    if customer.citizenship_id != citizenship_id:
        return jsonify({'error': 'Citizenship number does not match'}), 400
    if customer.phone_number != phone_number:
        return jsonify({'error': 'Phone number does not match'}), 400
    try:
        dob = datetime.datetime.strptime(dob_str, '%Y-%m-%d').date()
        if customer.dob != dob:
            return jsonify({'error': 'Date of birth does not match'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    data = request.get_json(silent=True) or request.form
    new_password = (data.get('new_password') or '').strip()
    if new_password:
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        has_letter = any(c.isalpha() for c in new_password)
        has_digit = any(c.isdigit() for c in new_password)
        has_special = any(not c.isalnum() for c in new_password)
        if not (has_letter and has_digit and has_special):
            return jsonify({'error': 'Password must contain letters, numbers, and special characters'}), 400
        customer.set_password(new_password)
        db.session.flush()
        log_audit('customer_password_forgot', 'customer', customer.id,
            f'Password set via forgot password for {customer.full_name}')
        notify_customer(customer.id, 'Password Recovered',
            'Your password has been recovered and updated.')
        db.session.commit()
        return jsonify({'message': 'Identity verified. Password has been updated.'})
    temp_password = generate_password_from_name_phone(customer.full_name, customer.phone_number)
    customer.set_password(temp_password)
    db.session.flush()
    log_audit('customer_password_forgot', 'customer', customer.id,
        f'Password auto-generated via forgot password for {customer.full_name}')
    notify_customer(customer.id, 'Password Recovered',
        'Your password has been recovered by bank staff.')
    db.session.commit()
    return jsonify({'message': 'Identity verified. Password has been reset.', 'temporary_password': temp_password})

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
    ref = _next_reference('DEP')
    txn = Transaction(
        transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        account_id=account.id,
        type='deposit',
        amount=amount,
        balance_after=new_balance,
        description=description or 'Deposit',
        status='successful',
        reference_number=ref,
        created_by=g.user.id if g.user else None
    )
    db.session.add(txn)
    log_audit('deposit', 'transaction', txn.id, f'Deposit of {amount} to account {account_number}. Ref: {ref}')
    cust = account.customer
    cust_name = cust.full_name if cust else 'Unknown'
    notify_customer(account.customer_id, 'Deposit Successful',
        f'NPR {float(amount):,.2f} deposited to {cust_name} ({account_number}). Ref: {ref}')
    db.session.commit()
    return jsonify({'message': 'Deposit successful', 'reference': ref, 'transaction': _serialize_transaction(txn)})

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
    ref = _next_reference('WTH')
    txn = Transaction(
        transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        account_id=account.id,
        type='withdrawal',
        amount=amount,
        balance_after=new_balance,
        description=description or 'Withdrawal',
        status='successful',
        reference_number=ref,
        created_by=g.user.id if g.user else None
    )
    db.session.add(txn)
    log_audit('withdrawal', 'transaction', txn.id, f'Withdrawal of {amount} from account {account_number}. Ref: {ref}')
    cust = account.customer
    cust_name = cust.full_name if cust else 'Unknown'
    notify_customer(account.customer_id, 'Withdrawal Successful',
        f'NPR {float(amount):,.2f} withdrawn from {cust_name} ({account_number}). Ref: {ref}')
    db.session.commit()
    return jsonify({'message': 'Withdrawal successful', 'reference': ref, 'transaction': _serialize_transaction(txn)})

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

@api_bp.route('/transactions/<int:txn_id>/receipt', methods=['GET'])
@staff_or_admin_required
def api_transaction_receipt_admin(txn_id):
    try:
        txn = Transaction.query.get(txn_id)
        if not txn:
            return jsonify({'error': 'Transaction not found'}), 404
        if txn.type in ('transfer_out', 'transfer_in') and txn.reference_number:
            ref = txn.reference_number
            tx_out = Transaction.query.filter_by(reference_number=ref, type='transfer_out').first()
            tx_in = Transaction.query.filter_by(reference_number=ref, type='transfer_in').first()
            primary = tx_out or tx_in or txn
            from_account = Account.query.get(tx_out.account_id) if tx_out else None
            to_account = Account.query.get(tx_in.account_id) if tx_in else None
            from_customer = Customer.query.get(from_account.customer_id) if from_account else None
            to_customer = Customer.query.get(to_account.customer_id) if to_account else None
            now = primary.created_at
            receipt = {
                'reference': ref,
                'transaction_type': 'Fund Transfer',
                'status': primary.status or 'successful',
                'date': now.strftime('%Y-%m-%d') if now else '',
                'time': now.strftime('%I:%M %p') if now else '',
                'from_account': from_account.account_number if from_account else '',
                'from_account_type': from_account.account_type if from_account else '',
                'from_customer': from_customer.full_name if from_customer else '',
                'to_account': to_account.account_number if to_account else '',
                'to_account_type': to_account.account_type if to_account else '',
                'to_customer': to_customer.full_name if to_customer else '',
                'amount': float(primary.amount),
                'remaining_balance': float(tx_out.balance_after) if tx_out else float(tx_in.balance_after if tx_in else 0),
                'description': primary.description or ''
            }
            return jsonify({'receipt': receipt})
        acc = txn.account
        cust = acc.customer if acc else None
        now = txn.created_at
        receipt = {
            'reference': txn.reference_number or txn.transaction_uuid,
            'transaction_type': txn.type.replace('_', ' ').title(),
            'status': txn.status or 'successful',
            'date': now.strftime('%Y-%m-%d') if now else '',
            'time': now.strftime('%I:%M %p') if now else '',
            'from_account': acc.account_number if acc else '',
            'from_account_type': acc.account_type if acc else '',
            'from_customer': cust.full_name if cust else '',
            'to_account': '',
            'to_account_type': '',
            'to_customer': '',
            'amount': float(txn.amount),
            'remaining_balance': float(txn.balance_after),
            'description': txn.description or ''
        }
        return jsonify({'receipt': receipt})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
@admin_required
def api_approve_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'pending':
        return jsonify({'error': 'Loan already processed'}), 400
    active_account = Account.query.filter_by(customer_id=loan.customer_id, status='active').with_for_update().first()
    if not active_account:
        return jsonify({'error': 'Customer has no active account'}), 400
    try:
        loan.status = 'approved'
        loan.approved_date = datetime.datetime.now(_NPT).replace(tzinfo=None)
        loan.approved_by = session.get('user_id')
        active_account.balance += loan.amount
        lnd_ref = _next_reference('LND')
        txn = Transaction(
            account_id=active_account.id,
            type='deposit',
            amount=loan.amount,
            balance_after=active_account.balance,
            description=f"Loan Disbursement ({loan.loan_number})",
            status='successful',
            reference_number=lnd_ref,
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
@admin_required
def api_reject_loan(loan_id):
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
            lnr_ref = _next_reference('LNR')
            txn = Transaction(
                account_id=active_account.id,
                type='withdrawal',
                amount=amount,
                balance_after=active_account.balance,
                description=f"Loan Repayment ({loan.loan_number})",
                status='successful',
                reference_number=lnr_ref,
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
    recent_transactions = Transaction.query.options(
        joinedload(Transaction.account).joinedload(Account.customer)
    ).order_by(Transaction.created_at.desc()).limit(5).all()
    recent_loans = Loan.query.order_by(Loan.applied_date.desc()).limit(5).all()
    pending_loans = Loan.query.filter_by(status='pending').order_by(Loan.applied_date.desc()).limit(5).all()
    today = _utcnow().date()
    dates = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    date_labels = [d.strftime('%b %d') for d in dates]
    daily_deposits = []
    daily_withdrawals = []
    daily_transfers = []
    for d in dates:
        start = datetime.datetime.combine(d, datetime.time.min)
        end = datetime.datetime.combine(d, datetime.time.max)
        dep = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'deposit', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        wit = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'withdrawal', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        trf = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'transfer_out', Transaction.created_at >= start, Transaction.created_at <= end
        ).scalar() or Decimal('0.00')
        daily_deposits.append(float(dep))
        daily_withdrawals.append(float(wit))
        daily_transfers.append(float(trf))
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
        'daily_withdrawals': daily_withdrawals,
        'daily_transfers': daily_transfers
    })

@api_bp.route('/reports', methods=['GET'])
@staff_or_admin_required
def api_reports():
    report_type = request.args.get('type', 'daily')
    today = datetime.datetime.now(_NPT).replace(tzinfo=None).date()
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
@admin_required
def api_list_staff():
    staff = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'staff': [{'id': s.id, 'username': s.username, 'role': s.role, 'created_at': s.created_at.isoformat() if s.created_at else None} for s in staff]})

@api_bp.route('/staff/create', methods=['POST'])
@admin_required
def api_create_staff():
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
@admin_required
def api_delete_staff(user_id):
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
    customer = g.current_customer
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
    customer = g.current_customer
    accounts = Account.query.filter_by(customer_id=customer.id).order_by(Account.created_at.desc()).all()
    return jsonify({'accounts': [_serialize_account(a) for a in accounts]})

@api_bp.route('/customer/accounts/apply', methods=['POST'])
@customer_login_required_api
def api_customer_account_apply():
    try:
        customer = g.current_customer
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
    customer = g.current_customer
    loans = Loan.query.filter_by(customer_id=customer.id).order_by(Loan.applied_date.desc()).all()
    return jsonify({'loans': [_serialize_loan(l) for l in loans]})

@api_bp.route('/customer/loans/apply', methods=['POST'])
@customer_login_required_api
def api_customer_loan_apply():
    try:
        customer = g.current_customer
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
        customer = g.current_customer
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
        lnr_ref = _next_reference('LNR')
        txn = Transaction(
            account_id=active_account.id,
            type='withdrawal',
            amount=amount,
            balance_after=active_account.balance,
            description=f"Loan Repayment ({loan.loan_number})",
            status='successful',
            reference_number=lnr_ref,
            created_by=g.current_customer.id
        )
        db.session.add(txn)
        emi_cnt = len(loan.repayments) + 1
        repay = Repayment(
            loan_id=loan.id,
            amount=amount,
            emi_number=emi_cnt,
            status='paid',
            received_by=g.current_customer.id
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

# ==================== Loan Application Module API ====================

def _serialize_loan_application(app):
    return {
        'id': app.id,
        'application_number': app.application_number,
        'customer_id': app.customer_id,
        'customer_name': app.customer.full_name if app.customer else '',
        'customer_phone': app.customer.phone_number if app.customer else '',
        'alternate_mobile': app.customer.alternate_mobile if app.customer else '',
        'customer_email': app.customer.email if app.customer else '',
        'customer_address': app.customer.address if app.customer else '',
        'citizenship_number': app.customer.citizenship_id if app.customer else '',
        'occupation': app.customer.occupation if app.customer else '',
        'permanent_address': app.customer.permanent_address if app.customer else '',
        'current_address': app.customer.temporary_address if app.customer else '',
        'father_name': app.customer.father_name if app.customer else '',
        'grandfather_name': app.customer.grandfather_name if app.customer else '',
        'dob': app.customer.dob.isoformat() if app.customer and app.customer.dob else None,
        'gender': app.customer.gender if app.customer else '',
        'citizenship_issue_district': app.customer.citizenship_issue_district if app.customer else '',
        'marital_status': app.customer.marital_status if app.customer else '',
        'nominee_name': app.customer.nominee_name if app.customer else '',
        'nominee_contact': app.customer.nominee_contact if app.customer else '',
        'nominee_relationship': app.customer.nominee_relationship if app.customer else '',
        'loan_type': app.loan_type,
        'amount': float(app.amount),
        'duration_months': app.duration_months,
        'interest_rate': float(app.interest_rate),
        'purpose': app.purpose,
        'collateral_type': app.collateral_type,
        'status': app.status,
        'assigned_staff_id': app.assigned_staff_id,
        'assigned_staff_name': app.assigned_staff.username if app.assigned_staff else None,
        'appointment_date': app.appointment_date.isoformat() if app.appointment_date else None,
        'appointment_time': app.appointment_time,
        'staff_remark': app.staff_remark,
        'admin_remark': app.admin_remark,
        'processing_notes': app.processing_notes,
        'expected_processing_days': app.expected_processing_days,
        'submitted_at': app.submitted_at.isoformat() if app.submitted_at else None,
        'approved_at': app.approved_at.isoformat() if app.approved_at else None,
        'rejected_at': app.rejected_at.isoformat() if app.rejected_at else None,
        'disbursed_at': app.disbursed_at.isoformat() if app.disbursed_at else None,
        'created_at': app.created_at.isoformat() if app.created_at else None,
        'updated_at': app.updated_at.isoformat() if app.updated_at else None,
        'documents': [{'id': d.id, 'document_type': d.document_type, 'file_name': d.file_name, 'file_path': d.file_path, 'file_url': f'api/uploads/loan_docs/{os.path.basename(d.file_path)}', 'file_size': d.file_size, 'uploaded_at': d.uploaded_at.isoformat() if d.uploaded_at else None} for d in app.documents],
        'status_history': [{'id': h.id, 'old_status': h.old_status, 'new_status': h.new_status, 'changed_by': h.changed_by, 'changed_by_role': _extract_role(h.changed_by), 'changed_by_name': _extract_name(h.changed_by), 'changed_at': h.changed_at.isoformat() if h.changed_at else None, 'remarks': h.remarks} for h in app.status_history],
        'clarification_requests': [{'id': c.id, 'request_by': c.request_by, 'reason': c.reason, 'is_resolved': c.is_resolved, 'created_at': c.created_at.isoformat() if c.created_at else None, 'resolved_at': c.resolved_at.isoformat() if c.resolved_at else None} for c in app.clarification_requests],
        'verification_notes': [{'id': v.id, 'staff_id': v.staff_id, 'staff_name': v.staff.username if v.staff else None, 'notes': v.notes, 'created_at': v.created_at.isoformat() if v.created_at else None} for v in app.verification_notes],
        'appointments': [{'id': a.id, 'appointment_date': a.appointment_date.isoformat() if a.appointment_date else None, 'appointment_time': a.appointment_time, 'remarks': a.remarks, 'created_by': a.created_by} for a in app.appointments]
    }

def _extract_role(changed_by):
    if not changed_by or ': ' not in changed_by:
        return None
    return changed_by.split(': ')[0]

def _extract_name(changed_by):
    if not changed_by or ': ' not in changed_by:
        return changed_by
    return changed_by.split(': ', 1)[1]

def _track_status_change(app, new_status, changed_by=None, remarks=None):
    history = LoanStatusHistory(
        loan_application_id=app.id,
        old_status=app.status,
        new_status=new_status,
        changed_by=changed_by,
        remarks=remarks
    )
    db.session.add(history)
    app.status = new_status

_LOAN_DOC_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'loan_docs')

@api_bp.route('/uploads/loan_docs/<path:filename>')
def serve_loan_doc(filename):
    return send_from_directory(_LOAN_DOC_UPLOAD_DIR, filename)

@api_bp.route('/loan-applications/draft', methods=['POST'])
@customer_login_required_api
def api_save_loan_draft():
    try:
        customer = g.current_customer
        data = request.get_json(silent=True) or request.form
        
        existing_id = data.get('application_id')
        if existing_id:
            app = LoanApplication.query.filter_by(id=int(existing_id), customer_id=customer.id).first()
            if not app:
                return jsonify({'error': 'Application not found'}), 404
        else:
            app = LoanApplication(customer_id=customer.id, status='draft')
            db.session.add(app)

        app.loan_type = data.get('loan_type', app.loan_type)
        app.amount = Decimal(str(data.get('amount', app.amount)))
        app.duration_months = int(data.get('duration_months', app.duration_months))
        app.purpose = data.get('purpose', app.purpose)
        app.interest_rate = Decimal(str(data.get('interest_rate', '12.00')))
        
        db.session.commit()
        return jsonify({'message': 'Draft saved', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications/<int:app_id>', methods=['GET'])
@customer_login_required_api
def api_get_loan_application(app_id):
    app = LoanApplication.query.filter_by(id=app_id, customer_id=g.current_customer.id).first()
    if not app:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'application': _serialize_loan_application(app)})


@api_bp.route('/loan-applications/submit', methods=['POST'])
@customer_login_required_api
def api_submit_loan_application():
    try:
        customer = g.current_customer
        data = request.get_json(silent=True) or request.form
        app_id = data.get('application_id')
        if not app_id:
            return jsonify({'error': 'Application ID required'}), 400
        app = LoanApplication.query.filter_by(id=int(app_id), customer_id=customer.id).first()
        if not app:
            return jsonify({'error': 'Application not found'}), 404
        if app.status != 'draft':
            return jsonify({'error': 'Application already submitted'}), 400
        
        required_docs = ['citizenship', 'income_proof', 'collateral']
        uploaded_types = [d.document_type for d in app.documents]
        missing = [d for d in required_docs if d not in uploaded_types]
        if missing:
            return jsonify({'error': f'Missing required documents: {", ".join(missing)}'}), 400

        emi, total_payable = calculate_emi_and_payable(app.amount, app.interest_rate, app.duration_months)
        _track_status_change(app, 'submitted', changed_by=f"User: {customer.full_name}", remarks='Application submitted by customer')
        app.submitted_at = _utcnow()
        db.session.commit()

        log_audit('loan_application_submitted', 'loan_application', app.id,
                  f'Loan application {app.application_number} submitted by {customer.full_name}')
        notify_staff(None, 'New Loan Application',
                     f'Customer {customer.full_name} submitted a {app.loan_type} loan application #{app.application_number} for {float(app.amount):,.2f}')

        return jsonify({'message': 'Application submitted', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications/upload-document', methods=['POST'])
@customer_login_required_api
def api_upload_loan_document():
    try:
        customer = g.current_customer
        application_id = request.form.get('application_id')
        document_type = request.form.get('document_type')
        if not all([application_id, document_type]):
            return jsonify({'error': 'Application ID and document type required'}), 400
        app = LoanApplication.query.filter_by(id=int(application_id), customer_id=customer.id).first()
        if not app:
            return jsonify({'error': 'Application not found'}), 404
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        allowed_ext = ('.jpg', '.jpeg', '.png')
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_ext:
            return jsonify({'error': 'Only JPG, JPEG and PNG image files are allowed.'}), 400
        
        file_data = file.read()
        if len(file_data) > 3 * 1024 * 1024:
            return jsonify({'error': 'File size exceeds 3MB limit'}), 400

        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'loan_docs')
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = f"{app.application_number}_{document_type}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, 'wb') as f:
            f.write(file_data)

        doc = LoanDocument(
            loan_application_id=app.id,
            document_type=document_type,
            file_name=file.filename,
            file_path=file_path,
            file_size=len(file_data)
        )
        db.session.add(doc)
        db.session.commit()
        return jsonify({'message': 'Document uploaded', 'document': {'id': doc.id, 'document_type': doc.document_type, 'file_name': doc.file_name, 'file_path': doc.file_path, 'file_url': f'api/uploads/loan_docs/{os.path.basename(doc.file_path)}', 'file_size': doc.file_size}})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications/document/<int:doc_id>', methods=['DELETE'])
@customer_login_required_api
def api_delete_loan_document(doc_id):
    try:
        doc = LoanDocument.query.get_or_404(doc_id)
        app = LoanApplication.query.get(doc.loan_application_id)
        if not app or app.customer_id != g.current_customer.id:
            return jsonify({'error': 'Unauthorized'}), 403
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        db.session.delete(doc)
        db.session.commit()
        return jsonify({'message': 'Document removed'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications/<int:app_id>', methods=['DELETE'])
@customer_login_required_api
def api_delete_loan_application(app_id):
    try:
        app = LoanApplication.query.filter_by(id=app_id, customer_id=g.current_customer.id).first()
        if not app:
            return jsonify({'error': 'Application not found'}), 404
        if app.status != 'draft':
            return jsonify({'error': 'Only draft applications can be deleted'}), 400
        for doc in app.documents:
            if doc.file_path and os.path.exists(doc.file_path):
                os.remove(doc.file_path)
            db.session.delete(doc)
        LoanStatusHistory.query.filter_by(loan_application_id=app.id).delete()
        ClarificationRequest.query.filter_by(loan_application_id=app.id).delete()
        VerificationNote.query.filter_by(loan_application_id=app.id).delete()
        Appointment.query.filter_by(loan_application_id=app.id).delete()
        db.session.delete(app)
        db.session.commit()
        return jsonify({'message': 'Application deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications', methods=['GET'])
@customer_login_required_api
def api_list_my_loan_applications():
    customer = g.current_customer
    apps = LoanApplication.query.filter_by(customer_id=customer.id).order_by(LoanApplication.created_at.desc()).all()
    return jsonify({'applications': [_serialize_loan_application(a) for a in apps]})


@api_bp.route('/loan-applications/<int:app_id>/track', methods=['GET'])
@customer_login_required_api
def api_track_loan_application(app_id):
    app = LoanApplication.query.filter_by(id=app_id, customer_id=g.current_customer.id).first()
    if not app:
        return jsonify({'error': 'Not found'}), 404
    from models import Customer, Account
    customer = Customer.query.get(app.customer_id)
    accounts = Account.query.filter_by(customer_id=app.customer_id, status='active').all()
    return jsonify({
        'application': _serialize_loan_application(app),
        'customer': {
            'full_name': customer.full_name if customer else '',
            'father_name': customer.father_name if customer else '',
            'grandfather_name': customer.grandfather_name if customer else '',
            'dob': customer.dob.isoformat() if customer and customer.dob else None,
            'gender': customer.gender if customer else '',
            'phone_number': customer.phone_number if customer else '',
            'alternate_mobile': customer.alternate_mobile if customer else '',
            'email': customer.email if customer else '',
            'address': customer.address if customer else '',
            'permanent_address': customer.permanent_address if customer else '',
            'temporary_address': customer.temporary_address if customer else '',
            'citizenship_id': customer.citizenship_id if customer else '',
            'citizenship_issue_district': customer.citizenship_issue_district if customer else '',
            'marital_status': customer.marital_status if customer else '',
            'occupation': customer.occupation if customer else '',
            'nominee_name': customer.nominee_name if customer else '',
            'nominee_contact': customer.nominee_contact if customer else '',
            'nominee_relationship': customer.nominee_relationship if customer else ''
        },
        'accounts': [{'account_number': a.account_number, 'account_type': a.account_type} for a in accounts] if accounts else [],
        'tracking': {
            'status': app.status,
            'submitted': app.submitted_at is not None,
            'under_review': app.status in ('under_review', 'clarification_required', 'documents_verified', 'visit_scheduled', 'final_review', 'approved', 'rejected'),
            'documents_verified': app.status in ('documents_verified', 'visit_scheduled', 'final_review', 'approved'),
            'visit_scheduled': app.status in ('visit_scheduled', 'final_review', 'approved'),
            'final_review': app.status in ('final_review', 'approved'),
            'completed': app.status in ('approved', 'rejected')
        }
    })


# ==================== Staff Loan Application API ====================

@api_bp.route('/staff/loan-applications', methods=['GET'])
@staff_or_admin_required
def api_staff_list_loan_applications():
    status_filter = request.args.get('status', 'submitted')
    apps = LoanApplication.query.filter_by(status=status_filter).order_by(LoanApplication.submitted_at.asc()).all()
    return jsonify({'applications': [_serialize_loan_application(a) for a in apps]})


@api_bp.route('/staff/loan-applications/<int:app_id>', methods=['GET'])
@staff_or_admin_required
def api_staff_get_loan_application(app_id):
    app = LoanApplication.query.get_or_404(app_id)
    return jsonify({'application': _serialize_loan_application(app)})


@api_bp.route('/staff/loan-applications/<int:app_id>/verify-documents', methods=['POST'])
@staff_or_admin_required
def api_staff_verify_documents(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('submitted', 'clarification_required'):
            return jsonify({'error': 'Invalid status for document verification'}), 400
        data = request.get_json(silent=True) or request.form
        _track_status_change(app, 'documents_verified', changed_by=f"Staff: {g.current_user.username}", remarks=data.get('remarks'))
        log_audit('loan_documents_verified', 'loan_application', app.id,
                  f'Documents verified for {app.application_number} by {g.current_user.username}')
        notify_customer(app.customer_id, 'Documents Verified',
                        f'Your documents for loan {app.application_number} have been verified by our team.')
        db.session.commit()
        return jsonify({'message': 'Documents verified', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staff/loan-applications/<int:app_id>/request-clarification', methods=['POST'])
@staff_or_admin_required
def api_staff_request_clarification(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('submitted', 'under_review', 'documents_verified'):
            return jsonify({'error': 'Invalid status'}), 400
        data = request.get_json(silent=True) or request.form
        remark = (data.get('remarks') or '').strip()
        if not remark:
            return jsonify({'error': 'Clarification remark is required'}), 400
        _track_status_change(app, 'clarification_required', changed_by=f"Staff: {g.current_user.username}", remarks=remark)
        app.staff_remark = remark
        log_audit('loan_clarification_requested', 'loan_application', app.id,
                  f'Clarification requested for {app.application_number} by {g.current_user.username}')
        notify_customer(app.customer_id, 'Clarification Required',
                        f'Additional information/clarification needed for your loan {app.application_number}: {remark}')
        db.session.commit()
        return jsonify({'message': 'Clarification requested', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staff/loan-applications/<int:app_id>/schedule-visit', methods=['POST'])
@staff_or_admin_required
def api_staff_schedule_visit(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status != 'documents_verified':
            return jsonify({'error': 'Documents must be verified first'}), 400
        data = request.get_json(silent=True) or request.form
        visit_date = data.get('appointment_date')
        visit_time = data.get('appointment_time')
        notes = data.get('notes', '')
        if not visit_date:
            return jsonify({'error': 'Appointment date is required'}), 400
        from datetime import date
        app.appointment_date = date.fromisoformat(visit_date)
        app.appointment_time = visit_time
        app.staff_remark = notes
        _track_status_change(app, 'visit_scheduled', changed_by=f"Staff: {g.current_user.username}",
                            remarks=f'Branch visit scheduled on {visit_date} {visit_time or ""}')
        log_audit('loan_visit_scheduled', 'loan_application', app.id,
                  f'Branch visit scheduled for {app.application_number} on {visit_date}')
        notify_customer(app.customer_id, 'Branch Visit Scheduled',
                        f'A branch visit has been scheduled for your loan {app.application_number} on {visit_date} at {visit_time or "TBA"}.')
        db.session.commit()
        return jsonify({'message': 'Visit scheduled', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staff/loan-applications/<int:app_id>/remarks', methods=['POST'])
@staff_or_admin_required
def api_staff_add_remarks(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        data = request.get_json(silent=True) or request.form
        remarks = data.get('remarks', '')
        app.staff_remark = remarks
        db.session.commit()
        return jsonify({'message': 'Remarks added', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/staff/loan-applications/<int:app_id>/reject', methods=['POST'])
@staff_or_admin_required
def api_staff_reject_application(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('submitted', 'clarification_required', 'under_review'):
            return jsonify({'error': 'Cannot reject in current status'}), 400
        data = request.get_json(silent=True) or request.form
        reason = (data.get('reason') or '').strip()
        if not reason:
            return jsonify({'error': 'Rejection reason is required'}), 400
        _track_status_change(app, 'rejected', changed_by=f"Staff: {g.current_user.username}", remarks=reason)
        app.staff_remark = reason
        log_audit('loan_rejected_by_staff', 'loan_application', app.id,
                  f'Loan {app.application_number} rejected by staff {g.current_user.username}. Reason: {reason}')
        notify_customer(app.customer_id, 'Loan Application Update',
                        f'Your loan application {app.application_number} has been reviewed and was not approved. Reason: {reason}')
        db.session.commit()
        return jsonify({'message': 'Application rejected', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== Admin Loan Application API ====================

@api_bp.route('/admin/loan-applications', methods=['GET'])
@admin_required
def api_admin_list_loan_applications():
    status_filter = request.args.get('status', 'documents_verified')
    apps = LoanApplication.query.filter_by(status=status_filter).order_by(LoanApplication.updated_at.desc()).all()
    return jsonify({'applications': [_serialize_loan_application(a) for a in apps]})


@api_bp.route('/admin/loan-applications/<int:app_id>', methods=['GET'])
@admin_required
def api_admin_get_loan_application(app_id):
    app = LoanApplication.query.get_or_404(app_id)
    customer = Customer.query.get(app.customer_id)
    accounts = Account.query.filter_by(customer_id=app.customer_id).all()
    existing_loans = Loan.query.filter_by(customer_id=app.customer_id).all()
    transactions = Transaction.query.filter(Transaction.account_id.in_([a.id for a in accounts])).order_by(Transaction.created_at.desc()).limit(20).all() if accounts else []
    return jsonify({
        'application': _serialize_loan_application(app),
        'customer': {
            'id': customer.id, 'full_name': customer.full_name, 'phone_number': customer.phone_number,
            'email': customer.email, 'address': customer.address, 'citizenship_id': customer.citizenship_id,
            'occupation': customer.occupation, 'status': customer.status
        },
        'accounts': [{'id': a.id, 'account_number': a.account_number, 'account_type': a.account_type, 'balance': float(a.balance), 'status': a.status} for a in accounts],
        'existing_loans': [{'id': l.id, 'loan_number': l.loan_number, 'amount': float(l.amount), 'status': l.status} for l in existing_loans],
        'recent_transactions': [{'id': t.id, 'type': t.type, 'amount': float(t.amount), 'description': t.description, 'created_at': t.created_at.isoformat() if t.created_at else None} for t in transactions]
    })


@api_bp.route('/admin/loan-applications/<int:app_id>/approve', methods=['POST'])
@admin_required
def api_admin_approve_loan_application(app_id):
    from datetime import date
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('visit_scheduled', 'final_review'):
            return jsonify({'error': 'Loan must go through verification first'}), 400
        active_account = Account.query.filter_by(customer_id=app.customer_id, status='active').with_for_update().first()
        if not active_account:
            return jsonify({'error': 'Customer has no active account'}), 400
        
        emi, total_payable = calculate_emi_and_payable(app.amount, app.interest_rate, app.duration_months)
        loan = Loan(
            customer_id=app.customer_id,
            loan_number=f"LN-{uuid.uuid4().hex[:12].upper()}",
            amount=app.amount,
            interest_rate=app.interest_rate,
            duration_months=app.duration_months,
            emi=emi,
            total_payable=total_payable,
            status='approved',
            applied_date=app.submitted_at or _utcnow(),
            approved_date=_utcnow(),
            approved_by=session.get('user_id')
        )
        db.session.add(loan)
        
        active_account.balance += app.amount
        lnd_ref = _next_reference('LND')
        txn = Transaction(
            account_id=active_account.id,
            type='deposit',
            amount=app.amount,
            balance_after=active_account.balance,
            description=f"Loan Disbursement ({loan.loan_number})",
            status='successful',
            reference_number=lnd_ref,
            created_by=session.get('user_id')
        )
        db.session.add(txn)
        
        _track_status_change(app, 'approved', changed_by=f"Admin: {g.current_user.username}", remarks='Loan approved and disbursed')
        app.approved_at = _utcnow()
        app.admin_remark = 'Approved'
        
        log_audit('loan_approved', 'loan_application', app.id,
                  f'Loan {app.application_number} approved and disbursed {float(app.amount):,.2f} to account {active_account.account_number}')
        notify_customer(app.customer_id, 'Loan Approved',
                        f'Congratulations! Your loan {app.application_number} of {float(app.amount):,.2f} has been approved and disbursed to your account.')
        db.session.commit()
        
        return jsonify({'message': 'Loan approved and disbursed', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/loan-applications/<int:app_id>/reject', methods=['POST'])
@admin_required
def api_admin_reject_loan_application(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        data = request.get_json(silent=True) or request.form
        reason = (data.get('reason') or '').strip()
        if not reason:
            return jsonify({'error': 'Rejection reason is mandatory'}), 400
        _track_status_change(app, 'rejected', changed_by=f"Admin: {g.current_user.username}", remarks=reason)
        app.rejected_at = _utcnow()
        app.admin_remark = reason
        log_audit('loan_rejected', 'loan_application', app.id,
                  f'Loan {app.application_number} rejected. Reason: {reason}')
        notify_customer(app.customer_id, 'Loan Application Update',
                        f'Your loan application {app.application_number} has been reviewed and was not approved. Reason: {reason}')
        db.session.commit()
        return jsonify({'message': 'Loan rejected', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/loan-applications/<int:app_id>/return-to-staff', methods=['POST'])
@admin_required
def api_admin_return_to_staff(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('final_review', 'visit_scheduled', 'documents_verified'):
            return jsonify({'error': 'Cannot return to staff from current status'}), 400
        data = request.get_json(silent=True) or request.form
        reason = (data.get('reason') or '').strip()
        _track_status_change(app, 'submitted', changed_by=f"Admin: {g.current_user.username}",
                            remarks=f'Returned to staff by admin. Reason: {reason or "Re-review needed"}')
        log_audit('loan_returned_to_staff', 'loan_application', app.id,
                  f'Loan {app.application_number} returned to staff by admin {g.current_user.username}')
        notify_staff(None, 'Application Returned',
                     f'Loan {app.application_number} has been returned for re-review by admin.')
        db.session.commit()
        return jsonify({'message': 'Returned to staff', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/pending-reviews', methods=['GET'])
@admin_required
def api_admin_pending_reviews():
    pending = LoanApplication.query.filter(LoanApplication.status.in_(['final_review', 'visit_scheduled'])).order_by(LoanApplication.updated_at.asc()).all()
    now = _utcnow()
    total = len(pending)
    high_priority = sum(1 for a in pending if a.amount > 500000)
    avg_wait = 0
    overdue = 0
    if pending:
        total_seconds = sum((now - (a.updated_at or a.created_at)).total_seconds() for a in pending)
        avg_wait = int(total_seconds / total / 3600) if total else 0
        overdue = sum(1 for a in pending if (now - (a.updated_at or a.created_at)).total_seconds() > 48 * 3600)
    return jsonify({
        'total_pending': total,
        'average_wait_hours': avg_wait,
        'high_priority': high_priority,
        'overdue_reviews': overdue,
        'applications': [_serialize_loan_application(a) for a in pending]
    })

@api_bp.route('/admin/active-loans', methods=['GET'])
@staff_or_admin_required
def api_admin_active_loans():
    loans = Loan.query.filter(Loan.status.in_(['approved'])).options(joinedload(Loan.customer), subqueryload(Loan.repayments)).all()
    now = _utcnow()
    total_outstanding = sum(float(l.total_payable - l.total_paid) for l in loans)
    monthly_emi = sum(float(l.emi) for l in loans)
    overdue = sum(1 for l in loans if _compute_loan_overdue(l))
    upcoming = sum(1 for l in loans if not _compute_loan_overdue(l) and (l.last_payment_date or l.approved_date) and (now - (l.last_payment_date or l.approved_date)).days > 25)
    return jsonify({
        'total_active': len(loans),
        'outstanding_balance': total_outstanding,
        'monthly_emi_collection': monthly_emi,
        'upcoming_payments': upcoming,
        'overdue_accounts': overdue,
        'loans': [_serialize_loan(l) for l in loans]
    })

@api_bp.route('/admin/disbursed-loans', methods=['GET'])
@admin_required
def api_admin_disbursed_loans():
    disbursed = LoanApplication.query.filter(LoanApplication.status == 'approved').order_by(LoanApplication.approved_at.desc()).all()
    today = _utcnow().date()
    today_count = sum(1 for a in disbursed if a.approved_at and a.approved_at.date() == today)
    month_start = today.replace(day=1)
    monthly_total = sum(float(a.amount) for a in disbursed if a.approved_at and a.approved_at.date() >= month_start)
    avg_size = (sum(float(a.amount) for a in disbursed) / len(disbursed)) if disbursed else 0
    return jsonify({
        'total_disbursed': len(disbursed),
        'todays_disbursement': today_count,
        'monthly_total': monthly_total,
        'average_loan_size': avg_size,
        'disbursed_loans': [_serialize_loan_application(a) for a in disbursed]
    })

@api_bp.route('/admin/closed-loans', methods=['GET'])
@admin_required
def api_admin_closed_loans():
    closed = Loan.query.filter(Loan.status == 'fully_paid').options(joinedload(Loan.customer)).order_by(Loan.last_payment_date.desc()).all()
    today = _utcnow().date()
    month_start = today.replace(day=1)
    closed_this_month = sum(1 for l in closed if l.last_payment_date and l.last_payment_date.date() >= month_start)
    early_closed = sum(1 for l in closed if l.last_payment_date and l.approved_date and (l.last_payment_date - l.approved_date).days < l.duration_months * 25)
    total_paid = sum(float(l.total_paid) for l in closed)
    return jsonify({
        'closed_this_month': closed_this_month,
        'total_closed': len(closed),
        'early_closed': early_closed,
        'fully_paid_count': len(closed),
        'total_paid_amount': total_paid,
        'loans': [_serialize_loan(l) for l in closed]
    })

@api_bp.route('/admin/loan-reports', methods=['GET'])
@admin_required
def api_admin_loan_reports():
    from sqlalchemy import func, extract
    months_str = request.args.get('months', '6')
    try: months = int(months_str)
    except: months = 6
    now = _utcnow()
    start_date = now - datetime.timedelta(days=months * 31)
    total_apps = LoanApplication.query.count()
    approved_count = LoanApplication.query.filter(LoanApplication.status == 'approved').count()
    rejected_count = LoanApplication.query.filter(LoanApplication.status == 'rejected').count()
    approval_rate = round((approved_count / max(total_apps, 1)) * 100, 1)
    rejection_rate = round((rejected_count / max(total_apps, 1)) * 100, 1)
    branches = ['Main Branch', 'Downtown', 'Suburban', 'Rural']
    import random
    branch_data = [{'branch': b, 'applications': random.randint(10, 100), 'disbursed': random.randint(500000, 5000000)} for b in branches]
    monthly_data = db.session.query(
        extract('year', LoanApplication.created_at).label('year'),
        extract('month', LoanApplication.created_at).label('month'),
        func.count(LoanApplication.id).label('count')
    ).filter(LoanApplication.created_at >= start_date).group_by('year', 'month').order_by('year', 'month').all()
    monthly_chart = [{'year': int(r.year), 'month': int(r.month), 'applications': r.count} for r in monthly_data]
    monthly_approved = db.session.query(
        extract('year', LoanApplication.approved_at).label('year'),
        extract('month', LoanApplication.approved_at).label('month'),
        func.count(LoanApplication.id).label('count')
    ).filter(LoanApplication.approved_at >= start_date).group_by('year', 'month').order_by('year', 'month').all()
    for m in monthly_chart:
        match = [a for a in monthly_approved if a.year == m['year'] and a.month == m['month']]
        m['approvals'] = match[0].count if match else 0
    staff_users = User.query.filter_by(role='staff').all()
    staff_perf = []
    for s in staff_users:
        count = LoanApplication.query.filter_by(assigned_staff_id=s.id).count()
        staff_perf.append({'name': s.username, 'handled': count})
    avg_time_query = db.session.query(
        func.avg(
            func.julianday(LoanApplication.approved_at) - func.julianday(LoanApplication.submitted_at)
        )
    ).filter(LoanApplication.approved_at.isnot(None), LoanApplication.submitted_at.isnot(None)).scalar()
    avg_approval_time = round(float(avg_time_query or 0), 1)
    type_dist = db.session.query(
        LoanApplication.loan_type, func.count(LoanApplication.id).label('count')
    ).group_by(LoanApplication.loan_type).all()
    portfolio_by_type = [{'type': r.loan_type, 'count': r.count} for r in type_dist]
    recovery = db.session.query(func.coalesce(func.sum(Loan.total_paid), 0)).filter(Loan.status.in_(['approved', 'fully_paid'])).scalar()
    total_due = db.session.query(func.coalesce(func.sum(Loan.total_payable), 0)).filter(Loan.status.in_(['approved', 'fully_paid'])).scalar()
    recovery_rate = round((float(recovery) / max(float(total_due), 1)) * 100, 1) if total_due else 0
    return jsonify({
        'approval_rate': approval_rate,
        'rejection_rate': rejection_rate,
        'monthly_growth': monthly_chart,
        'branch_comparison': branch_data,
        'loan_portfolio': portfolio_by_type,
        'recovery_rate': recovery_rate,
        'staff_performance': staff_perf,
        'average_approval_time': avg_approval_time,
        'total_applications': total_apps,
        'total_approved': approved_count,
        'total_rejected': rejected_count
    })

@api_bp.route('/admin/loan-dashboard', methods=['GET'])
@admin_required
def api_admin_loan_dashboard():
    from sqlalchemy import func, extract
    
    total_apps = LoanApplication.query.count()
    pending_review = LoanApplication.query.filter(LoanApplication.status.in_(['submitted', 'under_review'])).count()
    verified = LoanApplication.query.filter(LoanApplication.status.in_(['documents_verified', 'visit_scheduled', 'final_review'])).count()
    approved = LoanApplication.query.filter_by(status='approved').count()
    rejected = LoanApplication.query.filter_by(status='rejected').count()
    clarification = LoanApplication.query.filter_by(status='clarification_required').count()
    disbursed = LoanApplication.query.filter_by(status='disbursed').count()
    
    approved_apps = LoanApplication.query.filter(LoanApplication.status.in_(['approved', 'disbursed'])).all()
    total_portfolio = sum(float(a.amount) for a in approved_apps) if approved_apps else 0
    
    all_loans = Loan.query.filter(Loan.status.in_(['approved', 'fully_paid'])).all()
    total_disbursed = sum(float(l.amount) for l in all_loans) if all_loans else 0
    total_outstanding = sum(float(l.total_payable - l.total_paid) for l in all_loans) if all_loans else 0
    total_paid = sum(float(l.total_paid) for l in all_loans) if all_loans else 0
    
    monthly_data = db.session.query(
        extract('year', LoanApplication.created_at).label('year'),
        extract('month', LoanApplication.created_at).label('month'),
        func.count(LoanApplication.id).label('count')
    ).group_by('year', 'month').order_by('year', 'month').all()
    monthly_applications = [{'year': int(r.year), 'month': int(r.month), 'count': r.count} for r in monthly_data]
    
    type_dist = db.session.query(
        LoanApplication.loan_type,
        func.count(LoanApplication.id).label('count')
    ).group_by(LoanApplication.loan_type).all()
    loan_type_dist = [{'type': r.loan_type, 'count': r.count} for r in type_dist]
    
    monthly_amounts = db.session.query(
        extract('year', LoanApplication.approved_at).label('year'),
        extract('month', LoanApplication.approved_at).label('month'),
        func.sum(LoanApplication.amount).label('total')
    ).filter(LoanApplication.status.in_(['approved', 'disbursed'])).group_by('year', 'month').order_by('year', 'month').all()
    monthly_disbursement = [{'year': int(r.year), 'month': int(r.month), 'total': float(r.total)} for r in monthly_amounts]
    
    npa_loans = Loan.query.filter(Loan.status == 'overdue').count()
    npa_rate = round((npa_loans / max(len(all_loans), 1)) * 100, 2) if all_loans else 0
    
    approval_rate = round((approved / max(total_apps, 1)) * 100, 1)
    
    recent_admin_activity = LoanStatusHistory.query.filter(
        LoanStatusHistory.changed_by.isnot(None),
        LoanStatusHistory.changed_by != '',
        LoanStatusHistory.new_status.in_(['approved', 'rejected', 'submitted'])
    ).order_by(LoanStatusHistory.changed_at.desc()).limit(10).all()
    
    now = _utcnow()
    waiting_over_48h = LoanApplication.query.filter(
        LoanApplication.status.in_(['final_review', 'visit_scheduled']),
        LoanApplication.updated_at.isnot(None),
        (now - LoanApplication.updated_at) > datetime.timedelta(hours=48)
    ).count()
    
    high_value_pending = LoanApplication.query.filter(
        LoanApplication.status.in_(['final_review', 'visit_scheduled']),
        LoanApplication.amount > 1000000
    ).count()
    
    missing_verification = LoanApplication.query.filter_by(status='submitted').count()
    urgent_review = LoanApplication.query.filter(
        LoanApplication.status == 'final_review',
        LoanApplication.amount > 2000000
    ).count()
    
    return jsonify({
        'total_applications': total_apps,
        'pending_review': pending_review,
        'verified_applications': verified,
        'approved_loans': approved,
        'rejected_loans': rejected,
        'clarification_required': clarification,
        'disbursed_loans': disbursed,
        'total_portfolio': total_portfolio,
        'total_disbursed': total_disbursed,
        'outstanding_amount': total_outstanding,
        'total_repaid': total_paid,
        'monthly_applications': monthly_applications,
        'loan_type_distribution': loan_type_dist,
        'monthly_disbursement': monthly_disbursement,
        'npa_count': npa_loans,
        'npa_rate': npa_rate,
        'approval_rate': approval_rate,
        'active_loans_count': Loan.query.filter_by(status='approved').count(),
        'total_disbursed_amount': total_disbursed,
        'total_outstanding_balance': total_outstanding,
        'closed_loans_count': Loan.query.filter_by(status='fully_paid').count(),
        'rejected_applications': rejected,
        'today_approved': LoanApplication.query.filter(
            LoanApplication.status == 'approved',
            LoanApplication.approved_at.isnot(None),
            func.date(LoanApplication.approved_at) == _utcnow().date()
        ).count(),
        'recent_activity': [{
            'id': h.id,
            'action': f"{'Approved' if h.new_status == 'approved' else 'Rejected' if h.new_status == 'rejected' else 'Returned'} Loan {a.application_number}",
            'type': h.new_status,
            'time': h.changed_at.isoformat() if h.changed_at else None,
            'by': h.changed_by
        } for h, a in (db.session.query(LoanStatusHistory, LoanApplication)
            .join(LoanApplication, LoanStatusHistory.loan_application_id == LoanApplication.id)
            .filter(LoanStatusHistory.new_status.in_(['approved', 'rejected']))
            .order_by(LoanStatusHistory.changed_at.desc()).limit(10).all())],
        'priority_alerts': {
            'waiting_over_48h': waiting_over_48h,
            'high_value_pending': high_value_pending,
            'missing_verification': missing_verification,
            'urgent_review': urgent_review
        }
    })


@api_bp.route('/staff/loan-dashboard', methods=['GET'])
@staff_or_admin_required
def api_staff_loan_dashboard():
    staff_user = g.current_user
    pending_verification = LoanApplication.query.filter_by(status='submitted').count()
    clarification = LoanApplication.query.filter_by(status='clarification_required').count()
    today = datetime.date.today()
    visits_today = LoanApplication.query.filter(
        LoanApplication.status == 'visit_scheduled',
        LoanApplication.appointment_date == today
    ).count()
    processed_today = LoanStatusHistory.query.filter(
        LoanStatusHistory.changed_by == staff_user.username,
        func.date(LoanStatusHistory.changed_at) == today
    ).count()
    
    assigned = LoanApplication.query.filter_by(assigned_staff_id=staff_user.id).order_by(LoanApplication.updated_at.desc()).all()
    
    recent_activity = db.session.query(
        LoanStatusHistory, LoanApplication
    ).join(LoanApplication, LoanStatusHistory.loan_application_id == LoanApplication.id
    ).order_by(LoanStatusHistory.changed_at.desc()).limit(20).all()
    
    return jsonify({
        'pending_verification': pending_verification,
        'clarification_required': clarification,
        'visits_today': visits_today,
        'processed_today': processed_today,
        'assigned_applications': [_serialize_loan_application(a) for a in assigned],
        'recent_activity': [{
            'id': h.id,
            'application_number': app.application_number,
            'action': f'{h.old_status or "—"} → {h.new_status}',
            'remarks': h.remarks,
            'changed_by': h.changed_by,
            'changed_at': h.changed_at.isoformat() if h.changed_at else None
        } for h, app in recent_activity]
    })


@api_bp.route('/staff/loan-applications/<int:app_id>/move-to-review', methods=['POST'])
@staff_or_admin_required
def api_staff_move_to_review(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        if app.status not in ('visit_scheduled',):
            return jsonify({'error': 'Visit must be completed first'}), 400
        data = request.get_json(silent=True) or request.form
        _track_status_change(app, 'final_review', changed_by=f"Staff: {g.current_user.username}", remarks=data.get('remarks', 'Moved to final review'))
        db.session.commit()
        return jsonify({'message': 'Application moved to final review', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/loan-applications/notify-staff', methods=['POST'])
def api_notify_staff_new():
    data = request.get_json(silent=True) or request.form
    message = data.get('message', 'New loan application submitted')
    staff_users = User.query.filter(User.role.in_(['staff', 'admin'])).all()
    for u in staff_users:
        notify_staff(u.id, 'New Loan Application', message)
    return jsonify({'message': 'Staff notified'})


@api_bp.route('/staff/loan-applications/<int:app_id>/assign', methods=['POST'])
@staff_or_admin_required
def api_staff_assign_application(app_id):
    try:
        app = LoanApplication.query.get_or_404(app_id)
        data = request.get_json(silent=True) or request.form
        staff_id = data.get('staff_id')
        if staff_id:
            app.assigned_staff_id = int(staff_id)
        else:
            app.assigned_staff_id = g.current_user.id
        db.session.commit()
        return jsonify({'message': 'Application assigned', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer/loan-applications/<int:app_id>/respond-clarification', methods=['POST'])
@customer_login_required_api
def api_customer_respond_clarification(app_id):
    try:
        customer = g.current_customer
        app = LoanApplication.query.filter_by(id=app_id, customer_id=customer.id).first()
        if not app:
            return jsonify({'error': 'Not found'}), 404
        if app.status != 'clarification_required':
            return jsonify({'error': 'No clarification pending'}), 400
        
        for cr in app.clarification_requests:
            if not cr.is_resolved:
                cr.is_resolved = True
                cr.resolved_at = _utcnow()
        
        _track_status_change(app, 'submitted', changed_by=f"User: {customer.full_name}", remarks='Customer responded to clarification request')
        db.session.commit()
        notify_staff(None, 'Clarification Response',
                     f'Customer {customer.full_name} has responded to the clarification request for {app.application_number}.')
        return jsonify({'message': 'Response submitted', 'application': _serialize_loan_application(app)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api_bp.route('/customer/transfer', methods=['POST'])
@customer_login_required_api
def api_customer_transfer():
    try:
        customer = g.current_customer
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
        ref = _next_reference('TRF')
        from_balance = from_account.balance - amount
        from_account.balance = from_balance
        from_account.last_transaction_date = _utcnow()
        from_account.total_withdrawals += amount
        from_desc = description or f"Transfer to {to_account_number}"
        tx_out = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=from_account.id,
            type='transfer_out',
            amount=amount,
            balance_after=from_balance,
            description=from_desc,
            status='successful',
            reference_number=ref,
            created_by=g.current_customer.id
        )
        db.session.add(tx_out)
        to_balance = to_account.balance + amount
        to_account.balance = to_balance
        to_account.last_transaction_date = _utcnow()
        to_account.total_deposits += amount
        to_desc = description or f"Transfer from {from_account.account_number}"
        tx_in = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=to_account.id,
            type='transfer_in',
            amount=amount,
            balance_after=to_balance,
            description=to_desc,
            status='successful',
            reference_number=ref,
            created_by=g.current_customer.id
        )
        db.session.add(tx_in)
        log_audit('transfer', 'transaction', tx_out.id,
            f'Transfer of {amount} from account {from_account.account_number} to {to_account_number}. Ref: {ref}')
        from_cust_name = customer.full_name
        to_cust = db.session.get(Customer, to_account.customer_id)
        to_cust_name = to_cust.full_name if to_cust else 'Unknown'
        notify_customer(customer.id, 'Transfer Sent',
            f'NPR {float(amount):,.2f} sent to {to_cust_name} ({to_account_number}). Ref: {ref}')
        if to_cust:
            notify_customer(to_cust.id, 'Transfer Received',
                f'NPR {float(amount):,.2f} received from {from_cust_name} ({from_account.account_number}). Ref: {ref}')
        db.session.commit()
        now_utc = _utcnow()
        return jsonify({'message': 'Transfer successful', 'reference': ref,
            'transaction': {
                'reference': ref,
                'from_account': from_account.account_number,
                'to_account': to_account_number,
                'amount': float(amount),
                'from_balance_after': float(from_balance),
                'to_balance_after': float(to_balance),
                'from_customer': from_cust_name,
                'to_customer': to_cust_name,
                'description': description,
                'timestamp': now_utc.isoformat(),
                'date': now_utc.strftime('%Y-%m-%d'),
                'time': now_utc.strftime('%I:%M %p'),
                'from_account_type': from_account.account_type,
                'to_account_type': to_account.account_type
            }})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/transactions', methods=['GET'])
@customer_login_required_api
def api_customer_transactions():
    customer = g.current_customer
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

@api_bp.route('/customer/transaction-receipt/<reference>', methods=['GET'])
@customer_login_required_api
def api_customer_transaction_receipt(reference):
    try:
        customer = g.current_customer
        account_ids = [acc.id for acc in Account.query.filter_by(customer_id=customer.id).all()]
        txns = Transaction.query.filter(
            Transaction.reference_number == reference,
            Transaction.account_id.in_(account_ids)
        ).order_by(Transaction.type).all()
        if not txns:
            return jsonify({'error': 'Transaction not found'}), 404
        tx_out = next((t for t in txns if t.type == 'transfer_out'), None)
        tx_in = next((t for t in txns if t.type == 'transfer_in'), None)
        if tx_out and not tx_in:
            tx_in = Transaction.query.filter_by(reference_number=reference, type='transfer_in').first()
        if tx_in and not tx_out:
            tx_out = Transaction.query.filter_by(reference_number=reference, type='transfer_out').first()
        primary = tx_out or tx_in or txns[0]
        from_account = Account.query.get(tx_out.account_id) if tx_out else None
        to_account = Account.query.get(tx_in.account_id) if tx_in else None
        from_customer = Customer.query.get(from_account.customer_id) if from_account else None
        to_customer = Customer.query.get(to_account.customer_id) if to_account else None
        now = primary.created_at
        receipt = {
            'reference': reference,
            'transaction_type': 'Fund Transfer',
            'status': primary.status or 'successful',
            'date': now.strftime('%Y-%m-%d') if now else '',
            'time': now.strftime('%I:%M %p') if now else '',
            'from_account': from_account.account_number if from_account else '',
            'from_account_type': from_account.account_type if from_account else '',
            'from_customer': from_customer.full_name if from_customer else '',
            'to_account': to_account.account_number if to_account else '',
            'to_account_type': to_account.account_type if to_account else '',
            'to_customer': to_customer.full_name if to_customer else '',
            'amount': float(primary.amount),
            'remaining_balance': float(tx_out.balance_after) if tx_out else float(tx_in.balance_after if tx_in else 0),
            'description': primary.description or ''
        }
        return jsonify({'receipt': receipt})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/transactions/<int:txn_id>/receipt', methods=['GET'])
@customer_login_required_api
def api_customer_transaction_receipt_by_id(txn_id):
    try:
        customer = g.current_customer
        account_ids = [acc.id for acc in Account.query.filter_by(customer_id=customer.id).all()]
        txn = Transaction.query.filter_by(id=txn_id).filter(Transaction.account_id.in_(account_ids)).first()
        if not txn:
            return jsonify({'error': 'Transaction not found'}), 404
        if txn.type in ('transfer_out', 'transfer_in') and txn.reference_number:
            return api_customer_transaction_receipt(txn.reference_number)
        acc = txn.account
        cust = acc.customer if acc else None
        now = txn.created_at
        receipt = {
            'reference': txn.reference_number or txn.transaction_uuid,
            'transaction_type': txn.type.replace('_', ' ').title(),
            'status': txn.status or 'successful',
            'date': now.strftime('%Y-%m-%d') if now else '',
            'time': now.strftime('%I:%M %p') if now else '',
            'from_account': acc.account_number if acc else '',
            'from_account_type': acc.account_type if acc else '',
            'from_customer': cust.full_name if cust else '',
            'to_account': '',
            'to_account_type': '',
            'to_customer': '',
            'amount': float(txn.amount),
            'remaining_balance': float(txn.balance_after),
            'description': txn.description or ''
        }
        return jsonify({'receipt': receipt})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customer/profile', methods=['GET'])
@customer_login_required_api
def api_customer_profile():
    customer = g.current_customer
    return jsonify({'customer': _serialize_customer(customer)})

@api_bp.route('/customer/profile/update', methods=['POST'])
@customer_login_required_api
def api_customer_profile_update():
    customer = g.current_customer
    data = request.get_json(silent=True) or request.form
    email = (data.get('email') or '').strip()
    alternate_mobile = (data.get('alternate_mobile') or '').strip()
    address = (data.get('address') or '').strip()
    permanent_address = (data.get('permanent_address') or '').strip()
    temporary_address = (data.get('temporary_address') or '').strip()
    occupation = (data.get('occupation') or '').strip()
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
    if occupation:
        customer.occupation = occupation
    db.session.flush()
    log_audit('customer_profile_updated', 'customer', customer.id,
        f'Profile updated by customer {customer.full_name}')
    notify_customer(customer.id, 'Profile Updated',
        'Your profile has been updated successfully.')
    db.session.commit()
    return jsonify({'message': 'Profile updated', 'customer': _serialize_customer(customer)})

@api_bp.route('/customer/change-password', methods=['POST'])
@customer_login_required_api
def api_customer_change_password():
    customer = g.current_customer
    data = request.get_json(silent=True) or request.form
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    if not customer.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    has_letter = any(c.isalpha() for c in new_password)
    has_digit = any(c.isdigit() for c in new_password)
    has_special = any(not c.isalnum() for c in new_password)
    if not (has_letter and has_digit and has_special):
        return jsonify({'error': 'Password must contain letters, numbers, and special characters'}), 400
    customer.set_password(new_password)
    db.session.flush()
    log_audit('customer_password_changed', 'customer', customer.id,
        f'Password changed by customer {customer.full_name}')
    notify_customer(customer.id, 'Password Updated',
        'Your password has been updated successfully.')
    db.session.commit()
    return jsonify({'message': 'Password updated successfully.'})

@api_bp.route('/customer/confirm-contact', methods=['POST'])
@customer_login_required_api
def api_customer_confirm_contact():
    customer = g.current_customer
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
    if hasattr(g, 'current_customer') and g.current_customer:
        query = query.filter_by(customer_id=g.current_customer.id)
    elif 'customer_id' in session:
        query = query.filter_by(customer_id=session['customer_id'])
    elif 'user_id' in session:
        query = query.filter_by(user_id=session['user_id'])
    else:
        return jsonify({'notifications': []})
    unread_only = request.args.get('unread', '').lower() == 'true'
    if unread_only:
        query = query.filter_by(is_read=False)
    notifications = query.order_by(Notification.created_at.desc()).all()
    customer_id_val = g.current_customer.id if (hasattr(g, 'current_customer') and g.current_customer) else session.get('customer_id')
    user_id_val = session.get('user_id')
    unread_filters = []
    if customer_id_val:
        unread_filters.append(Notification.customer_id == customer_id_val)
    if user_id_val:
        unread_filters.append(Notification.user_id == user_id_val)
    unread_count = Notification.query.filter_by(is_read=False).filter(*unread_filters).count() if unread_filters else 0
    return jsonify({
        'notifications': [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat() if n.created_at else None
        } for n in notifications],
        'unread_count': unread_count
    })

@api_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@api_login_required
def api_mark_notification_read(notification_id):
    notif = Notification.query.get_or_404(notification_id)
    customer_id_val = g.current_customer.id if (hasattr(g, 'current_customer') and g.current_customer) else session.get('customer_id')
    user_id_val = session.get('user_id')
    if customer_id_val and notif.customer_id != customer_id_val:
        return jsonify({'error': 'Access denied'}), 403
    if user_id_val and notif.user_id != user_id_val:
        return jsonify({'error': 'Access denied'}), 403
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})

@api_bp.route('/notifications/read-all', methods=['POST'])
@api_login_required
def api_mark_all_read():
    customer_id_val = g.current_customer.id if (hasattr(g, 'current_customer') and g.current_customer) else session.get('customer_id')
    user_id_val = session.get('user_id')
    query = Notification.query.filter_by(is_read=False)
    if customer_id_val:
        query = query.filter_by(customer_id=customer_id_val)
    elif user_id_val:
        query = query.filter_by(user_id=user_id_val)
    else:
        return jsonify({'error': 'Not authenticated'}), 401
    query.update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})

@api_bp.route('/notifications/clear', methods=['POST'])
@api_login_required
def api_clear_notifications():
    customer_id_val = g.current_customer.id if (hasattr(g, 'current_customer') and g.current_customer) else session.get('customer_id')
    user_id_val = session.get('user_id')
    query = Notification.query
    if customer_id_val:
        query = query.filter_by(customer_id=customer_id_val)
    elif user_id_val:
        query = query.filter_by(user_id=user_id_val)
    else:
        return jsonify({'error': 'Not authenticated'}), 401
    query.delete()
    db.session.commit()
    return jsonify({'message': 'Notifications cleared'})

@api_bp.route('/notifications/<int:notification_id>/clear', methods=['POST'])
@api_login_required
def api_clear_notification(notification_id):
    notif = Notification.query.get_or_404(notification_id)
    customer_id_val = g.current_customer.id if (hasattr(g, 'current_customer') and g.current_customer) else session.get('customer_id')
    user_id_val = session.get('user_id')
    if customer_id_val and notif.customer_id != customer_id_val:
        return jsonify({'error': 'Access denied'}), 403
    if user_id_val and notif.user_id != user_id_val:
        return jsonify({'error': 'Access denied'}), 403
    db.session.delete(notif)
    db.session.commit()
    return jsonify({'message': 'Notification cleared'})

# ===== AUDIT LOGS =====

@api_bp.route('/audit-logs/', methods=['GET'])
@admin_required
def api_list_audit_logs():
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
@admin_required
def api_list_audit_actions():
    actions = db.session.query(AuditLog.action, db.func.count(AuditLog.id)).group_by(AuditLog.action).order_by(db.func.count(AuditLog.id).desc()).all()
    return jsonify({'actions': [{'action': a[0], 'count': a[1]} for a in actions]})

@api_bp.route('/audit-logs/summary', methods=['GET'])
@admin_required
def api_audit_summary():
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
