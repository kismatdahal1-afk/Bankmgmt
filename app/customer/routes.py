import random
from decimal import Decimal
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from app.database import db
from app.models import Customer, Account, Transaction
from app.auth.routes import login_required

customer_bp = Blueprint('customer', __name__, template_folder='../templates', url_prefix='/customers')

def generate_account_number():
    """Generates a unique 10-digit account number."""
    while True:
        # Generate a random 10-digit number between 1000000000 and 9999999999
        acc_num = str(random.randint(1000000000, 9999999999))
        # Ensure it is unique
        exists = Account.query.filter_by(account_number=acc_num).first()
        if not exists:
            return acc_num

@customer_bp.route('/')
@login_required
def list_customers():
    # Only list active customers to implement soft-delete flow
    customers = Customer.query.filter_by(status='active').order_by(Customer.created_at.desc()).all()
    return render_template('customers.html', customers=customers)

@customer_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_customer():
    if request.method == 'POST':
        full_name = (request.form.get('full_name') or '').strip()
        address = (request.form.get('address') or '').strip()
        phone_number = (request.form.get('phone_number') or '').strip()
        citizenship_id = (request.form.get('citizenship_id') or '').strip()
        account_type = request.form.get('account_type')
        initial_balance_str = request.form.get('initial_balance', '0')

        # Form Validations
        if not all([full_name, address, phone_number, citizenship_id, account_type]):
            flash("All fields are required.", "danger")
            return render_template('customer_form.html', action="Create")

        # Validate unique parameters
        if Customer.query.filter_by(phone_number=phone_number).first():
            flash("Phone number is already registered to another customer.", "danger")
            return render_template('customer_form.html', action="Create")

        if Customer.query.filter_by(citizenship_id=citizenship_id).first():
            flash("Citizenship/ID number is already registered.", "danger")
            return render_template('customer_form.html', action="Create")

        try:
            initial_balance = Decimal(initial_balance_str)
            if initial_balance < 0:
                flash("Initial balance cannot be negative.", "danger")
                return render_template('customer_form.html', action="Create")
        except Exception:
            flash("Invalid initial balance amount.", "danger")
            return render_template('customer_form.html', action="Create")

        try:
            # Create Customer Profile
            new_customer = Customer(
                full_name=full_name,
                address=address,
                phone_number=phone_number,
                citizenship_id=citizenship_id
            )
            db.session.add(new_customer)
            # Flush to get the customer id
            db.session.flush()

            # Generate Unique Account
            account_num = generate_account_number()
            new_account = Account(
                customer_id=new_customer.id,
                account_number=account_num,
                account_type=account_type,
                balance=initial_balance
            )
            db.session.add(new_account)
            db.session.flush()

            # Create Transaction Record for initial balance if greater than zero
            if initial_balance > 0:
                txn = Transaction(
                    account_id=new_account.id,
                    type='deposit',
                    amount=initial_balance,
                    balance_after=initial_balance,
                    description="Initial Deposit",
                    created_by=g.user.id if g.user else None
                )
                db.session.add(txn)

            db.session.commit()
            flash(f"Customer profile and {account_type.capitalize()} Account #{account_num} created successfully!", "success")
            return redirect(url_for('customer.list_customers'))
            
        except Exception as e:
            db.session.rollback()
            flash(f"An error occurred while creating the customer: {str(e)}", "danger")
            return render_template('customer_form.html', action="Create")

    return render_template('customer_form.html', action="Create")

@customer_bp.route('/edit/<int:customer_id>', methods=['GET', 'POST'])
@login_required
def edit_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    
    if request.method == 'POST':
        full_name = (request.form.get('full_name') or '').strip()
        address = (request.form.get('address') or '').strip()
        phone_number = (request.form.get('phone_number') or '').strip()
        citizenship_id = (request.form.get('citizenship_id') or '').strip()

        if not all([full_name, address, phone_number, citizenship_id]):
            flash("All fields are required.", "danger")
            return render_template('customer_form.html', action="Edit", customer=customer)

        # Phone Number Check (excluding self)
        phone_exists = Customer.query.filter(Customer.phone_number == phone_number, Customer.id != customer_id).first()
        if phone_exists:
            flash("Phone number is already registered to another customer.", "danger")
            return render_template('customer_form.html', action="Edit", customer=customer)

        # Citizenship Check (excluding self)
        id_exists = Customer.query.filter(Customer.citizenship_id == citizenship_id, Customer.id != customer_id).first()
        if id_exists:
            flash("Citizenship/ID number is already registered to another customer.", "danger")
            return render_template('customer_form.html', action="Edit", customer=customer)

        try:
            customer.full_name = full_name
            customer.address = address
            customer.phone_number = phone_number
            customer.citizenship_id = citizenship_id
            
            db.session.commit()
            flash("Customer profile updated successfully.", "success")
            return redirect(url_for('customer.list_customers'))
        except Exception as e:
            db.session.rollback()
            flash(f"An error occurred: {str(e)}", "danger")
            return render_template('customer_form.html', action="Edit", customer=customer)

    return render_template('customer_form.html', action="Edit", customer=customer)

@customer_bp.route('/delete/<int:customer_id>', methods=['POST'])
@login_required
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    
    try:
        # Perform soft delete on the customer profile
        customer.status = 'inactive'
        
        # Soft delete / close all associated accounts
        for account in customer.accounts:
            account.status = 'closed'
            
        db.session.commit()
        flash(f"Customer {customer.full_name} and their accounts have been closed.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Failed to delete customer: {str(e)}", "danger")
        
    return redirect(url_for('customer.list_customers'))
