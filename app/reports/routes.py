import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from app.database import db
from app.models import Customer, Account, Transaction, Loan, Repayment
from app.auth.routes import login_required

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/')
def index():
    return redirect(url_for('reports.dashboard'))

@reports_bp.route('/dashboard')
@login_required
def dashboard():
    # 1. Total Customers
    total_customers = Customer.query.filter_by(status='active').count()

    # 2. Total Current Deposits (Sum of active account balances)
    total_deposits_balance = db.session.query(db.func.sum(Account.balance))\
        .filter(Account.status == 'active').scalar() or 0.00

    # 3. Total Transaction Volume Metrics (Historical deposits/withdrawals)
    total_deposits_volume = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'deposit').scalar() or 0.00
    
    total_withdrawals_volume = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'withdrawal').scalar() or 0.00

    # FIX: Convert Decimal to float to avoid type errors when adding
    total_deposits_volume = float(total_deposits_volume)
    total_withdrawals_volume = float(total_withdrawals_volume)

    # 4. Active Loans (Approved and not fully paid)
    active_loans_count = Loan.query.filter(Loan.status == 'approved').count()
    total_loan_receivable = db.session.query(db.func.sum(Loan.total_payable - Loan.total_paid))\
        .filter(Loan.status == 'approved').scalar() or 0.00

    # 5. Recent 5 Transactions
    recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()

    # 6. Chart Analytics: Deposits vs Withdrawals over the last 7 days
    today = datetime.datetime.utcnow().date()
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
        ).scalar() or 0.00
        
        wit = db.session.query(db.func.sum(Transaction.amount)).filter(
            Transaction.type == 'withdrawal',
            Transaction.created_at >= start_datetime,
            Transaction.created_at <= end_datetime
        ).scalar() or 0.00

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
        recent_transactions=recent_transactions,
        date_labels=date_labels,
        daily_deposits=daily_deposits,
        daily_withdrawals=daily_withdrawals
    )

@reports_bp.route('/reports')
@login_required
def reports():
    report_type = request.args.get('type', 'daily')
    today = datetime.datetime.utcnow().date()

    # Base contexts
    customers = Customer.query.filter_by(status='active').order_by(Customer.full_name).all()

    # 1. Daily Report
    daily_transactions = []
    daily_repayments = []
    daily_summary = {'deposits': 0.00, 'withdrawals': 0.00, 'repayments': 0.00}
    
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

        daily_summary['deposits'] = sum(float(t.amount) for t in daily_transactions if t.type == 'deposit')
        daily_summary['withdrawals'] = sum(float(t.amount) for t in daily_transactions if t.type == 'withdrawal')
        daily_summary['repayments'] = sum(float(r.amount) for r in daily_repayments)

    # 2. Monthly Report
    monthly_summary = {'deposits': 0.00, 'withdrawals': 0.00, 'repayments': 0.00}
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

        monthly_summary['deposits'] = sum(float(t.amount) for t in monthly_txns if t.type == 'deposit')
        monthly_summary['withdrawals'] = sum(float(t.amount) for t in monthly_txns if t.type == 'withdrawal')
        monthly_summary['repayments'] = sum(float(r.amount) for r in monthly_repays)
        monthly_transactions_count = len(monthly_txns) + len(monthly_repays)

    # 3. Customer-Wise Report
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
            pass

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