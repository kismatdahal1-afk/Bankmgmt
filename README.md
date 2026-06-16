# 🏦 Village Bank Management System

A full-stack banking management platform with role-based access control supporting three tiers — **Admin**, **Staff**, and **Customer**. Built with Flask (Python) on the backend and React 18 + Vite on the frontend, the system enables real-time account management, deposit/withdrawal processing, loan lifecycle management, EMI tracking, fund transfers, audit logging, and customer self-service.

---

## 📋 Overview

The **Village Bank Management System** digitizes core banking operations for a community bank. It provides:

- **Admin Panel** — Full control: manage customers, accounts, loans, staff, transactions, reports, and audit logs.
- **Staff Panel** — Day-to-day operations: customer onboarding, deposits, withdrawals, loan processing, and account servicing (excludes destructive actions like archive/close).
- **Customer Portal** — Self-service: view accounts, check balances, apply for loans, transfer funds, view transaction history, and update profile.

**Major Workflows:**

1. Customer Onboarding → Account Creation → Deposit
2. Loan Application → Approval → Disbursement → EMI Repayment
3. Fund Transfer between own accounts or to other customers
4. Account Lifecycle: Active ↔ Freeze ↔ Suspend, Active → Archive → Close

---

## ✨ Features

### 👑 Admin Features

| Feature                    | Description                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer Management**    | Create, edit, view, search, and filter customers. Manage customer status (activate/suspend). Reset customer passwords.                                                |
| **Account Management**     | Open savings/current accounts. Freeze, unfreeze, suspend, unsuspend, archive, unarchive, close, and reopen accounts. View detailed account info with 7-tab dashboard. |
| **Loan Management**        | View all loans, approve/reject applications, process repayments, track EMI schedules.                                                                                 |
| **Transaction Management** | View all transactions with filters. Process deposits and withdrawals.                                                                                                 |
| **Deposit / Withdrawal**   | Add or deduct funds from any customer account with audit trail.                                                                                                       |
| **Password Management**    | Reset customer passwords, set first-login password change requirement.                                                                                                |
| **Dashboard Analytics**    | Real-time stats with Chart.js: daily deposits/withdrawals, income vs expense, balance trends, and transaction volume.                                                 |
| **Reports**                | Generate deposit, withdrawal, loan, EMI collection, interest, customer, and account reports. Daily/weekly/monthly/quarterly/yearly period filters.                    |
| **Staff Management**       | Create and delete staff accounts.                                                                                                                                     |
| **Audit Logs**             | Full audit trail with action filters and summary statistics.                                                                                                          |
| **User Monitoring**        | Track all system actions with IP addresses, timestamps, and user roles.                                                                                               |

### 🛡️ Staff Features

| Feature                    | Description                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Customer Management**    | Create and view customers (no status changes).                                                            |
| **Account Management**     | View account details. Freeze/unfreeze, suspend/unsuspend. ❌ Cannot archive, unarchive, close, or reopen. |
| **Loan Management**        | Process loan repayments. ❌ Cannot approve or reject loans.                                               |
| **Transaction Management** | Process deposits and withdrawals. View transaction history.                                               |
| **Dashboard**              | View dashboard analytics (same charts as admin, read-only).                                               |
| **Reports**                | Generate and view reports.                                                                                |

### 👤 Customer Features

| Feature                 | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Login / Logout**      | Secure authentication with first-login password change requirement.               |
| **Dashboard**           | Overview of account balances, recent transactions, active loans, and key metrics. |
| **My Accounts**         | View all owned accounts with real-time balances and status.                       |
| **Account Application** | Apply for new savings or current accounts.                                        |
| **Transaction History** | View all transactions with date range and type filters.                           |
| **Fund Transfer**       | Transfer funds between own accounts or to another customer's account.             |
| **Loan Application**    | Apply for loans with automatic EMI calculation.                                   |
| **My Loans**            | View active and past loans with repayment schedules.                              |
| **Profile Management**  | Update personal details, change password, confirm contact information.            |
| **Notifications**       | View and manage system notifications.                                             |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React 18 SPA (localhost:5173)                       │  │
│  │  React Router v6 / Axios / Chart.js                  │  │
│  │  Admin Layout | Staff Layout | User Layout           │  │
│  └──────────────┬────────────────────────────────────────┘  │
│                 │ HTTP (Vite Proxy /api → Flask)             │
└─────────────────┼───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Flask Backend (127.0.0.1:5000)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Blueprints:                                          │  │
│  │  api_bp (REST JSON)  │  auth_bp (Template Login)     │  │
│  │  customer_portal_bp  │  customer_bp / loan_bp         │  │
│  │  transaction_bp      │  dashboard_bp                  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Middleware: Authentication  │  Authorization          │  │
│  │  Services: Audit Logger     │  EMI Calculator         │  │
│  │  Reports: 8 report types    │  Notifications          │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              SQLite Database (village_bank.db)               │
│  8 Tables: users | customers | accounts | transactions      │
│            loans | repayments | notifications | audit_logs  │
└─────────────────────────────────────────────────────────────┘
```

### API Flow

1. User authenticates → Flask sets session cookie (client-side signed cookie)
2. React frontend includes cookie via `credentials: 'include'`
3. Vite dev proxy forwards `/api/*` to Flask on port 5000
4. Flask decorators (`staff_or_admin_required`, `admin_required`) validate session
5. Responses return JSON for React; Jinja2 templates for customer portal

---

## 🛠️ Technology Stack

### Frontend

| Technology           | Version | Purpose                    |
| -------------------- | ------- | -------------------------- |
| **React**            | 18.3.1  | UI framework               |
| **Vite**             | 5.3.1   | Build tool and dev server  |
| **React Router DOM** | 6.23.1  | Client-side routing        |
| **Axios**            | 1.7.2   | HTTP client                |
| **Chart.js**         | 4.4.3   | Dashboard charts           |
| **react-chartjs-2**  | 5.2.0   | React wrapper for Chart.js |
| **ESLint**           | 8.57.0  | Code linting               |

### Backend

| Technology           | Version | Purpose                                                             |
| -------------------- | ------- | ------------------------------------------------------------------- |
| **Flask**            | 3.0.3   | Web framework                                                       |
| **Flask-SQLAlchemy** | 3.1.1   | ORM and database abstraction                                        |
| **Flask-CORS**       | 5.0.1   | Cross-origin resource sharing                                       |
| **Flask-Limiter**    | 4.1.1   | Rate limiting (10 req/min on login)                                 |
| **Werkzeug**         | 3.0.3   | Password hashing (`generate_password_hash` / `check_password_hash`) |
| **python-dotenv**    | 1.0.1   | Environment variable loading                                        |

### Database

| Technology | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| **SQLite** | Local file-based database (`instance/village_bank.db`) |

---

## 📁 Folder Structure

```
Bankmgmt/
├── backend/
│   ├── app/
│   │   └── __init__.py              # Flask app factory — registers blueprints
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py              # Configuration (SECRET_KEY, DB URI)
│   ├── controllers/
│   │   └── __init__.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── db.py                    # SQLAlchemy db instance
│   │   └── seed.py                  # Default data seeder
│   ├── instance/
│   │   └── village_bank.db          # SQLite database file
│   ├── logs/
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── authentication.py        # login_required decorator
│   │   └── authorization.py         # role_required decorator
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── api_routes.py            # REST API (64+ endpoints)
│   │   ├── auth_routes.py           # Template-based admin/staff login
│   │   ├── customer_portal_routes.py # Customer portal (Jinja2 templates)
│   │   ├── customer_routes.py       # Customer CRUD templates
│   │   ├── dashboard_routes.py      # Dashboard & reports templates
│   │   ├── loan_routes.py           # Loan management templates
│   │   └── transaction_routes.py    # Transaction templates
│   ├── services/
│   │   └── __init__.py
│   ├── templates/
│   │   ├── base.html
│   │   ├── customers.html
│   │   ├── customer_form.html
│   │   ├── dashboard.html
│   │   ├── landing.html
│   │   ├── loans.html
│   │   ├── loan_form.html
│   │   ├── login.html
│   │   ├── repay_form.html
│   │   ├── reports.html
│   │   ├── transactions.html
│   │   ├── transaction_form.html
│   │   └── customer/                # Customer portal templates
│   │       ├── accounts.html
│   │       ├── base.html
│   │       ├── dashboard.html
│   │       ├── loans.html
│   │       ├── login.html
│   │       ├── profile.html
│   │       └── transactions.html
│   ├── tests/
│   │   └── test_bank.py             # Unit tests (password, EMI, CRUD)
│   ├── uploads/
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── audit_helper.py          # Audit log & notification helpers
│   │   ├── emi_calculator.py        # EMI formula calculation
│   │   ├── helpers.py               # ID/username/password generators
│   │   └── report_helper.py         # 8 report type generators
│   ├── .env.example
│   ├── extensions.py                # Flask-Limiter instance
│   ├── models.py                    # 8 SQLAlchemy model classes
│   ├── requirements.txt
│   └── run.py                       # Entry point
├── docs/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── accounts/
│   │   │   │   └── AccountDetailContent.jsx
│   │   │   ├── cards/
│   │   │   │   ├── AccountCard.jsx
│   │   │   │   ├── BalanceCard.jsx
│   │   │   │   └── LoanCard.jsx
│   │   │   ├── charts/
│   │   │   │   └── LineChart.jsx
│   │   │   ├── common/
│   │   │   │   ├── CredentialCard.jsx
│   │   │   │   ├── DataTable.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   ├── FirstLoginFlow.jsx
│   │   │   │   ├── FlashMessage.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   ├── PrivateRoute.jsx
│   │   │   │   └── StatusBadge.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── ChartCard.jsx
│   │   │   │   └── StatsCard.jsx
│   │   │   ├── forms/
│   │   │   │   ├── CustomerForm.jsx
│   │   │   │   ├── LoanForm.jsx
│   │   │   │   └── TransactionForm.jsx
│   │   │   ├── modals/
│   │   │   │   └── ConfirmModal.jsx
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.jsx
│   │   │   │   └── NotificationItem.jsx
│   │   │   └── tables/
│   │   │       └── LoansTable.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js
│   │   ├── layouts/
│   │   │   ├── AdminLayout/
│   │   │   │   └── AdminLayout.jsx
│   │   │   ├── StaffLayout/
│   │   │   │   └── StaffLayout.jsx
│   │   │   └── UserLayout/
│   │   │       └── UserLayout.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── admin/
│   │   │   │   ├── AccountDetail.jsx
│   │   │   │   ├── Accounts.jsx
│   │   │   │   ├── AdminAuditLogs.jsx
│   │   │   │   ├── Customers.jsx
│   │   │   │   ├── CustomerForm.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── EMI.jsx
│   │   │   │   ├── Loans.jsx
│   │   │   │   ├── LoanForm.jsx
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── RepayForm.jsx
│   │   │   │   ├── Reports.jsx
│   │   │   │   ├── Settings.jsx
│   │   │   │   ├── StaffManagement.jsx
│   │   │   │   ├── TransactionForm.jsx
│   │   │   │   └── Transactions.jsx
│   │   │   ├── staff/
│   │   │   │   ├── AccountDetail.jsx
│   │   │   │   ├── Accounts.jsx
│   │   │   │   ├── CustomerForm.jsx
│   │   │   │   ├── Customers.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── EMI.jsx
│   │   │   │   ├── Loans.jsx
│   │   │   │   ├── LoanForm.jsx
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── RepayForm.jsx
│   │   │   │   ├── Reports.jsx
│   │   │   │   ├── TransactionForm.jsx
│   │   │   │   └── Transactions.jsx
│   │   │   └── user/
│   │   │       ├── ApplyAccount.jsx
│   │   │       ├── ApplyLoan.jsx
│   │   │       ├── Dashboard.jsx
│   │   │       ├── FundTransfer.jsx
│   │   │       ├── Login.jsx
│   │   │       ├── MyAccounts.jsx
│   │   │       ├── MyBalance.jsx
│   │   │       ├── MyLoans.jsx
│   │   │       ├── Notifications.jsx
│   │   │       ├── Profile.jsx
│   │   │       └── Transactions.jsx
│   │   ├── routes/
│   │   │   └── index.jsx            # Route tree with role-based layouts
│   │   ├── services/
│   │   │   ├── accountService.js
│   │   │   ├── api.js               # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── customerService.js
│   │   │   ├── loanService.js
│   │   │   ├── notificationService.js
│   │   │   ├── reportService.js
│   │   │   └── transactionService.js
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   └── style.css
│   │   ├── utils/
│   │   │   ├── accountGenerator.js
│   │   │   ├── emiCalculator.js
│   │   │   ├── helpers.js
│   │   │   └── passwordGenerator.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .eslintrc.cjs
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
├── screenshots/
├── package-lock.json
└── README.md
```

---

## 📦 Installation Guide

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Bankmgmt
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Environment Variables

Copy the environment template and optionally customize:

```bash
cp .env.example .env
```

Edit `backend/.env` if needed (defaults work out of the box):

```env
SECRET_KEY=your-secret-key-here
# DATABASE_URL defaults to sqlite:///instance/village_bank.db
```

### Step 4: Initialize Database

```bash
python -c "from database.seed import init_database; init_database()"
```

This creates all tables and seeds:

- Admin user (`admin` / `admin123`)
- Staff user (`staff` / `staff123`)
- Sample customer John Doe with 2 accounts (savings + current)

### Step 5: Start Backend Server

```bash
python run.py
```

The API runs at **http://127.0.0.1:5000**.

### Step 6: Frontend Setup

Open a **new terminal** in the project root:

```bash
cd frontend
npm install
```

### Step 7: Start Frontend Dev Server

```bash
npm run dev
```

The frontend runs at **http://localhost:5173**.

### Step 8: Access the Application

| URL                               | Purpose                     |
| --------------------------------- | --------------------------- |
| http://localhost:5173             | Landing page → Choose panel |
| http://localhost:5173/admin/login | Admin login                 |
| http://localhost:5173/staff/login | Staff login                 |
| http://localhost:5173/user/login  | Customer portal login       |
| http://127.0.0.1:5000/auth/login  | Template-based admin login  |

---

## 🔐 Default Credentials

| Role         | Username | Password      | Notes                               |
| ------------ | -------- | ------------- | ----------------------------------- |
| **Admin**    | `admin`  | `admin123`    | Full system access                  |
| **Staff**    | `staff`  | `staff123`    | Limited operational access          |
| **Customer** | `john`   | `password123` | Must change password on first login |

---

## 🔄 Authentication Flow

### Login Process (Admin/Staff)

1. User visits `/admin/login` or `/staff/login`
2. React form sends `POST /api/auth/login` with JSON `{ username, password }`
3. Flask validates credentials against `User` table using `check_password_hash()`
4. On success: session cookie set with `user_id`, `username`, `role`
5. On failure: 401 returned with error message
6. Frontend redirects to appropriate dashboard based on role

### Login Process (Customer Portal)

1. User visits `/user/login`
2. React form sends `POST /api/customer/login` with JSON `{ username, password }`
3. Flask validates against `Customer` table
4. On success: `customer_id` and `customer_name` added to session (admin session preserved)
5. If `must_change_password` is true, frontend shows `FirstLoginFlow` component

### Password Reset Flow

1. **Forgot Password (Customer):**
   - Step 1: `POST /api/customers/forgot-password/verify` — verifies account number, citizenship ID, phone, and DOB
   - Step 2: `POST /api/customers/forgot-password/set` — sets new password with validation (min 6 chars, must contain letters + numbers + special characters)
2. **Admin Reset:** `POST /api/customers/<id>/reset-password` — optionally requires current password
3. **Customer Self Change:** `POST /api/customer/change-password` — requires current + new password

### Role-Based Access

Three decorators enforce access:

| Decorator                 | Allowed Roles                                   | Used For                                                      |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `staff_or_admin_required` | Admin, Staff                                    | Customer view, transactions, account view                     |
| `admin_required`          | Admin only                                      | Archive/close accounts, approve loans, staff CRUD, audit logs |
| `api_login_required`      | Any authenticated user (Admin, Staff, Customer) | Shared endpoints                                              |

---

## 💳 Account Lifecycle

```
                    ┌─────────────┐
                    │   Created    │
                    └──────┬──────┘
                           │ activate
                           ▼
                    ┌─────────────┐
             ┌──────│   Active    │──────┐
             │      └──────┬──────┘      │
          freeze        suspend          │
             │            │              │
             ▼            ▼              │
     ┌────────────┐ ┌────────────┐      │
     │   Frozen   │ │ Suspended  │      │
     └──────┬─────┘ └─────┬──────┘      │
             │            │              │
          unfreeze     unsuspend         │
             │            │              │
             └──────┬─────┘              │
                    │                    │
                    ▼                    │
             ┌─────────────┐            │
             │   Active    │            │
             └──────┬──────┘            │
                    │ archive            │
                    ▼                    │
             ┌─────────────┐            │
             │  Archived   │            │
             └──────┬──────┘            │
                    │ close              │
                    ▼                    │
             ┌─────────────┐            │
             │   Closed    │◄───────────┘
             └─────────────┘
                    │ reopen
                    ▼
             ┌─────────────┐
             │   Active    │
             └─────────────┘
```

| Action      | From      | To        | Allowed By   |
| ----------- | --------- | --------- | ------------ |
| `activate`  | Created   | Active    | Admin        |
| `freeze`    | Active    | Frozen    | Admin, Staff |
| `unfreeze`  | Frozen    | Active    | Admin, Staff |
| `suspend`   | Active    | Suspended | Admin, Staff |
| `unsuspend` | Suspended | Active    | Admin, Staff |
| `archive`   | Active    | Archived  | Admin only   |
| `unarchive` | Archived  | Active    | Admin only   |
| `close`     | Archived  | Closed    | Admin only   |
| `reopen`    | Closed    | Active    | Admin only   |

---

## 💰 Loan Workflow

```
  Customer                  Admin/Staff                  System
     │                         │                          │
     │── Apply Loan ──────────►│                          │
     │   POST /api/loans/apply │                          │
     │                         │── Approve ──────────────►│── Disburse to account
     │                         │   POST /loans/approve/   │── Generate EMI schedule
     │                         │                          │
     │                         │── Reject ───────────────►│── Mark as rejected
     │                         │   POST /loans/reject/    │
     │                         │                          │
     │◄── Notification ────────┤                          │
     │                         │                          │
     │── Make EMI Payment ────►│── Process Repayment ────►│── Update loan balance
     │   POST /loans/repay/    │                          │── Mark EMI as paid
     │                         │                          │
     │                         │                          │── Loan fully paid ✓
```

### Loan Calculation

EMI is calculated using the standard formula:

```
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)

Where:
P = Principal amount
r = Monthly interest rate (annual rate / 12 / 100)
n = Number of monthly installments
```

---

## 💵 Transaction Workflow

### Deposit

```
Admin/Staff → Transaction Form → POST /api/transactions/deposit
├── Validates account exists and is active
├── Updates account balance (balance += amount)
├── Records transaction with UUID, type='deposit'
├── Updates total_deposits on account
├── Logs to audit trail
└── Returns updated balance
```

### Withdrawal

```
Admin/Staff → Transaction Form → POST /api/transactions/withdraw
├── Validates account exists and is active
├── Checks sufficient balance
├── Updates account balance (balance -= amount)
├── Records transaction with UUID, type='withdrawal'
├── Updates total_withdrawals on account
├── Logs to audit trail
└── Returns updated balance
```

### Fund Transfer (Customer Portal)

```
Customer → Fund Transfer → POST /api/customer/transfer
├── Validates sender account
├── Validates recipient account (own or other customer)
├── Checks sufficient balance
├── Debits sender account
├── Credits recipient account
├── Records two transactions (debit & credit) with matching reference
├── Creates notifications for both parties
└── Returns updated balances
```

---

## 🌐 API Structure

### Authentication

| Method | Endpoint               | Description            |
| ------ | ---------------------- | ---------------------- |
| POST   | `/api/auth/login`      | Admin/staff login      |
| POST   | `/api/auth/logout`     | Admin/staff logout     |
| POST   | `/api/customer/login`  | Customer portal login  |
| POST   | `/api/customer/logout` | Customer portal logout |

### Customers

| Method | Endpoint                                | Description                                                               |
| ------ | --------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/customers/`                       | List customers (filter by name, phone, citizenship, status, account type) |
| GET    | `/api/customers/<id>`                   | Get single customer                                                       |
| POST   | `/api/customers/create`                 | Create customer                                                           |
| POST   | `/api/customers/edit/<id>`              | Update customer                                                           |
| GET    | `/api/customers/summary`                | Customer summary stats                                                    |
| POST   | `/api/customers/<id>/status`            | Update customer status                                                    |
| POST   | `/api/customers/<id>/reset-password`    | Reset customer password                                                   |
| POST   | `/api/customers/forgot-password/verify` | Verify identity for forgot password                                       |
| POST   | `/api/customers/forgot-password/set`    | Set new password after verification                                       |

### Accounts

| Method | Endpoint                       | Description                                      |
| ------ | ------------------------------ | ------------------------------------------------ |
| GET    | `/api/accounts/`               | List accounts (filter by customer, type, status) |
| GET    | `/api/accounts/<number>`       | Get account by number                            |
| POST   | `/api/accounts/create`         | Create account                                   |
| GET    | `/api/accounts/detail/<id>`    | Get detailed account info                        |
| POST   | `/api/accounts/freeze/<id>`    | Freeze account                                   |
| POST   | `/api/accounts/unfreeze/<id>`  | Unfreeze account                                 |
| POST   | `/api/accounts/close/<id>`     | Close account (admin only)                       |
| POST   | `/api/accounts/suspend/<id>`   | Suspend account                                  |
| POST   | `/api/accounts/unsuspend/<id>` | Unsuspend account                                |
| POST   | `/api/accounts/archive/<id>`   | Archive account (admin only)                     |
| POST   | `/api/accounts/unarchive/<id>` | Unarchive account (admin only)                   |
| POST   | `/api/accounts/reopen/<id>`    | Reopen account (admin only)                      |
| POST   | `/api/accounts/activate/<id>`  | Activate account                                 |

### Transactions

| Method | Endpoint                     | Description         |
| ------ | ---------------------------- | ------------------- |
| GET    | `/api/transactions/`         | List transactions   |
| POST   | `/api/transactions/deposit`  | Make a deposit      |
| POST   | `/api/transactions/withdraw` | Make a withdrawal   |
| GET    | `/api/transactions/filter`   | Filter transactions |

### Loans

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| GET    | `/api/loans/`             | List all loans            |
| GET    | `/api/loans/<id>`         | Get loan details          |
| POST   | `/api/loans/apply`        | Apply for a loan          |
| POST   | `/api/loans/approve/<id>` | Approve loan (admin only) |
| POST   | `/api/loans/reject/<id>`  | Reject loan (admin only)  |
| POST   | `/api/loans/repay/<id>`   | Make loan repayment       |

### Customer Portal (API)

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| GET    | `/api/customer/dashboard`        | Customer dashboard data |
| GET    | `/api/customer/accounts`         | Customer's accounts     |
| POST   | `/api/customer/accounts/apply`   | Apply for new account   |
| GET    | `/api/customer/loans`            | Customer's loans        |
| POST   | `/api/customer/loans/apply`      | Apply for loan          |
| POST   | `/api/customer/loans/repay/<id>` | Repay loan              |
| POST   | `/api/customer/transfer`         | Transfer funds          |
| GET    | `/api/customer/transactions`     | Customer's transactions |
| GET    | `/api/customer/profile`          | Get profile             |
| POST   | `/api/customer/profile/update`   | Update profile          |
| POST   | `/api/customer/change-password`  | Change password         |
| POST   | `/api/customer/confirm-contact`  | Confirm contact info    |

### Dashboard & Reports

| Method | Endpoint                             | Description                           |
| ------ | ------------------------------------ | ------------------------------------- |
| GET    | `/api/dashboard`                     | Dashboard analytics with daily charts |
| GET    | `/api/reports`                       | Generate reports (type + period)      |
| GET    | `/api/reports/advanced`              | Advanced report filters               |
| GET    | `/api/reports/customer-summary/<id>` | Per-customer report                   |
| GET    | `/api/reports/export`                | Export report data                    |

### Notifications & Audit

| Method | Endpoint                       | Description                 |
| ------ | ------------------------------ | --------------------------- |
| GET    | `/api/notifications/`          | List notifications          |
| POST   | `/api/notifications/<id>/read` | Mark as read                |
| POST   | `/api/notifications/read-all`  | Mark all as read            |
| POST   | `/api/notifications/clear`     | Clear notifications         |
| GET    | `/api/audit-logs/`             | List audit logs             |
| GET    | `/api/audit-logs/actions`      | Get available audit actions |
| GET    | `/api/audit-logs/summary`      | Audit log summary stats     |

### Staff Management

| Method | Endpoint                 | Description               |
| ------ | ------------------------ | ------------------------- |
| GET    | `/api/staff/`            | List staff (admin only)   |
| POST   | `/api/staff/create`      | Create staff (admin only) |
| POST   | `/api/staff/delete/<id>` | Delete staff (admin only) |

---

## 🗄️ Database Structure

### Entity Relationship

```
users ──────┬─ creates transactions
             ├─ approves loans
             ├─ processes repayments
             └─ generates audit_logs

customers ──┬─ has many accounts
             ├─ has many loans
             └─ has many notifications

accounts ───┬─ has many transactions
             └─ belongs to customer

loans ──────┬─ has many repayments
             └─ belongs to customer

repayments ── belongs to loan

notifications ── belongs to user or customer

audit_logs ──── references user or customer
```

### Tables

#### `users`

| Column        | Type        | Notes              |
| ------------- | ----------- | ------------------ |
| id            | Integer     | Primary key        |
| username      | String(80)  | Unique, not null   |
| password_hash | String(256) | Not null           |
| role          | String(20)  | `admin` or `staff` |
| created_at    | DateTime    | Auto set           |

#### `customers`

| Column                     | Type        | Notes                |
| -------------------------- | ----------- | -------------------- |
| id                         | Integer     | Primary key          |
| customer_id                | String(20)  | Unique generated ID  |
| full_name                  | String(100) | Not null             |
| father_name                | String(100) |                      |
| grandfather_name           | String(100) |                      |
| dob                        | Date        |                      |
| gender                     | String(20)  |                      |
| citizenship_id             | String(50)  |                      |
| citizenship_issue_district | String(100) |                      |
| marital_status             | String(20)  |                      |
| occupation                 | String(100) |                      |
| phone_number               | String(20)  |                      |
| alternate_mobile           | String(20)  |                      |
| email                      | String(120) |                      |
| address                    | String(200) |                      |
| permanent_address          | String(200) |                      |
| temporary_address          | String(200) |                      |
| nominee_name               | String(100) |                      |
| nominee_contact            | String(20)  |                      |
| nominee_relationship       | String(50)  |                      |
| username                   | String(80)  | Generated from phone |
| password_hash              | String(256) |                      |
| must_change_password       | Boolean     | Default true         |
| mobile_confirmed           | Boolean     |                      |
| email_confirmed            | Boolean     |                      |
| status                     | String(20)  | Default `active`     |
| created_at                 | DateTime    | Auto set             |

#### `accounts`

| Column                | Type          | Notes                                                 |
| --------------------- | ------------- | ----------------------------------------------------- |
| id                    | Integer       | Primary key                                           |
| customer_id           | Integer       | FK → customers.id                                     |
| account_number        | String(20)    | Unique                                                |
| account_type          | String(20)    | `savings` or `current`                                |
| balance               | Numeric(12,2) |                                                       |
| status                | String(20)    | `active`, `frozen`, `suspended`, `archived`, `closed` |
| last_transaction_date | DateTime      |                                                       |
| total_deposits        | Numeric(12,2) |                                                       |
| total_withdrawals     | Numeric(12,2) |                                                       |
| created_at            | DateTime      | Auto set                                              |

#### `transactions`

| Column           | Type          | Notes                     |
| ---------------- | ------------- | ------------------------- |
| id               | Integer       | Primary key               |
| transaction_uuid | String(36)    | UUID for reference        |
| account_id       | Integer       | FK → accounts.id          |
| type             | String(20)    | `deposit` or `withdrawal` |
| amount           | Numeric(12,2) |                           |
| balance_after    | Numeric(12,2) |                           |
| description      | String(200)   |                           |
| status           | String(20)    | Default `completed`       |
| reference_number | String(50)    |                           |
| created_by       | Integer       | FK → users.id (nullable)  |
| created_at       | DateTime      | Auto set                  |

#### `loans`

| Column            | Type          | Notes                                                 |
| ----------------- | ------------- | ----------------------------------------------------- |
| id                | Integer       | Primary key                                           |
| loan_number       | String(20)    | Unique                                                |
| customer_id       | Integer       | FK → customers.id                                     |
| amount            | Numeric(12,2) |                                                       |
| interest_rate     | Numeric(5,2)  | Annual percentage                                     |
| duration_months   | Integer       |                                                       |
| emi               | Numeric(12,2) | Calculated                                            |
| total_payable     | Numeric(12,2) | Calculated                                            |
| total_paid        | Numeric(12,2) |                                                       |
| status            | String(20)    | `pending`, `approved`, `rejected`, `active`, `closed` |
| applied_date      | DateTime      |                                                       |
| approved_date     | DateTime      |                                                       |
| approved_by       | Integer       | FK → users.id                                         |
| last_payment_date | DateTime      |                                                       |

#### `repayments`

| Column         | Type          | Notes                        |
| -------------- | ------------- | ---------------------------- |
| id             | Integer       | Primary key                  |
| loan_id        | Integer       | FK → loans.id                |
| amount         | Numeric(12,2) |                              |
| emi_number     | Integer       |                              |
| status         | String(20)    | `pending`, `paid`, `overdue` |
| due_date       | Date          |                              |
| repayment_date | DateTime      |                              |
| received_by    | Integer       | FK → users.id                |

#### `notifications`

| Column      | Type        | Notes                                 |
| ----------- | ----------- | ------------------------------------- |
| id          | Integer     | Primary key                           |
| user_id     | Integer     | FK → users.id (nullable)              |
| customer_id | Integer     | FK → customers.id (nullable)          |
| title       | String(100) |                                       |
| message     | Text        |                                       |
| type        | String(20)  | `info`, `success`, `warning`, `error` |
| is_read     | Boolean     | Default false                         |
| created_at  | DateTime    | Auto set                              |

#### `audit_logs`

| Column        | Type       | Notes                        |
| ------------- | ---------- | ---------------------------- |
| id            | Integer    | Primary key                  |
| user_id       | Integer    | FK → users.id (nullable)     |
| customer_id   | Integer    | FK → customers.id (nullable) |
| username      | String(80) |                              |
| role          | String(20) |                              |
| action        | String(50) |                              |
| resource_type | String(50) |                              |
| resource_id   | Integer    |                              |
| description   | Text       |                              |
| ip_address    | String(45) |                              |
| status        | String(20) | `success` or `failure`       |
| created_at    | DateTime   | Auto set                     |

---

## 🔒 Security Features

### Authentication

- **Password Hashing**: Werkzeug `generate_password_hash()` (PBKDF2-SHA256 with salt)
- **Session Management**: Flask signed cookies with `SECRET_KEY`
- **Rate Limiting**: 10 login attempts per minute per IP (Flask-Limiter)

### Authorization

- **Role-Based Access**: Three decorators (`staff_or_admin_required`, `admin_required`, `api_login_required`)
- **Server-Side Enforcement**: All permission checks happen on the backend, not in the frontend
- **Session Validation**: Admin role verified against DB on each admin-only request (not just cookie)

### Password Security

- Minimum 6 characters
- Must contain letters, numbers, and special characters
- First-login forced password change for new customers
- Current password verification required for self-service changes
- Identity verification for forgot-password flow (account number, citizenship, phone, DOB)

### Input Validation

- SQL injection prevented via SQLAlchemy parameterized queries
- XSS mitigated by Flask-Jinja2 auto-escaping and React's default sanitization
- Data validation on all customer/account creation fields

### Audit Trail

- Every login attempt logged (success and failure)
- All financial transactions recorded with UUID and immutable audit log
- Admin/staff actions tracked with IP address and timestamp
- Audit log summary statistics available

---

## 🧑‍💻 Development Guide

### Project Structure

The project follows a standard Flask + React monorepo layout:

```
Bankmgmt/
├── backend/    # Flask Python application
└── frontend/   # React SPA
```

### Coding Conventions

- **Backend**: PEP 8 style, Flask blueprints for modular routing, SQLAlchemy ORM for all DB queries
- **Frontend**: Functional components with hooks, Axios service layer, CSS-in-JS via stylesheets
- **API**: RESTful JSON endpoints with consistent error format `{ error: "message" }`
- **Session**: Client-side Flask sessions (signed cookies) — no JWT tokens

### How to Extend

1. **New API Endpoint**: Add route function in `backend/routes/api_routes.py` with appropriate decorator
2. **New Frontend Page**: Create JSX in `frontend/src/pages/<role>/`, add route in `frontend/src/routes/index.jsx`
3. **New Database Model**: Add class in `backend/models.py`, run `db.create_all()` or use migration tool
4. **New Report Type**: Add generator in `backend/utils/report_helper.py`

### Running Tests

```bash
cd backend
python -m unittest tests.test_bank
```

### Building for Production

```bash
cd frontend
npm run build
```

This generates a static `dist/` folder that can be served by Flask or any web server.

---

## 🚀 Deployment Guide

### Production Backend (Flask)

```bash
cd backend
pip install gunicorn  # or waitress for Windows
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

### Production Frontend

```bash
cd frontend
npm run build
```

Serve the `dist/` folder via Flask's static file serving, nginx, or any CDN.

### Environment Variables for Production

```env
SECRET_KEY=<random-256-bit-key>
DATABASE_URL=sqlite:///instance/village_bank.db  # or PostgreSQL/MySQL URI
```

> **Note**: For multi-user production, replace SQLite with PostgreSQL or MySQL and use server-side sessions (Flask-Session with Redis).

---

## ⚠️ Known Limitations

- **SQLite**: Not suitable for concurrent multi-user production loads. Use PostgreSQL for deployment.
- **Client-Side Sessions**: Flask's default signed cookies limit session size and cannot be invalidated server-side.
- **Single-Browser Sessions**: Admin and staff cannot be simultaneously logged in from the same browser (shared session cookie).
- **No Email/SMS Integration**: Notifications are in-app only (no email or SMS delivery).
- **No Real-Time Updates**: Pages require refresh or manual refetch for new data (no WebSocket).
- **No Pagination on Some Lists**: Large datasets may cause slow page loads.
- **No Database Migrations**: Schema changes require manual intervention (no Alembic/Flyway).
- **Test Coverage**: Limited to 3 unit tests (password hashing, EMI calculation, customer+account CRUD).

---

## 🔮 Future Improvements

- [ ] Migrate to PostgreSQL for production scalability
- [ ] Add server-side sessions with Redis for admin/staff + customer multi-session support
- [ ] Implement WebSocket or Server-Sent Events for real-time notifications
- [ ] Add email delivery (SMTP) for password reset and notifications
- [ ] Add SMS gateway integration for mobile alerts
- [ ] Implement full-text search across customers and transactions
- [ ] Add database migration tooling (Alembic)
- [ ] Expand test coverage to include API endpoint tests and integration tests
- [ ] Add CI/CD pipeline with GitHub Actions
- [ ] Implement export to PDF/Excel for reports
- [ ] Add two-factor authentication (2FA) for admin accounts
- [ ] Add Docker Compose for one-command environment setup
- [ ] Implement rate limiting on all mutation endpoints (not just login)
- [ ] Add account statement generation with date range filtering
- [ ] Implement recurring deposit / fixed deposit (FD) modules

---

## 📄 License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
