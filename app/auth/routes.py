import functools
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g
from app.database import db
from app.models import User

auth_bp = Blueprint('auth', __name__, template_folder='../templates', url_prefix='/auth')

# Helper Decorator: Login Required
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access the system.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# Helper Decorator: Role Required
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

# Load Logged-in User Context
@auth_bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        g.user = db.session.get(User, user_id)
        if g.user is None:
            session.clear()

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # If already logged in, redirect to dashboard
    if session.get('user_id'):
        return redirect(url_for('reports.dashboard'))

    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password', '')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            # Clear previous session and initialize new session variables
            session.clear()
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            
            flash(f'Welcome back, {user.username}! Session authenticated.', 'success')
            return redirect(url_for('reports.dashboard'))
        else:
            flash('Invalid username or password.', 'danger')

    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been successfully logged out.', 'success')
    return redirect(url_for('auth.login'))
