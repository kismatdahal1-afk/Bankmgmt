import datetime
import random
import string
from decimal import Decimal
from database.db import db
from models import Account, Customer

def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

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

def generate_username():
    count = Customer.query.count() + 1
    while True:
        username = f"cust{count:04d}"
        if not Customer.query.filter_by(username=username).first():
            return username
        count += 1

def generate_temporary_password():
    nums = ''.join(random.choices(string.digits, k=4))
    l1 = random.choice(string.ascii_uppercase)
    l2 = random.choice(string.ascii_uppercase)
    return f"BMG-{nums}-{l1}{l2}"

def generate_account_number():
    while True:
        acc_num = str(random.randint(1000000000, 9999999999))
        exists = Account.query.filter_by(account_number=acc_num).first()
        if not exists:
            return acc_num
