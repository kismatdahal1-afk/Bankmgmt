import functools
from flask import session, flash, redirect, url_for

def role_required(*roles):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash('Please log in to access the system.', 'danger')
                return redirect(url_for('auth.login'))
            if session.get('role') not in roles:
                flash('Access Denied: You do not have permission to view that page.', 'danger')
                return redirect(url_for('reports.dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator
