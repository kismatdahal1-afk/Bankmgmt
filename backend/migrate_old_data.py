"""Migrate data from old database schema to new one."""
import sqlite3
import sys
sys.path.insert(0, '.')
from app import create_app
from database.db import db
from models import User, Customer, Account, Transaction, Loan, Repayment
from utils.helpers import generate_customer_id, generate_username_from_phone, generate_password_from_name_phone
from decimal import Decimal
import datetime

# Connect to old database
old_conn = sqlite3.connect(r'C:\Users\dell\Desktop\Bankmgmt\instance\village_bank.db')
old = old_conn.cursor()

app = create_app()
with app.app_context():
    # Migrate customers
    old.execute("SELECT id, full_name, address, phone_number, citizenship_id, status, created_at FROM customers")
    old_customers = old.fetchall()
    id_map = {}  # old customer_id -> new customer_id

    for c in old_customers:
        old_id, full_name, address, phone, citizenship, status, created_at = c
        # Check if already exists
        existing = Customer.query.filter_by(phone_number=phone).first()
        if existing:
            id_map[old_id] = existing.id
            print(f"Customer {full_name} already exists, skipping")
            continue
        
        username = generate_username_from_phone(phone)
        temp_pass = generate_password_from_name_phone(full_name, phone)
        
        customer = Customer(
            customer_id=generate_customer_id(),
            full_name=full_name,
            phone_number=phone,
            citizenship_id=citizenship,
            address=address,
            username=username,
            must_change_password=True,
            status=status if status in ('active', 'inactive', 'suspended', 'closed') else 'active'
        )
        customer.set_password(temp_pass)
        db.session.add(customer)
        db.session.flush()
        id_map[old_id] = customer.id
        print(f"Migrated customer: {full_name} -> {username} / {temp_pass}")

    # Migrate accounts
    old.execute("SELECT id, customer_id, account_number, account_type, balance, status, created_at FROM accounts")
    for a in old.fetchall():
        old_id, old_cust_id, acc_num, acc_type, balance, status, created_at = a
        new_cust_id = id_map.get(old_cust_id)
        if not new_cust_id:
            print(f"Skipping account {acc_num}: customer not found")
            continue
        
        existing = Account.query.filter_by(account_number=acc_num).first()
        if existing:
            print(f"Account {acc_num} already exists, skipping")
            continue
        
        account = Account(
            customer_id=new_cust_id,
            account_number=acc_num,
            account_type=acc_type or 'savings',
            balance=Decimal(str(balance)),
            status=status if status in ('active', 'frozen', 'suspended', 'archived', 'closed', 'pending') else 'active'
        )
        db.session.add(account)
        db.session.flush()
        print(f"Migrated account: {acc_num} for customer_id={new_cust_id}")

    # Migrate loans
    old.execute("SELECT id, loan_number, customer_id, amount, interest_rate, duration_months, emi, total_payable, total_paid, status, applied_date, approved_date, approved_by FROM loans")
    for l in old.fetchall():
        old_id, loan_num, old_cust_id, amount, rate, duration, emi, total_payable, total_paid, status, applied_date, approved_date, approved_by = l
        new_cust_id = id_map.get(old_cust_id)
        if not new_cust_id:
            print(f"Skipping loan {loan_num}: customer not found")
            continue
        
        existing = Loan.query.filter_by(loan_number=loan_num).first()
        if existing:
            print(f"Loan {loan_num} already exists, skipping")
            continue
        
        loan = Loan(
            loan_number=loan_num,
            customer_id=new_cust_id,
            amount=Decimal(str(amount)),
            interest_rate=Decimal(str(rate)),
            duration_months=duration,
            emi=Decimal(str(emi)),
            total_payable=Decimal(str(total_payable)),
            total_paid=Decimal(str(total_paid)),
            status=status or 'pending',
            applied_date=datetime.datetime.strptime(applied_date, '%Y-%m-%d %H:%M:%S.%f') if applied_date else None
        )
        if approved_date:
            loan.approved_date = datetime.datetime.strptime(approved_date, '%Y-%m-%d %H:%M:%S.%f')
        db.session.add(loan)
        print(f"Migrated loan: {loan_num} for customer_id={new_cust_id}")

    # Migrate transactions
    old.execute("SELECT id, transaction_uuid, account_id, type, amount, balance_after, description, created_by, created_at FROM transactions")
    for t in old.fetchall():
        old_id, txn_uuid, old_acc_id, txn_type, amount, balance_after, description, created_by, created_at = t
        # Find the new account by account number
        old.execute("SELECT account_number FROM accounts WHERE id=?", (old_acc_id,))
        acc_row = old.fetchone()
        if not acc_row:
            print(f"Skipping transaction: account {old_acc_id} not found")
            continue
        acc_num = acc_row[0]
        new_account = Account.query.filter_by(account_number=acc_num).first()
        if not new_account:
            print(f"Skipping transaction: account {acc_num} not found in new DB")
            continue
        
        txn = Transaction(
            transaction_uuid=txn_uuid or f"TXN-{__import__('uuid').uuid4().hex[:12].upper()}",
            account_id=new_account.id,
            type=txn_type or 'deposit',
            amount=Decimal(str(amount)),
            balance_after=Decimal(str(balance_after)),
            description=description or '',
            status='successful',
            reference_number=f"LEG-{__import__('uuid').uuid4().hex[:8].upper()}",
            created_at=datetime.datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S.%f') if created_at else None
        )
        db.session.add(txn)
        print(f"Migrated transaction: {txn_uuid} for account {acc_num}")

    db.session.commit()
    print("\nMigration completed successfully!")

    # Print credentials for new customers
    print("\n=== Customer Credentials ===")
    for old_id, new_id in id_map.items():
        cust = Customer.query.get(new_id)
        if cust:
            print(f"{cust.full_name}: username={cust.username}, password=auto-generated (use forgot password or reset)")

old_conn.close()
