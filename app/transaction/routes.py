from decimal import Decimal
import uuid
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from app.database import db
from app.models import Account, Transaction
from app.auth.routes import login_required

transaction_bp = Blueprint('transaction', __name__)

@transaction_bp.route('/transactions/deposit', methods=['GET', 'POST'])
@login_required
def deposit():
    if request.method == 'POST':
        account_number = request.form.get('account_number')
        amount_str = request.form.get('amount')
        description = request.form.get('description', '')
        
        # Convert amount to Decimal
        try:
            amount = Decimal(str(amount_str))
        except:
            flash('Invalid amount', 'danger')
            return redirect(url_for('transaction.deposit'))
        
        if amount <= 0:
            flash('Amount must be greater than 0', 'danger')
            return redirect(url_for('transaction.deposit'))
        
        # Find the account
        account = Account.query.filter_by(account_number=account_number, status='active').first()
        
        if not account:
            flash('Account not found', 'danger')
            return redirect(url_for('transaction.deposit'))
        
        # Perform deposit using Decimal arithmetic
        old_balance = account.balance
        new_balance = old_balance + amount
        
        # Update account balance
        account.balance = new_balance
        
        # Create transaction record
        transaction = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            account_id=account.id,
            type='deposit',
            amount=amount,
            balance_after=new_balance,
            description=description,
            created_by=g.user.id
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash(f'Successfully deposited ${amount:,.2f} to account {account_number}', 'success')
        return redirect(url_for('transaction.transactions_list'))
    
    # GET request - show deposit form
    accounts = Account.query.filter_by(status='active').all()
    return render_template('deposit.html', accounts=accounts)

@transaction_bp.route('/transactions/withdraw', methods=['GET', 'POST'])
@login_required
def withdraw():
    if request.method == 'POST':
        account_number = request.form.get('account_number')
        amount_str = request.form.get('amount')
        description = request.form.get('description', '')
        
        # Convert amount to Decimal
        try:
            amount = Decimal(str(amount_str))
        except:
            flash('Invalid amount', 'danger')
            return redirect(url_for('transaction.withdraw'))
        
        if amount <= 0:
            flash('Amount must be greater than 0', 'danger')
            return redirect(url_for('transaction.withdraw'))
        
        # Find the account
        account = Account.query.filter_by(account_number=account_number, status='active').first()
        
        if not account:
            flash('Account not found', 'danger')
            return redirect(url_for('transaction.withdraw'))
        
        # Check sufficient balance
        if account.balance < amount:
            flash(f'Insufficient funds. Available balance: ${account.balance:,.2f}', 'danger')
            return redirect(url_for('transaction.withdraw'))
        
        # Perform withdrawal using Decimal arithmetic
        old_balance = account.balance
        new_balance = old_balance - amount
        
        # Update account balance
        account.balance = new_balance
        
        # Create transaction record
        transaction = Transaction(
            transaction_uuid=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            account_id=account.id,
            type='withdrawal',
            amount=amount,
            balance_after=new_balance,
            description=description,
            created_by=g.user.id
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash(f'Successfully withdrew ${amount:,.2f} from account {account_number}', 'success')
        return redirect(url_for('transaction.transactions_list'))
    
    # GET request - show withdraw form
    accounts = Account.query.filter_by(status='active').all()
    return render_template('withdraw.html', accounts=accounts)

@transaction_bp.route('/transactions/')
@login_required
def transactions_list():
    transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()
    return render_template('transactions.html', transactions=transactions)