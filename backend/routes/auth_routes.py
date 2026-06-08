from flask import Blueprint, render_template, request, redirect, url_for, session, flash, g
from extensions import limiter
from database.db import db
from models import User
from middleware.authentication import login_required

auth_bp = Blueprint('auth', __name__, template_folder='../templates', url_prefix='/auth')

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
@limiter.limit("10 per minute", methods=['POST'])
def login():
    if session.get('user_id'):
        return redirect(url_for('reports.dashboard'))

    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password', '')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
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
