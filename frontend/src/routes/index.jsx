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
import AdminNotifications from '../pages/admin/Notifications'
import AdminAccountDetail from '../pages/admin/AccountDetail'
import StaffNotifications from '../pages/staff/Notifications'
import StaffAccountDetail from '../pages/staff/AccountDetail'
import StaffReports from '../pages/staff/Reports'
import StaffDashboard from '../pages/staff/Dashboard'
import StaffCustomerForm from '../pages/staff/CustomerForm'
import StaffAccounts from '../pages/staff/Accounts'
import StaffLoans from '../pages/staff/Loans'
import StaffLoanForm from '../pages/staff/LoanForm'
import StaffRepayForm from '../pages/staff/RepayForm'
import StaffEMI from '../pages/staff/EMI'
import StaffTransactions from '../pages/staff/Transactions'
import StaffTransactionForm from '../pages/staff/TransactionForm'
import UserDashboard from '../pages/user/Dashboard'
/* import FirstLoginFlow from '../components/common/FirstLoginFlow' */
import UserMyAccounts from '../pages/user/MyAccounts'
import UserApplyAccount from '../pages/user/ApplyAccount'
import UserMyBalance from '../pages/user/MyBalance'
import UserMyLoans from '../pages/user/MyLoans'
import UserApplyLoan from '../pages/user/ApplyLoan'
import LoanApplyWizard from '../pages/user/LoanApplyWizard'
import LoanTracking from '../pages/user/LoanTracking'
import StaffLoanVerification from '../pages/staff/LoanVerification'
import StaffLoanReview from '../pages/staff/LoanReview'
import StaffLoanDashboard from '../pages/staff/StaffLoanDashboard'
import StaffNewApplications from '../pages/staff/StaffNewApplications'
import StaffVerificationQueue from '../pages/staff/StaffVerificationQueue'
import StaffBranchVisits from '../pages/staff/StaffBranchVisits'
import StaffActiveLoans from '../pages/staff/StaffActiveLoans'
import AdminLoanApplications from '../pages/admin/LoanApplications'
import AdminLoanReview from '../pages/admin/LoanReviewAdmin'
import AdminLoanDashboard from '../pages/admin/LoanDashboard'
import AdminPendingReviews from '../pages/admin/PendingReviews'
import AdminActiveLoans from '../pages/admin/ActiveLoans'
import AdminDisbursedLoans from '../pages/admin/DisbursedLoans'
import AdminClosedLoans from '../pages/admin/ClosedLoans'
import AdminLoanReports from '../pages/admin/LoanReports'
import FundTransfer from '../pages/user/FundTransfer'
import TransferSuccess from '../pages/user/TransferSuccess'
import UserTransactions from '../pages/user/Transactions'
import UserNotifications from '../pages/user/Notifications'
import UserProfile from '../pages/user/Profile'
import PrivateRoute from '../components/common/PrivateRoute'
import PlaceholderPage from '../components/common/PlaceholderPage'

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
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="customers/edit/:id" element={<AdminCustomerForm />} />
        <Route path="account-management/:accountId" element={<AdminAccountDetail />} />
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
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="loan/dashboard" element={<AdminLoanDashboard />} />
        <Route path="loan/applications" element={<AdminLoanApplications />} />
        <Route path="loan/applications/:id" element={<AdminLoanReview />} />
        <Route path="loan/pending" element={<AdminPendingReviews />} />
        <Route path="loan/active" element={<AdminActiveLoans />} />
        <Route path="loan/disbursed" element={<AdminDisbursedLoans />} />
        <Route path="loan/closed" element={<AdminClosedLoans />} />
        <Route path="loan/reports" element={<AdminLoanReports />} />
        <Route path="loan-dashboard" element={<AdminLoanDashboard />} />
        <Route path="loan-approval" element={<AdminLoanApplications />} />
        <Route path="loan-approval/:id" element={<AdminLoanReview />} />
      </Route>
      <Route path="/staff" element={<PrivateRoute role="staff"><StaffLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="accounts" element={<StaffAccounts />} />
        <Route path="customers/edit/:id" element={<StaffCustomerForm />} />
        <Route path="account-management/:accountId" element={<StaffAccountDetail />} />
        <Route path="loans" element={<StaffLoans />} />
        <Route path="loans/apply" element={<StaffLoanForm />} />
        <Route path="loans/repay/:id" element={<StaffRepayForm />} />
        <Route path="emi" element={<StaffEMI />} />
        <Route path="transactions" element={<StaffTransactions />} />
        <Route path="transactions/deposit" element={<StaffTransactionForm />} />
        <Route path="transactions/withdraw" element={<StaffTransactionForm />} />
        <Route path="reports" element={<StaffReports />} />
        <Route path="notifications" element={<StaffNotifications />} />
        <Route path="loan/active" element={<StaffActiveLoans />} />
        <Route path="loan/dashboard" element={<StaffLoanDashboard />} />
        <Route path="loan/new-applications" element={<StaffNewApplications />} />
        <Route path="loan/verification-queue" element={<StaffVerificationQueue />} />
        <Route path="loan/visits" element={<StaffBranchVisits />} />
        <Route path="loan/review/:id" element={<StaffLoanReview />} />
        <Route path="loan/assigned" element={<StaffNewApplications />} />
        <Route path="loan/pending" element={<StaffVerificationQueue />} />
        <Route path="loan-verification" element={<StaffNewApplications />} />
        <Route path="loan-verification/dashboard" element={<StaffLoanDashboard />} />
        <Route path="loan-verification/:id" element={<StaffLoanReview />} />
        <Route path="loan-verification/all" element={<StaffVerificationQueue />} />
      </Route>
      <Route path="/user" element={<PrivateRoute role="customer"><UserLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="my-accounts" element={<UserMyAccounts />} />
        <Route path="accounts/apply" element={<UserApplyAccount />} />
        <Route path="my-balance" element={<UserMyBalance />} />
        <Route path="my-loans" element={<UserMyLoans />} />
        <Route path="loans/apply" element={<UserApplyLoan />} />
        <Route path="loan/apply" element={<LoanApplyWizard />} />
        <Route path="loan/apply/:id" element={<LoanApplyWizard />} />
        <Route path="loan/tracking" element={<UserMyLoans />} />
        <Route path="loan/tracking/:id" element={<LoanTracking />} />
        <Route path="loan/active" element={<UserMyLoans />} />
        <Route path="loan/history" element={<PlaceholderPage title="Loan History" icon="history" />} />
        <Route path="loans/apply-wizard" element={<LoanApplyWizard />} />
        <Route path="loans/apply-wizard/:id" element={<LoanApplyWizard />} />
        <Route path="loans/tracking/:id" element={<LoanTracking />} />
        <Route path="transfer" element={<FundTransfer />} />
        <Route path="transfer/success" element={<TransferSuccess />} />
        <Route path="transactions" element={<UserTransactions />} />
        <Route path="notifications" element={<UserNotifications />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>
    </Routes>
  )
}
