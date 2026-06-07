import functools
from decimal import Decimal
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g
from app.database import db
from app.models import Customer, Account, Transaction, Loan

customer_portal_bp = Blueprint('customer_portal', __name__,
                              url_prefix='/customer')

def customer_login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'customer_id' not in session:
            flash('Please log in to access your account.', 'danger')
            return redirect(url_for('customer_portal.login'))
        return f(*args, **kwargs)
    return decorated_function

@customer_portal_bp.before_app_request
def load_customer():
    customer_id = session.get('customer_id')
    if customer_id is None:
        g.customer = None
    else:
        g.customer = db.session.get(Customer, customer_id)
        if g.customer is None:
            session.clear()

@customer_portal_bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('customer_id'):
        return redirect(url_for('customer_portal.dashboard'))

    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password', '')

        customer = Customer.query.filter_by(username=username, status='active').first()

        if customer and customer.check_password(password):
            session.clear()
            session['customer_id'] = customer.id
            session['customer_name'] = customer.full_name
            flash(f'Welcome back, {customer.full_name}!', 'success')
            return redirect(url_for('customer_portal.dashboard'))
        else:
            error = 'Invalid username or password.'

    return render_template('customer/login.html', error=error)

@customer_portal_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('customer_portal.login'))

@customer_portal_bp.route('/')
@customer_portal_bp.route('/dashboard')
@customer_login_required
def dashboard():
    customer = g.customer
    accounts = Account.query.filter_by(customer_id=customer.id, status='active').all()

    total_balance = sum((acc.balance or Decimal('0')) for acc in accounts)
    total_deposits = Decimal('0')
    total_withdrawals = Decimal('0')

    account_ids = [acc.id for acc in accounts]
    if account_ids:
        deposits = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)) \
            .filter(Transaction.account_id.in_(account_ids), Transaction.type == 'deposit').scalar()
        withdrawals = db.session.query(db.func.coalesce(db.func.sum(Transaction.amount), 0)) \
            .filter(Transaction.account_id.in_(account_ids), Transaction.type == 'withdrawal').scalar()
        total_deposits = Decimal(str(deposits))
        total_withdrawals = Decimal(str(withdrawals))

    recent_transactions = Transaction.query \
        .filter(Transaction.account_id.in_(account_ids)) \
        .order_by(Transaction.created_at.desc()) \
        .limit(5).all()

    initials = ''.join(w[0].upper() for w in customer.full_name.split()[:2])

    return render_template('customer/dashboard.html',
        customer=customer,
        initials=initials,
        total_balance=total_balance,
        total_deposits=total_deposits,
        total_withdrawals=total_withdrawals,
        active_accounts=len(accounts),
        recent_transactions=recent_transactions,
        active_page='dashboard')

@customer_portal_bp.route('/accounts')
@customer_login_required
def accounts():
    customer = g.customer
    accounts_list = Account.query.filter_by(customer_id=customer.id).order_by(Account.created_at.desc()).all()
    initials = ''.join(w[0].upper() for w in customer.full_name.split()[:2])
    return render_template('customer/accounts.html',
        customer=customer,
        initials=initials,
        accounts=accounts_list,
        active_page='accounts')

@customer_portal_bp.route('/transactions')
@customer_login_required
def transactions():
    customer = g.customer
    account_ids = [acc.id for acc in Account.query.filter_by(customer_id=customer.id).all()]
    transactions_list = Transaction.query \
        .filter(Transaction.account_id.in_(account_ids)) \
        .order_by(Transaction.created_at.desc()) \
        .all()
    initials = ''.join(w[0].upper() for w in customer.full_name.split()[:2])
    return render_template('customer/transactions.html',
        customer=customer,
        initials=initials,
        transactions=transactions_list,
        active_page='transactions')

@customer_portal_bp.route('/loans')
@customer_login_required
def loans():
    customer = g.customer
    loans_list = Loan.query.filter_by(customer_id=customer.id).order_by(Loan.applied_date.desc()).all()
    initials = ''.join(w[0].upper() for w in customer.full_name.split()[:2])
    return render_template('customer/loans.html',
        customer=customer,
        initials=initials,
        loans=loans_list,
        active_page='loans')

@customer_portal_bp.route('/profile')
@customer_login_required
def profile():
    customer = g.customer
    initials = ''.join(w[0].upper() for w in customer.full_name.split()[:2])
    return render_template('customer/profile.html',
        customer=customer,
        initials=initials,
        active_page='profile')
