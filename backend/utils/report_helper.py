import datetime
from decimal import Decimal
from database.db import db
from models import Customer, Account, Transaction, Loan, Repayment, LoanApplication

_NPT = datetime.timezone(datetime.timedelta(hours=5, minutes=45))
def _utcnow():
    return datetime.datetime.now(_NPT).replace(tzinfo=None)

def _get_date_range(report_type, year=None, quarter=None):
    today = _utcnow().date()
    if report_type == 'daily':
        start = datetime.datetime.combine(today, datetime.time.min)
        end = datetime.datetime.combine(today, datetime.time.max)
        label = today.isoformat()
    elif report_type == 'weekly':
        monday = today - datetime.timedelta(days=today.weekday())
        start = datetime.datetime.combine(monday, datetime.time.min)
        end = datetime.datetime.combine(monday + datetime.timedelta(days=6), datetime.time.max)
        label = f"Week of {monday.isoformat()}"
    elif report_type == 'monthly':
        y = year or today.year
        m = today.month if not year else 1
        start = datetime.datetime(y, m, 1)
        if m == 12:
            end = datetime.datetime(y + 1, 1, 1) - datetime.timedelta(seconds=1)
        else:
            end = datetime.datetime(y, m + 1, 1) - datetime.timedelta(seconds=1)
        label = f"{start.strftime('%B %Y')}"
    elif report_type == 'quarterly':
        y = year or today.year
        q = quarter or ((today.month - 1) // 3 + 1)
        start_month = (q - 1) * 3 + 1
        start = datetime.datetime(y, start_month, 1)
        if start_month + 3 > 12:
            end = datetime.datetime(y + 1, 1, 1) - datetime.timedelta(seconds=1)
        else:
            end = datetime.datetime(y, start_month + 3, 1) - datetime.timedelta(seconds=1)
        label = f"Q{q} {y}"
    elif report_type == 'yearly':
        y = year or today.year
        start = datetime.datetime(y, 1, 1)
        end = datetime.datetime(y + 1, 1, 1) - datetime.timedelta(seconds=1)
        label = f"Year {y}"
    else:
        start = datetime.datetime.combine(today, datetime.time.min)
        end = datetime.datetime.combine(today, datetime.time.max)
        label = today.isoformat()
    return start, end, label

def generate_deposit_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    txns = Transaction.query.filter(
        Transaction.type == 'deposit',
        Transaction.created_at >= start,
        Transaction.created_at <= end
    ).order_by(Transaction.created_at.desc()).all()
    total = sum((t.amount or Decimal('0')) for t in txns)
    count = len(txns)
    return {
        'type': 'deposit',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'total_amount': float(total),
        'count': count,
        'transactions': [serialize_txn_compact(t) for t in txns]
    }

def generate_withdrawal_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    txns = Transaction.query.filter(
        Transaction.type == 'withdrawal',
        Transaction.created_at >= start,
        Transaction.created_at <= end
    ).order_by(Transaction.created_at.desc()).all()
    total = sum((t.amount or Decimal('0')) for t in txns)
    count = len(txns)
    return {
        'type': 'withdrawal',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'total_amount': float(total),
        'count': count,
        'transactions': [serialize_txn_compact(t) for t in txns]
    }

def generate_loan_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    loans = Loan.query.filter(
        Loan.applied_date >= start,
        Loan.applied_date <= end
    ).order_by(Loan.applied_date.desc()).all()
    total_amount = sum((l.amount or Decimal('0')) for l in loans)
    approved = [l for l in loans if l.status == 'approved']
    pending = [l for l in loans if l.status == 'pending']
    rejected = [l for l in loans if l.status == 'rejected']
    return {
        'type': 'loan',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'total_applications': len(loans),
        'total_amount': float(total_amount),
        'approved_count': len(approved),
        'pending_count': len(pending),
        'rejected_count': len(rejected),
        'loans': [serialize_loan_compact(l) for l in loans]
    }

def generate_emi_collection_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    repayments = Repayment.query.filter(
        Repayment.repayment_date >= start,
        Repayment.repayment_date <= end
    ).order_by(Repayment.repayment_date.desc()).all()
    total = sum((r.amount or Decimal('0')) for r in repayments)
    count = len(repayments)
    return {
        'type': 'emi_collection',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'total_collected': float(total),
        'count': count,
        'repayments': [serialize_repayment_compact(r) for r in repayments]
    }

def generate_interest_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    loans = Loan.query.filter(
        Loan.status.in_(['approved', 'fully_paid']),
        Loan.approved_date >= start if report_type != 'daily' else Loan.approved_date >= start,
        Loan.approved_date <= end if report_type != 'daily' else Loan.approved_date <= end
    ).all()
    total_principal = sum((l.amount or Decimal('0')) for l in loans)
    total_payable = sum((l.total_payable or Decimal('0')) for l in loans)
    total_interest = total_payable - total_principal
    return {
        'type': 'interest',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'total_principal': float(total_principal),
        'total_payable': float(total_payable),
        'total_interest': float(max(0, total_interest)),
        'active_loans': len(loans)
    }

def generate_customer_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    customers = Customer.query.filter(
        Customer.created_at >= start,
        Customer.created_at <= end
    ).all()
    return {
        'type': 'customer',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'new_customers': len(customers),
        'customers': [serialize_customer_compact(c) for c in customers]
    }

def generate_account_report(report_type, year=None, quarter=None):
    start, end, label = _get_date_range(report_type, year, quarter)
    accounts = Account.query.filter(
        Account.created_at >= start,
        Account.created_at <= end
    ).all()
    total_balance = sum((a.balance or Decimal('0')) for a in accounts)
    by_type = {}
    for a in accounts:
        by_type[a.account_type] = by_type.get(a.account_type, 0) + 1
    return {
        'type': 'account',
        'period': label,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'new_accounts': len(accounts),
        'total_balance': float(total_balance),
        'accounts_by_type': by_type,
        'accounts': [serialize_account_compact(a) for a in accounts]
    }

def generate_customer_summary(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return None
    accounts = Account.query.filter_by(customer_id=customer.id).all()
    loans = Loan.query.filter_by(customer_id=customer.id).order_by(Loan.applied_date.desc()).all()
    acc_ids = [a.id for a in accounts]
    transactions = Transaction.query.filter(Transaction.account_id.in_(acc_ids)).order_by(Transaction.created_at.desc()).limit(50).all() if acc_ids else []
    repayments = Repayment.query.filter(Repayment.loan_id.in_([l.id for l in loans])).order_by(Repayment.repayment_date.desc()).all() if loans else []
    total_balance = sum((a.balance or Decimal('0')) for a in accounts)
    total_loan = sum((l.amount or Decimal('0')) for l in loans)
    total_paid = sum((l.total_paid or Decimal('0')) for l in loans if l.status in ['approved', 'fully_paid'])
    return {
        'customer': {
            'id': customer.id,
            'customer_id': customer.customer_id,
            'full_name': customer.full_name,
            'father_name': customer.father_name,
            'grandfather_name': customer.grandfather_name,
            'dob': customer.dob.isoformat() if customer.dob else None,
            'gender': customer.gender,
            'citizenship_id': customer.citizenship_id,
            'phone_number': customer.phone_number,
            'email': customer.email,
            'address': customer.address,
            'status': customer.status,
            'created_at': customer.created_at.isoformat() if customer.created_at else None
        },
        'accounts_summary': {
            'total_accounts': len(accounts),
            'total_balance': float(total_balance),
            'accounts': [{
                'account_number': a.account_number,
                'account_type': a.account_type,
                'balance': float(a.balance),
                'status': a.status,
                'total_deposits': float(a.total_deposits),
                'total_withdrawals': float(a.total_withdrawals),
                'last_transaction_date': a.last_transaction_date.isoformat() if a.last_transaction_date else None,
                'created_at': a.created_at.isoformat() if a.created_at else None
            } for a in accounts]
        },
        'loans_summary': {
            'total_loans': len(loans),
            'total_amount': float(total_loan),
            'total_paid': float(total_paid),
            'loans': [{
                'loan_number': l.loan_number,
                'application_number': (lambda a: a.application_number if a else None)(
                    LoanApplication.query.filter_by(customer_id=l.customer_id)
                    .order_by(LoanApplication.id.desc()).first()
                ),
                'amount': float(l.amount),
                'interest_rate': float(l.interest_rate),
                'emi': float(l.emi),
                'total_payable': float(l.total_payable),
                'total_paid': float(l.total_paid),
                'status': l.status,
                'applied_date': l.applied_date.isoformat() if l.applied_date else None,
                'repayments': [{
                    'amount': float(r.amount),
                    'emi_number': r.emi_number,
                    'status': r.status,
                    'repayment_date': r.repayment_date.isoformat() if r.repayment_date else None
                } for r in l.repayments] if l.repayments else []
            } for l in loans]
        },
        'recent_transactions': [serialize_txn_compact(t) for t in transactions],
        'recent_repayments': [serialize_repayment_compact(r) for r in repayments]
    }

def serialize_txn_compact(t):
    return {
        'id': t.id,
        'uuid': t.transaction_uuid,
        'type': t.type,
        'amount': float(t.amount),
        'balance_after': float(t.balance_after),
        'description': t.description,
        'status': t.status,
        'reference_number': t.reference_number,
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'account_number': t.account.account_number if t.account else None,
        'customer_name': t.account.customer.full_name if t.account and t.account.customer else None
    }

def serialize_loan_compact(l):
    return {
        'id': l.id,
        'loan_number': l.loan_number,
        'amount': float(l.amount),
        'interest_rate': float(l.interest_rate),
        'emi': float(l.emi),
        'total_payable': float(l.total_payable),
        'total_paid': float(l.total_paid),
        'status': l.status,
        'applied_date': l.applied_date.isoformat() if l.applied_date else None,
        'customer_name': l.customer.full_name if l.customer else None
    }

def serialize_repayment_compact(r):
    return {
        'id': r.id,
        'amount': float(r.amount),
        'emi_number': r.emi_number,
        'status': r.status,
        'repayment_date': r.repayment_date.isoformat() if r.repayment_date else None,
        'loan_number': r.loan.loan_number if r.loan else None,
        'customer_name': r.loan.customer.full_name if r.loan and r.loan.customer else None
    }

def serialize_customer_compact(c):
    return {
        'id': c.id,
        'customer_id': c.customer_id,
        'full_name': c.full_name,
        'phone_number': c.phone_number,
        'citizenship_id': c.citizenship_id,
        'status': c.status,
        'created_at': c.created_at.isoformat() if c.created_at else None
    }

def serialize_account_compact(a):
    return {
        'id': a.id,
        'account_number': a.account_number,
        'account_type': a.account_type,
        'balance': float(a.balance),
        'status': a.status,
        'customer_name': a.customer.full_name if a.customer else None,
        'created_at': a.created_at.isoformat() if a.created_at else None
    }
