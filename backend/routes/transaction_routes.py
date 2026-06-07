from decimal import Decimal
import uuid
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from database.db import db
from models import Account, Transaction
from middleware.authentication import login_required

transaction_bp = Blueprint('transaction', __name__, template_folder='../templates')

@transaction_bp.route('/transactions/deposit', methods=['GET', 'POST'])
@login_required
def deposit():
    if request.method == 'POST':
        account_number = request.form.get('account_number')
        amount_str = request.form.get('amount')
        description = request.form.get('description', '')

        if not account_number:
            flash('Account number is required.', 'danger')
            return redirect(url_for('transaction.deposit'))

        try:
            amount = Decimal(str(amount_str))
        except Exception:
            flash('Invalid amount', 'danger')
            return redirect(url_for('transaction.deposit'))

        if amount <= 0:
            flash('Amount must be greater than 0', 'danger')
            return redirect(url_for('transaction.deposit'))

        account = Account.query.filter_by(account_number=account_number, status='active').first()
        if not account:
            flash('Account not found', 'danger')
            return redirect(url_for('transaction.deposit'))

        old_balance = account.balance
        new_balance = old_balance + amount
        account.balance = new_balance

        transaction = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=account.id,
            type='deposit',
            amount=amount,
            balance_after=new_balance,
            description=description,
            created_by=g.user.id if g.user else None
        )
        db.session.add(transaction)
        db.session.commit()

        flash(f'Successfully deposited  to account {account_number}', 'success')
        return redirect(url_for('transaction.transactions_list'))

    accounts = Account.query.filter_by(status='active').all()
    selected_account_num = request.args.get('account_number')
    return render_template('transaction_form.html', accounts=accounts, selected_account_num=selected_account_num, action='Deposit')

@transaction_bp.route('/transactions/withdraw', methods=['GET', 'POST'])
@login_required
def withdraw():
    if request.method == 'POST':
        account_number = request.form.get('account_number')
        amount_str = request.form.get('amount')
        description = request.form.get('description', '')

        if not account_number:
            flash('Account number is required.', 'danger')
            return redirect(url_for('transaction.withdraw'))

        try:
            amount = Decimal(str(amount_str))
        except Exception:
            flash('Invalid amount', 'danger')
            return redirect(url_for('transaction.withdraw'))

        if amount <= 0:
            flash('Amount must be greater than 0', 'danger')
            return redirect(url_for('transaction.withdraw'))

        account = Account.query.filter_by(account_number=account_number, status='active').first()
        if not account:
            flash('Account not found', 'danger')
            return redirect(url_for('transaction.withdraw'))

        if account.balance < amount:
            flash(f'Insufficient funds. Available balance: ', 'danger')
            return redirect(url_for('transaction.withdraw'))

        old_balance = account.balance
        new_balance = old_balance - amount
        account.balance = new_balance

        transaction = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            account_id=account.id,
            type='withdrawal',
            amount=amount,
            balance_after=new_balance,
            description=description,
            created_by=g.user.id if g.user else None
        )
        db.session.add(transaction)
        db.session.commit()

        flash(f'Successfully withdrew  from account {account_number}', 'success')
        return redirect(url_for('transaction.transactions_list'))

    accounts = Account.query.filter_by(status='active').all()
    selected_account_num = request.args.get('account_number')
    return render_template('transaction_form.html', accounts=accounts, selected_account_num=selected_account_num, action='Withdraw')

@transaction_bp.route('/transactions/')
@login_required
def transactions_list():
    transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()
    return render_template('transactions.html', transactions=transactions)
