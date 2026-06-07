import datetime
import random
from decimal import Decimal
from database.db import db
from models import Account

def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

def generate_account_number():
    while True:
        acc_num = str(random.randint(1000000000, 9999999999))
        exists = Account.query.filter_by(account_number=acc_num).first()
        if not exists:
            return acc_num
