import datetime
from flask import session, request
from database.db import db
from models import AuditLog, Notification, Customer

_NPT = datetime.timezone(datetime.timedelta(hours=5, minutes=45))
def _utcnow():
    return datetime.datetime.now(_NPT).replace(tzinfo=None)

def log_audit(action, resource_type=None, resource_id=None, description=None, status='success'):
    """Create an audit log entry from the current session context."""
    ip = request.remote_addr if request else None
    user_id = session.get('user_id')
    customer_id = session.get('customer_id')
    username = session.get('username') or session.get('customer_name')
    role = session.get('role')
    if customer_id and not role:
        role = 'customer'
    log = AuditLog(
        user_id=user_id,
        customer_id=customer_id,
        username=username,
        role=role,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        description=description,
        ip_address=ip,
        status=status
    )
    db.session.add(log)
    db.session.flush()
    return log

def create_notification(title, message, notification_type='info', user_id=None, customer_id=None):
    """Create a notification for a user or customer."""
    notif = Notification(
        user_id=user_id,
        customer_id=customer_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False
    )
    db.session.add(notif)
    db.session.flush()
    return notif

def notify_customer(customer_id, title, message, notification_type='info'):
    """Helper to notify a customer."""
    return create_notification(title=title, message=message, notification_type=notification_type, customer_id=customer_id)

def notify_staff(user_id, title, message, notification_type='info'):
    """Helper to notify a staff/admin user."""
    return create_notification(title=title, message=message, notification_type=notification_type, user_id=user_id)
