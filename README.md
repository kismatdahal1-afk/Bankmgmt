# BankMgmt - Bank Management System

A professional web-based banking management system built with Python (Flask) and SQLite.

## Architecture

\\\
BankMgmt/
+-- backend/          # Flask application
¦   +-- app/          # Flask app factory
¦   +-- config/       # Configuration
¦   +-- database/     # Database connection & seed
¦   +-- models.py     # Data models
¦   +-- routes/       # Route handlers (blueprints)
¦   +-- middleware/    # Authentication & authorization
¦   +-- utils/        # Utility functions
¦   +-- templates/    # Jinja2 templates
¦   +-- static/       # CSS files
¦   +-- services/     # [future] Service layer
¦   +-- controllers/  # [future] Controller layer
¦   +-- uploads/      # [future] Upload storage
¦   +-- logs/         # [future] Log storage
¦   +-- tests/        # Unit tests
+-- frontend/         # [future] Frontend application
+-- docs/             # [future] Documentation
+-- screenshots/      # [future] Screenshots
\\\

## Setup

1. Navigate to backend:
   \\\
   cd backend
   \\\

2. Create virtual environment:
   \\\
   python -m venv .venv
   \\\

3. Install dependencies:
   \\\
   pip install -r requirements.txt
   \\\

4. Initialize database:
   \\\
   python -c \"from database.seed import init_database; init_database()\"
   \\\

5. Run the app:
   \\\
   python run.py
   \\\

## Default Credentials

| Role     | Username | Password     |
|----------|----------|--------------|
| Admin    | admin    | admin123     |
| Staff    | staff    | staff123     |
| Customer | john     | password123  |

## Features

- Role-based access (Admin, Staff, Customer)
- Customer account management
- Deposit & withdrawal system
- Transaction history & ledger
- Loan management (apply, approve, repay)
- EMI calculation & tracking
- Dashboard with Chart.js analytics
- Daily/Monthly/Customer-wise reports
- Customer self-service portal
