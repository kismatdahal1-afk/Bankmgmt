import datetime
import re
from decimal import Decimal
from database.db import db
from models import Account, Customer

_NPT = datetime.timezone(datetime.timedelta(hours=5, minutes=45))
def _utcnow():
    return datetime.datetime.now(_NPT).replace(tzinfo=None)

def generate_customer_id():
    last = Customer.query.filter(Customer.customer_id.isnot(None)).order_by(Customer.id.desc()).first()
    if last and last.customer_id and last.customer_id.startswith('CUST-'):
        try:
            num = int(last.customer_id.split('-')[1]) + 1
        except (IndexError, ValueError):
            num = Customer.query.count() + 1
    else:
        num = Customer.query.count() + 1
    return f"CUST-{num:04d}"

def generate_username_from_phone(phone):
    return phone

def generate_password_from_name_phone(name, phone):
    name_part = name[:2].upper() if len(name) >= 2 else (name + 'X')[:2].upper()
    phone_part = phone[-3:] if len(phone) >= 3 else phone.zfill(3)
    return f"@{name_part}{phone_part}"

def generate_account_number():
    year = datetime.datetime.now(_NPT).year
    prefix = f'VB-{year}-'
    last = Account.query.filter(Account.account_number.like(f'{prefix}%')).order_by(Account.id.desc()).first()
    if last and last.account_number:
        try:
            parts = last.account_number.split('-')
            num = int(parts[2]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    while True:
        acc = f"{prefix}{num:06d}"
        if not Account.query.filter_by(account_number=acc).first():
            return acc
        num += 1

def validate_citizenship_format(citizenship_id):
    if not citizenship_id:
        return False
    return bool(re.match(r'^\d{6}-\d{4}$', citizenship_id.strip()))
