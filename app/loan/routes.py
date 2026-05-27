import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from app.database import db
from app.models import Customer, Account, Transaction, Loan, Repayment
from app.auth.routes import login_required, role_required

loan_bp = Blueprint('loan', __name__, template_folder='../templates', url_prefix='/loans')

def calculate_emi_and_payable(principal, annual_rate, duration_months):
    """Calculates EMI and Total Payable based on standard reducing balance EMI formula."""
    if annual_rate == 0:
        emi = principal / duration_months
        total_payable = principal
        return round(emi, 2), round(total_payable, 2)

    # Monthly interest rate
    r = (annual_rate / 12) / 100
    n = duration_months
    
    # EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    emi = principal * r * ((1 + r) ** n) / (((1 + r) ** n) - 1)
    total_payable = emi * n
    return round(emi, 2), round(total_payable, 2)

@loan_bp.route('/')
@login_required
def loans_list():
    # Fetch all loans ordered by applied date
    loans = Loan.query.order_by(Loan.applied_date.desc()).all()
    return render_template('loans.html', loans=loans)

@loan_bp.route('/apply', methods=['GET', 'POST'])
@login_required
def apply_loan():
    customers = Customer.query.filter_by(status='active').all()

    if request.method == 'POST':
        customer_id_str = request.form.get('customer_id')
        amount_str = request.form.get('amount')
        interest_rate_str = request.form.get('interest_rate')
        duration_months_str = request.form.get('duration_months')

        if not all([customer_id_str, amount_str, interest_rate_str, duration_months_str]):
            flash("All fields are required to apply for a loan.", "danger")
            return render_template('loan_form.html', customers=customers)

        try:
            customer_id = int(customer_id_str)
            amount = float(amount_str)
            interest_rate = float(interest_rate_str)
            duration_months = int(duration_months_str)

            if amount <= 0 or interest_rate < 0 or duration_months <= 0:
                flash("Invalid input values. Amount, interest rate, and duration must be positive.", "danger")
                return render_template('loan_form.html', customers=customers)
        except ValueError:
            flash("Invalid numeric input values.", "danger")
            return render_template('loan_form.html', customers=customers)

        # Validate customer
        customer = Customer.query.filter_by(id=customer_id, status='active').first()
        if not customer:
            flash("Selected customer profile is inactive or invalid.", "danger")
            return render_template('loan_form.html', customers=customers)

        # Calculate EMI & Total Payable
        emi, total_payable = calculate_emi_and_payable(amount, interest_rate, duration_months)

        try:
            new_loan = Loan(
                customer_id=customer.id,
                amount=amount,
                interest_rate=interest_rate,
                duration_months=duration_months,
                emi=emi,
                total_payable=total_payable,
                status='pending'
            )
            db.session.add(new_loan)
            db.session.commit()
            flash(f"Loan application submitted for {customer.full_name}. Loan Ref: {new_loan.loan_number}", "success")
            return redirect(url_for('loan.loans_list'))
        except Exception as e:
            db.session.rollback()
            flash(f"Failed to submit loan application: {str(e)}", "danger")
            return render_template('loan_form.html', customers=customers)

    return render_template('loan_form.html', customers=customers)

@loan_bp.route('/approve/<int:loan_id>', methods=['POST'])
@role_required('admin')
def approve_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'pending':
        flash("Loan is already processed.", "warning")
        return redirect(url_for('loan.loans_list'))

    # Locate customer primary active account to disburse funds
    active_account = Account.query.filter_by(customer_id=loan.customer_id, status='active').first()
    if not active_account:
        flash("Disbursement Failed: The customer does not have an active savings/current account.", "danger")
        return redirect(url_for('loan.loans_list'))

    try:
        # Update loan record
        loan.status = 'approved'
        loan.approved_date = datetime.datetime.utcnow()
        loan.approved_by = g.user.id

        # Disburse funds directly into customer account
        active_account.balance += loan.amount

        # Log ledger entry for disbursement
        txn = Transaction(
            account_id=active_account.id,
            type='deposit',
            amount=loan.amount,
            balance_after=active_account.balance,
            description=f"Loan Disbursement (Ref: {loan.loan_number})",
            created_by=g.user.id
        )
        db.session.add(txn)
        db.session.commit()

        flash(f"Loan #{loan.loan_number} approved! Funds of ${loan.amount:,.2f} disbursed to Account #{active_account.account_number}.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Approval process failed: {str(e)}", "danger")

    return redirect(url_for('loan.loans_list'))

@loan_bp.route('/reject/<int:loan_id>', methods=['POST'])
@role_required('admin')
def reject_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'pending':
        flash("Loan is already processed.", "warning")
        return redirect(url_for('loan.loans_list'))

    try:
        loan.status = 'rejected'
        db.session.commit()
        flash(f"Loan #{loan.loan_number} application has been rejected.", "warning")
    except Exception as e:
        db.session.rollback()
        flash(f"Rejection process failed: {str(e)}", "danger")

    return redirect(url_for('loan.loans_list'))

@loan_bp.route('/repay/<int:loan_id>', methods=['GET', 'POST'])
@login_required
def repay_loan(loan_id):
    loan = Loan.query.get_or_404(loan_id)
    if loan.status != 'approved':
        flash("Repayments can only be recorded for active approved loans.", "warning")
        return redirect(url_for('loan.loans_list'))

    remaining_balance = loan.total_payable - loan.total_paid
    active_account = Account.query.filter_by(customer_id=loan.customer_id, status='active').first()

    if request.method == 'POST':
        amount_str = request.form.get('amount')
        payment_method = request.form.get('payment_method') # 'cash' or 'account'

        if not amount_str or not payment_method:
            flash("All fields are required.", "danger")
            return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)

        try:
            amount = float(amount_str)
            if amount <= 0:
                flash("Repayment amount must be greater than zero.", "danger")
                return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)
            
            # Prevent overpayment
            # Handle float rounding differences by adding a tiny threshold
            if amount > (remaining_balance + 0.01):
                flash(f"Repayment amount exceeds remaining loan balance (${remaining_balance:,.2f}).", "danger")
                return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)

        except ValueError:
            flash("Invalid numeric repayment amount.", "danger")
            return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)

        # Handle Account Debit Method
        if payment_method == 'account':
            if not active_account:
                flash("Customer does not have an active bank account to debit from.", "danger")
                return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)
            if active_account.balance < amount:
                flash(f"Insufficient account balance. Available: ${active_account.balance:,.2f}.", "danger")
                return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)

        try:
            # Update loan paid details
            loan.total_paid += amount
            
            # If loan paid equals total payable, mark as fully paid
            # Using minor epsilon 0.05 for floating point comparisons
            if abs(loan.total_payable - loan.total_paid) < 0.05:
                loan.status = 'fully_paid'
                # set total_paid equal to total_payable to avoid minor fractional diffs in display
                loan.total_paid = loan.total_payable

            # Process account debit if payment method is savings account
            if payment_method == 'account':
                active_account.balance -= amount
                # Log withdrawal transaction
                txn = Transaction(
                    account_id=active_account.id,
                    type='withdrawal',
                    amount=amount,
                    balance_after=active_account.balance,
                    description=f"Loan Repayment (Ref: {loan.loan_number})",
                    created_by=g.user.id
                )
                db.session.add(txn)

            # Record Repayment ledger entry
            repay_record = Repayment(
                loan_id=loan.id,
                amount=amount,
                received_by=g.user.id
            )
            db.session.add(repay_record)
            db.session.commit()

            flash(f"Successfully recorded repayment of ${amount:,.2f} against Loan #{loan.loan_number}.", "success")
            return redirect(url_for('loan.loans_list'))
            
        except Exception as e:
            db.session.rollback()
            flash(f"Repayment recording failed: {str(e)}", "danger")
            return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)

    return render_template('repay_form.html', loan=loan, remaining_balance=remaining_balance, active_account=active_account)
