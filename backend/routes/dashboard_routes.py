import datetime
from decimal import Decimal
from flask import Blueprint, render_template, request, redirect, url_for, flash, g, session
from database.db import db
from models import Customer, Account, Transaction, Loan, Repayment
from middleware.authentication import login_required

reports_bp = Blueprint('reports', __name__, template_folder='../templates')

@reports_bp.route('/')
def index():
    if session.get('user_id'):
        return redirect(url_for('reports.dashboard'))
    return render_template('landing.html')

@reports_bp.route('/dashboard')
@login_required
def dashboard():
    total_customers = Customer.query.filter_by(status='active').count()

    total_deposits_balance = db.session.query(db.func.sum(Account.balance))\
        .filter(Account.status == 'active').scalar() or Decimal('0.00')

    total_deposits_volume = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'deposit').scalar() or Decimal('0.00')

    total_withdrawals_volume = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'withdrawal').scalar() or Decimal('0.00')

    active_loans_count = Loan.query.filter(Loan.status == 'approved').count()
    total_loan_receivable = db.session.query(db.func.sum(Loan.total_payable - Loan.total_paid))\
        .filter(Loan.status == 'approved').scalar() or Decimal('0.00')

    total_turnover = total_deposits_volume + total_withdrawals_volume

    recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()

    today = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).date()
    dates = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]

    date_labels = [d.strftime('%b %d') for d in dates]
    daily_deposits = []
    daily_withdrawals = []

    for d in dates:
        start_datetime = datetime.datetime.combine(d, datetime.time.min)
        end_datetime = datetime.datetime.combine(d, datetime.time.max)

        dep = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'deposit',
            Transaction.created_at >= start_datetime,
            Transaction.created_at <= end_datetime
        ).scalar() or Decimal('0.00')

        wit = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'withdrawal',
            Transaction.created_at >= start_datetime,
            Transaction.created_at <= end_datetime
        ).scalar() or Decimal('0.00')

        daily_deposits.append(float(dep))
        daily_withdrawals.append(float(wit))

    return render_template(
        'dashboard.html',
        total_customers=total_customers,
        total_deposits_balance=total_deposits_balance,
        total_deposits_volume=total_deposits_volume,
        total_withdrawals_volume=total_withdrawals_volume,
        active_loans_count=active_loans_count,
        total_loan_receivable=total_loan_receivable,
        total_turnover=total_turnover,
        recent_transactions=recent_transactions,
        date_labels=date_labels,
        daily_deposits=daily_deposits,
        daily_withdrawals=daily_withdrawals
    )

@reports_bp.route('/reports')
@login_required
def reports():
    report_type = request.args.get('type', 'daily')
    today = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).date()

    customers = Customer.query.filter_by(status='active').order_by(Customer.full_name).all()

    daily_transactions = []
    daily_repayments = []
    daily_summary = {'deposits': Decimal('0.00'), 'withdrawals': Decimal('0.00'), 'repayments': Decimal('0.00')}

    if report_type == 'daily':
        start = datetime.datetime.combine(today, datetime.time.min)
        end = datetime.datetime.combine(today, datetime.time.max)

        daily_transactions = Transaction.query.filter(
            Transaction.created_at >= start,
            Transaction.created_at <= end
        ).all()

        daily_repayments = Repayment.query.filter(
            Repayment.repayment_date >= start,
            Repayment.repayment_date <= end
        ).all()

        daily_summary['deposits'] = sum((t.amount for t in daily_transactions if t.type == 'deposit'), Decimal('0.00'))
        daily_summary['withdrawals'] = sum((t.amount for t in daily_transactions if t.type == 'withdrawal'), Decimal('0.00'))
        daily_summary['repayments'] = sum((r.amount for r in daily_repayments), Decimal('0.00'))

    monthly_summary = {'deposits': Decimal('0.00'), 'withdrawals': Decimal('0.00'), 'repayments': Decimal('0.00')}
    monthly_transactions_count = 0

    if report_type == 'monthly':
        start_of_month = datetime.datetime(today.year, today.month, 1)
        if today.month == 12:
            end_of_month = datetime.datetime(today.year + 1, 1, 1) - datetime.timedelta(seconds=1)
        else:
            end_of_month = datetime.datetime(today.year, today.month + 1, 1) - datetime.timedelta(seconds=1)

        monthly_txns = Transaction.query.filter(
            Transaction.created_at >= start_of_month,
            Transaction.created_at <= end_of_month
        ).all()

        monthly_repays = Repayment.query.filter(
            Repayment.repayment_date >= start_of_month,
            Repayment.repayment_date <= end_of_month
        ).all()

        monthly_summary['deposits'] = sum((t.amount for t in monthly_txns if t.type == 'deposit'), Decimal('0.00'))
        monthly_summary['withdrawals'] = sum((t.amount for t in monthly_txns if t.type == 'withdrawal'), Decimal('0.00'))
        monthly_summary['repayments'] = sum((r.amount for r in monthly_repays), Decimal('0.00'))
        monthly_transactions_count = len(monthly_txns) + len(monthly_repays)

    selected_customer = None
    customer_txns = []
    customer_loans = []
    customer_id_str = request.args.get('customer_id', '')

    if report_type == 'customer' and customer_id_str:
        try:
            customer_id = int(customer_id_str)
            selected_customer = Customer.query.get(customer_id)
            if selected_customer:
                acc_ids = [a.id for a in selected_customer.accounts]
                customer_txns = Transaction.query.filter(Transaction.account_id.in_(acc_ids))\
                    .order_by(Transaction.created_at.desc()).all()
                customer_loans = Loan.query.filter_by(customer_id=customer_id)\
                    .order_by(Loan.applied_date.desc()).all()
        except ValueError:
            flash('Invalid customer ID entered.', 'danger')

    return render_template(
        'reports.html',
        report_type=report_type,
        customers=customers,
        selected_customer=selected_customer,
        customer_txns=customer_txns,
        customer_loans=customer_loans,
        daily_transactions=daily_transactions,
        daily_repayments=daily_repayments,
        daily_summary=daily_summary,
        monthly_summary=monthly_summary,
        monthly_transactions_count=monthly_transactions_count,
        today=today
    )
