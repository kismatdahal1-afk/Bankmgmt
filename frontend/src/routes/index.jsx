import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from '../pages/Landing'
import AdminLogin from '../pages/admin/Login'
import StaffLogin from '../pages/staff/Login'
import UserLogin from '../pages/user/Login'
import AdminLayout from '../layouts/AdminLayout/AdminLayout'
import StaffLayout from '../layouts/StaffLayout/StaffLayout'
import UserLayout from '../layouts/UserLayout/UserLayout'
import AdminDashboard from '../pages/admin/Dashboard'
import AdminCustomers from '../pages/admin/Customers'
import AdminCustomerForm from '../pages/admin/CustomerForm'
import AdminAccounts from '../pages/admin/Accounts'
import AdminLoans from '../pages/admin/Loans'
import AdminLoanForm from '../pages/admin/LoanForm'
import AdminRepayForm from '../pages/admin/RepayForm'
import AdminEMI from '../pages/admin/EMI'
import AdminTransactions from '../pages/admin/Transactions'
import AdminTransactionForm from '../pages/admin/TransactionForm'
import AdminReports from '../pages/admin/Reports'
import AdminStaffManagement from '../pages/admin/StaffManagement'
import AdminSettings from '../pages/admin/Settings'
import AdminAuditLogs from '../pages/admin/AdminAuditLogs'
import StaffReports from '../pages/staff/Reports'
import StaffDashboard from '../pages/staff/Dashboard'
import StaffCustomers from '../pages/staff/Customers'
import StaffCustomerForm from '../pages/staff/CustomerForm'
import StaffAccounts from '../pages/staff/Accounts'
import StaffLoans from '../pages/staff/Loans'
import StaffLoanForm from '../pages/staff/LoanForm'
import StaffRepayForm from '../pages/staff/RepayForm'
import StaffEMI from '../pages/staff/EMI'
import StaffTransactions from '../pages/staff/Transactions'
import StaffTransactionForm from '../pages/staff/TransactionForm'
import UserDashboard from '../pages/user/Dashboard'
import FirstLoginFlow from '../components/common/FirstLoginFlow'
import UserMyAccounts from '../pages/user/MyAccounts'
import UserApplyAccount from '../pages/user/ApplyAccount'
import UserMyBalance from '../pages/user/MyBalance'
import UserMyLoans from '../pages/user/MyLoans'
import UserApplyLoan from '../pages/user/ApplyLoan'
import FundTransfer from '../pages/user/FundTransfer'
import UserTransactions from '../pages/user/Transactions'
import UserNotifications from '../pages/user/Notifications'
import UserProfile from '../pages/user/Profile'
import PrivateRoute from '../components/common/PrivateRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/admin" element={<PrivateRoute role="admin"><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/create" element={<AdminCustomerForm />} />
        <Route path="customers/edit/:id" element={<AdminCustomerForm />} />
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="loans/apply" element={<AdminLoanForm />} />
        <Route path="loans/repay/:id" element={<AdminRepayForm />} />
        <Route path="emi" element={<AdminEMI />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="transactions/deposit" element={<AdminTransactionForm />} />
        <Route path="transactions/withdraw" element={<AdminTransactionForm />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="staff" element={<AdminStaffManagement />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>
      <Route path="/staff" element={<PrivateRoute role="staff"><StaffLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="customers/create" element={<StaffCustomerForm />} />
        <Route path="customers/edit/:id" element={<StaffCustomerForm />} />
        <Route path="accounts" element={<StaffAccounts />} />
        <Route path="loans" element={<StaffLoans />} />
        <Route path="loans/apply" element={<StaffLoanForm />} />
        <Route path="loans/repay/:id" element={<StaffRepayForm />} />
        <Route path="emi" element={<StaffEMI />} />
        <Route path="transactions" element={<StaffTransactions />} />
        <Route path="transactions/deposit" element={<StaffTransactionForm />} />
        <Route path="transactions/withdraw" element={<StaffTransactionForm />} />
        <Route path="reports" element={<StaffReports />} />
      </Route>
      <Route path="/user/first-login" element={<FirstLoginFlow />} />
      <Route path="/user" element={<PrivateRoute role="customer"><UserLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="my-accounts" element={<UserMyAccounts />} />
        <Route path="accounts/apply" element={<UserApplyAccount />} />
        <Route path="my-balance" element={<UserMyBalance />} />
        <Route path="my-loans" element={<UserMyLoans />} />
        <Route path="loans/apply" element={<UserApplyLoan />} />
        <Route path="transfer" element={<FundTransfer />} />
        <Route path="transactions" element={<UserTransactions />} />
        <Route path="notifications" element={<UserNotifications />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>
    </Routes>
  )
}
