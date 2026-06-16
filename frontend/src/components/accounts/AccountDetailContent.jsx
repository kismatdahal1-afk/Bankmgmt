import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'
import ReceiptView from '../common/ReceiptView'

/* ---- Icon action config ---- */
const ACTION_ICONS = {
  deposit:      { icon: 'add_circle',        label: 'Deposit',        color: '#4caf50' },
  withdraw:     { icon: 'remove_circle',     label: 'Withdraw',       color: '#f44336' },
  apply_loan:   { icon: 'request_quote',     label: 'Apply Loan',     color: '#2196f3' },
  edit_profile: { icon: 'edit',              label: 'Edit Profile',   color: '#ff9800' },
}

/* Toggle-based status action helpers */
function suspendAction(acc) {
  if (acc.status === 'active')  return { icon: 'block',       label: 'Suspend',   color: '#ff9800',  url: `/api/accounts/suspend/${acc.id}`,   confirmMsg: 'Suspend this account?' }
  if (acc.status === 'suspended') return { icon: 'check_circle', label: 'Unsuspend', color: '#4caf50', url: `/api/accounts/unsuspend/${acc.id}`, confirmMsg: 'Unsuspend this account?' }
  return null
}
function freezeAction(acc) {
  if (acc.status === 'active')  return { icon: 'ac_unit',      label: 'Freeze',    color: '#009688', url: `/api/accounts/freeze/${acc.id}`,   confirmMsg: 'Freeze this account?' }
  if (acc.status === 'frozen')  return { icon: 'check_circle', label: 'Unfreeze',  color: '#4caf50',  url: `/api/accounts/unfreeze/${acc.id}`, confirmMsg: 'Unfreeze this account?' }
  return null
}
function archiveAction(acc) {
  if (acc.status !== 'archived' && acc.status !== 'closed') return { icon: 'archive',   label: 'Archive',       color: '#9e9e9e', url: `/api/accounts/archive/${acc.id}`,   confirmMsg: 'Archive this account?' }
  if (acc.status === 'archived') return { icon: 'unarchive', label: 'Unarchive',     color: '#4caf50', url: `/api/accounts/unarchive/${acc.id}`, confirmMsg: 'Unarchive this account?' }
  return null
}
function closeAction(acc) {
  if (acc.status !== 'closed' && acc.status !== 'archived') return { icon: 'cancel', label: 'Close Account', color: '#f44336', url: `/api/accounts/close/${acc.id}`,   confirmMsg: 'Close this account? Balance must be zero.' }
  if (acc.status === 'closed') return { icon: 'replay',     label: 'Reopen',        color: '#4caf50', url: `/api/accounts/reopen/${acc.id}`, confirmMsg: 'Reopen this account?' }
  return null
}

export default function AccountDetailContent({ role }) {
  const { accountId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  /* ---- receipt modal ---- */
  const [receiptTxn, setReceiptTxn] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const fetchReceipt = (txn) => {
    setReceiptTxn(txn)
    setReceiptData(null)
    setReceiptLoading(true)
    fetch(`/api/transactions/${txn.id}/receipt`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.receipt) setReceiptData(d.receipt); setReceiptLoading(false) })
      .catch(() => setReceiptLoading(false))
  }

  const closeReceipt = () => { setReceiptTxn(null); setReceiptData(null) }

  useEffect(() => {
    if (receiptTxn) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [receiptTxn])

  /* ---- password reset modal ---- */
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [resetCurrentPwd, setResetCurrentPwd] = useState('')
  const [resetNewPwd, setResetNewPwd] = useState('')
  const [resetConfirmPwd, setResetConfirmPwd] = useState('')
  const [resetPwdMsg, setResetPwdMsg] = useState('')
  const [resetPwdErr, setResetPwdErr] = useState('')

  /* ---- forgot-password workflow ---- */
  const [showForgotPwd, setShowForgotPwd] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1=verify, 2=new password
  /* verification fields */
  const [fpAccountNum, setFpAccountNum] = useState('')
  const [fpCitizenship, setFpCitizenship] = useState('')
  const [fpPhone, setFpPhone] = useState('')
  const [fpDob, setFpDob] = useState('')
  const [fpVerifiedCustId, setFpVerifiedCustId] = useState(null)
  /* new password fields */
  const [fpNewPwd, setFpNewPwd] = useState('')
  const [fpConfirmPwd, setFpConfirmPwd] = useState('')
  const [fpMsg, setFpMsg] = useState('')
  const [fpErr, setFpErr] = useState('')

  const isAdmin = role === 'admin'
  const prefix = isAdmin ? '/admin' : '/staff'

  const fetchDetail = () => {
    setLoading(true)
    fetch(`/api/accounts/detail/${accountId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load account details'); setLoading(false) })
  }

  useEffect(() => { fetchDetail() }, [accountId])

  const doAction = async (url, msg) => {
    if (msg && !confirm(msg)) return
    try {
      const r = await fetch(url, { method: 'POST', credentials: 'include' })
      const d = await r.json()
      if (d.error) { alert(d.error); return }
      fetchDetail()
    } catch (e) { console.error(e) }
  }

  /* ==== Reset Password Modal ==== */
  const openResetPwdModal = () => {
    setResetCurrentPwd(''); setResetNewPwd(''); setResetConfirmPwd(''); setResetPwdMsg(''); setResetPwdErr(''); setShowResetPwd(true)
  }
  const handleResetPwd = async () => {
    setResetPwdErr('')
    const pwd = resetNewPwd.trim()
    if (!pwd || pwd.length < 6) { setResetPwdErr('Password must be at least 6 characters'); return }
    if (pwd !== resetConfirmPwd.trim()) { setResetPwdErr('Passwords do not match'); return }
    const hasLetter = /[a-zA-Z]/.test(pwd)
    const hasDigit = /\d/.test(pwd)
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd)
    if (!(hasLetter && hasDigit && hasSpecial)) { setResetPwdErr('Must contain letters, numbers, and a special character'); return }
    const body = { new_password: pwd }
    const curPwd = resetCurrentPwd.trim()
    if (curPwd) body.current_password = curPwd
    try {
      const r = await fetch(`/api/customers/${data?.customer?.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (d.error) { setResetPwdErr(d.error); return }
      setResetPwdMsg('Password has been updated successfully.')
    } catch (e) { setResetPwdErr('Failed to reset password'); console.error(e) }
  }

  /* ==== Forgot Password Modal ==== */
  const openForgotPwdModal = () => {
    setForgotStep(1); setFpAccountNum(''); setFpCitizenship(''); setFpPhone(''); setFpDob('')
    setFpVerifiedCustId(null); setFpNewPwd(''); setFpConfirmPwd(''); setFpMsg(''); setFpErr('')
    setShowForgotPwd(true)
  }
  const handleFpVerify = async () => {
    setFpErr('')
    if (!fpAccountNum || !fpCitizenship || !fpPhone || !fpDob) {
      setFpErr('All fields are required'); return
    }
    try {
      const r = await fetch('/api/customers/forgot-password/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: fpAccountNum.trim(),
          citizenship_id: fpCitizenship.trim(),
          phone_number: fpPhone.trim(),
          dob: fpDob
        })
      })
      const d = await r.json()
      if (d.error) { setFpErr(d.error); return }
      if (d.verified) {
        setFpVerifiedCustId(d.customer_id)
        setForgotStep(2)
      }
    } catch (e) { setFpErr('Verification failed'); console.error(e) }
  }
  const handleFpSetPwd = async () => {
    setFpErr('')
    const pwd = fpNewPwd.trim()
    if (!pwd || pwd.length < 6) { setFpErr('Password must be at least 6 characters'); return }
    if (pwd !== fpConfirmPwd.trim()) { setFpErr('Passwords do not match'); return }
    const hasLetter = /[a-zA-Z]/.test(pwd)
    const hasDigit = /\d/.test(pwd)
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd)
    if (!(hasLetter && hasDigit && hasSpecial)) { setFpErr('Must contain letters, numbers, and a special character'); return }
    try {
      const r = await fetch('/api/customers/forgot-password/set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: fpVerifiedCustId, new_password: pwd })
      })
      const d = await r.json()
      if (d.error) { setFpErr(d.error); return }
      setFpMsg('Password has been updated successfully. The customer can now log in with the new password.')
    } catch (e) { setFpErr('Failed to set password'); console.error(e) }
  }

  /* ---- Loading / Error states ---- */
  if (loading) {
    return (
      <div className="empty" style={{ minHeight: '300px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '3rem' }}>sync</span>
        <div>Loading account details...</div>
      </div>
    )
  }

  if (error || !data || !data.account) {
    return (
      <div className="empty" style={{ minHeight: '300px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '3rem' }}>error</span>
        <div>{error || 'Account not found'}</div>
        <Link to={`${prefix}/accounts`} className="btn btn-secondary" style={{ marginTop: '12px' }}>Back to Accounts</Link>
      </div>
    )
  }

  const { account, customer, loans, transactions } = data
  const activeLoans = loans?.filter(l => l.status === 'approved' || l.status === 'overdue') || []
  const totalDeposits = transactions?.filter(t => t.type === 'deposit' && t.status === 'successful').reduce((s, t) => s + t.amount, 0) || 0
  const totalWithdrawals = transactions?.filter(t => t.type === 'withdrawal' && t.status === 'successful').reduce((s, t) => s + t.amount, 0) || 0

  const tabs = [
    { id: 'overview',          label: 'Overview',          icon: 'dashboard' },
    { id: 'profile',           label: 'Profile',           icon: 'person' },
    { id: 'banking',           label: 'Banking',           icon: 'account_balance' },
    { id: 'loans',             label: 'Loans',             icon: 'payments' },
    { id: 'transactions',      label: 'Transactions',      icon: 'receipt_long' },
    { id: 'account_actions',   label: 'Account Actions',   icon: 'bolt' },
    { id: 'password_mgmt',     label: 'Password',          icon: 'key' },
  ]

  const renderTabNav = () => (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', overflow: 'auto' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`btn btn-sm ${activeTab === t.id ? '' : 'btn-secondary'}`}
          style={{
            flex: 1, whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: '6px',
            background: activeTab === t.id ? 'var(--accent-color)' : 'transparent',
            color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer', fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )

  /* ---- Helper: render icon action button from action object {icon, label, color} ---- */
  const renderActionCard = (action, onClick) => {
    if (!action) return null
    return (
      <button
        onClick={onClick}
        title={action.label}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '6px', padding: '16px 8px', borderRadius: '10px', border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)', cursor: 'pointer',
          transition: 'all 0.2s', minWidth: '80px'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '1.6rem', color: action.color }}>{action.icon}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>{action.label}</span>
      </button>
    )
  }

  /* ---- Helper: render legacy icon action button by key (for transaction cards) ---- */
  const renderActionCardByKey = (key, onClick, disabled = false) => {
    const a = ACTION_ICONS[key]
    if (!a) return null
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={a.label}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '6px', padding: '16px 8px', borderRadius: '10px', border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1, transition: 'all 0.2s', minWidth: '80px'
        }}
        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '1.6rem', color: disabled ? 'var(--text-muted)' : a.color }}>{a.icon}</span>
        <span style={{ fontSize: '0.7rem', color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>{a.label}</span>
      </button>
    )
  }

  return (
    <>
      {/* Header with large typography */}
      <div className="top-header">
        <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to={`${prefix}/accounts`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} title="Back to Accounts">
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>arrow_back</span>
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{customer?.full_name || 'Account'}</h1>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
              <code style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontSize: '1.1rem' }}>{account.account_number}</code>
            </p>
          </div>
        </div>
      </div>

      {renderTabNav()}

      {/* ================ OVERVIEW ================ */}
      {activeTab === 'overview' && (
        <div>
          {/* Large Current Balance Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(99,102,241,0.05) 100%)',
            border: '1px solid rgba(76,175,80,0.3)', borderRadius: '12px', padding: '24px',
            marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Current Balance</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: account.balance > 0 ? '#4caf50' : 'var(--text-muted)', lineHeight: 1 }}>{formatCurrency(account.balance)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <StatusBadge status={account.account_type} /> &middot; <StatusBadge status={account.status} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account Created</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>{account.created_at ? formatDate(account.created_at) : '—'}</div>
              {account.last_transaction_date && (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Last Activity</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>{formatDateTime(account.last_transaction_date)}</div>
                </>
              )}
            </div>
          </div>

          {/* Summary Cards: Deposits, Withdrawals, Active Loans, EMI Overdue */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div className="card-stat"><span className="stat-title">Total Deposits</span><span className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalDeposits)}</span></div>
            <div className="card-stat"><span className="stat-title">Total Withdrawals</span><span className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalWithdrawals)}</span></div>
            <div className="card-stat"><span className="stat-title">Active Loans</span><span className="stat-value" style={{ fontSize: '1.3rem' }}>{activeLoans.length}</span></div>
            <div className="card-stat"><span className="stat-title">EMI Overdue</span><span className="stat-value" style={{ fontSize: '1.3rem' }}>{activeLoans.length > 0 ? `${activeLoans.filter(l => l.is_overdue).length}` : '0'}</span></div>
          </div>

          {/* Recent Transactions */}
          <div className="table-container">
            <div className="table-header-bar">
              <span className="table-title">Recent Transactions</span>
              <button onClick={() => setActiveTab('transactions')} className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>View All</button>
            </div>
            <table className="custom-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance After</th></tr>
              </thead>
              <tbody>
                {(transactions || []).slice(0, 5).map(t => (
                  <tr key={t.id} onClick={() => fetchReceipt(t)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: '0.8rem' }}>{formatDateTime(t.created_at)}</td>
                    <td><StatusBadge status={t.type} /></td>
                    <td style={{ fontWeight: 600, color: t.type === 'deposit' ? '#4caf50' : '#f44336' }}>{formatCurrency(t.amount)}</td>
                    <td>{formatCurrency(t.balance_after)}</td>
                  </tr>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================ PROFILE ================ */}
      {activeTab === 'profile' && customer && (
        <div className="table-container">
          <div className="table-header-bar"><span className="table-title">Personal Information</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', padding: '16px' }}>
            {[
              ['Full Name', customer.full_name],
              ['Father Name', customer.father_name],
              ['Grandfather Name', customer.grandfather_name],
              ['Date of Birth', customer.dob ? formatDate(customer.dob) : '—'],
              ['Gender', customer.gender],
              ['Citizenship Number', customer.citizenship_id],
              ['Citizenship Issued District', customer.citizenship_issue_district],
              ['Marital Status', customer.marital_status],
              ['Occupation', customer.occupation],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: '#fff', fontSize: '0.9rem' }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '0 16px' }} />
          <div className="table-header-bar"><span className="table-title">Contact Information</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', padding: '16px' }}>
            {[
              ['Mobile Number', customer.phone_number],
              ['Alternate Mobile Number', customer.alternate_mobile],
              ['Email', customer.email],
              ['Permanent Address', customer.address],
              ['Temporary Address', customer.temporary_address],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: '#fff', fontSize: '0.9rem' }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '0 16px' }} />
          <div className="table-header-bar"><span className="table-title">Nominee Information</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', padding: '16px' }}>
            {[
              ['Nominee Name', customer.nominee_name],
              ['Nominee Contact', customer.nominee_contact],
              ['Nominee Relationship', customer.nominee_relationship],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: '#fff', fontSize: '0.9rem' }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================ BANKING ================ */}
      {activeTab === 'banking' && (
        <div className="table-container">
          <div className="table-header-bar"><span className="table-title">Banking Information</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', padding: '16px' }}>
            {[
              ['Account Number', <code key="an" style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontSize: '1rem' }}>{account.account_number}</code>],
              ['Account Type', <StatusBadge key="at" status={account.account_type} />],
              ['Status', <StatusBadge key="as" status={account.status} />],
              ['Branch', 'Village Bank'],
              ['Current Balance', <span key="cb" style={{ fontWeight: 700, color: account.balance > 0 ? '#4caf50' : 'var(--text-muted)' }}>{formatCurrency(account.balance)}</span>],
              ['Total Deposits', formatCurrency(totalDeposits)],
              ['Total Withdrawals', formatCurrency(totalWithdrawals)],
              ['Last Transaction Date', account.last_transaction_date ? formatDateTime(account.last_transaction_date) : '—'],
              ['Account Created', account.created_at ? formatDateTime(account.created_at) : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: '#fff', fontSize: '0.9rem' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================ LOANS ================ */}
      {activeTab === 'loans' && (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Loans</span>
            <Link to={`${prefix}/loans/apply?customer_id=${customer?.id}`} className="btn btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>add</span> Apply Loan
            </Link>
          </div>
          {loans && loans.length > 0 ? (
            <table className="custom-table">
              <thead>
                <tr><th>Loan Number</th><th>Amount</th><th>Interest Rate</th><th>EMI</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id}>
                    <td><code style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{l.loan_number}</code></td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(l.amount)}</td>
                    <td>{l.interest_rate}%</td>
                    <td>{formatCurrency(l.emi)}</td>
                    <td>{formatCurrency(l.total_paid)}</td>
                    <td>{formatCurrency(l.total_payable - l.total_paid)}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      {l.status === 'approved' ? (
                        <Link to={`${prefix}/loans/repay/${l.id}`} className="btn btn-sm btn-success" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Repay</Link>
                      ) : l.status === 'pending' && isAdmin ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => doAction(`/api/loans/approve/${l.id}`, `Approve loan ${l.loan_number}?`)} className="btn btn-sm btn-success" style={{ padding: '2px 8px', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => doAction(`/api/loans/reject/${l.id}`, `Reject loan ${l.loan_number}?`)} className="btn btn-sm btn-danger" style={{ padding: '2px 8px', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}>Reject</button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: '32px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem' }}>credit_card_off</span>
              <div>No loans for this customer</div>
            </div>
          )}
        </div>
      )}

      {/* ================ TRANSACTIONS ================ */}
      {activeTab === 'transactions' && (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Transactions</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Link to={`${prefix}/transactions/deposit?account_number=${account.account_number}`} className="btn btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>add_circle</span> Deposit
              </Link>
              <Link to={`${prefix}/transactions/withdraw?account_number=${account.account_number}`} className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>remove_circle</span> Withdraw
              </Link>
            </div>
          </div>
          {transactions && transactions.length > 0 ? (
            <table className="custom-table">
              <thead>
                <tr><th>Date</th><th>Reference</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Description</th><th>Status</th></tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} onClick={() => fetchReceipt(t)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: '0.8rem' }}>{formatDateTime(t.created_at)}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{t.reference_number || '—'}</td>
                    <td><StatusBadge status={t.type} /></td>
                    <td style={{ fontWeight: 600, color: t.type === 'deposit' ? '#4caf50' : '#f44336' }}>{formatCurrency(t.amount)}</td>
                    <td>{formatCurrency(t.balance_after)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.description || '—'}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: '32px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2.5rem' }}>receipt_long</span>
              <div>No transactions found</div>
            </div>
          )}
        </div>
      )}

      {/* ================ ACCOUNT ACTIONS ================ */}
      {activeTab === 'account_actions' && (
        <div>
          {/* Status Management — all cards visible at all times */}
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <div className="table-header-bar"><span className="table-title">Status Management</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', padding: '16px' }}>
              {/* Suspend ↔ Unsuspend */}
              {(() => { const a = suspendAction(account); return a ? renderActionCard(a, () => doAction(a.url, a.confirmMsg)) : null })()}
              {/* Freeze ↔ Unfreeze */}
              {(() => { const a = freezeAction(account); return a ? renderActionCard(a, () => doAction(a.url, a.confirmMsg)) : null })()}
              {/* Archive ↔ Unarchive (admin only) */}
              {isAdmin && (() => { const a = archiveAction(account); return a ? renderActionCard(a, () => doAction(a.url, a.confirmMsg)) : null })()}
              {/* Close ↔ Reopen (admin only) */}
              {isAdmin && (() => { const a = closeAction(account); return a ? renderActionCard(a, () => doAction(a.url, a.confirmMsg)) : null })()}
            </div>
          </div>

          {/* Account Transactions — all cards visible at all times */}
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <div className="table-header-bar"><span className="table-title">Account Transactions</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px', padding: '16px' }}>
              {renderActionCardByKey('deposit', () => window.location.href = `${prefix}/transactions/deposit?account_number=${account.account_number}`)}
              {renderActionCardByKey('withdraw', () => window.location.href = `${prefix}/transactions/withdraw?account_number=${account.account_number}`)}
              {renderActionCardByKey('apply_loan', () => window.location.href = `${prefix}/loans/apply?customer_id=${customer?.id}`)}
              {renderActionCardByKey('edit_profile', () => window.location.href = `${prefix}/customers/edit/${customer?.id}`)}
            </div>
          </div>
        </div>
      )}

      {/* ================ PASSWORD MANAGEMENT ================ */}
      {activeTab === 'password_mgmt' && (
        <div>
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <div className="table-header-bar"><span className="table-title">Password Management</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', padding: '16px' }}>
              <div
                onClick={openResetPwdModal}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '20px 12px', borderRadius: '10px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: 'var(--accent-color)' }}>key</span>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Reset Password</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Set a new password for this customer</span>
              </div>
              <div
                onClick={openForgotPwdModal}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '20px 12px', borderRadius: '10px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff9800'; e.currentTarget.style.background = 'rgba(255,152,0,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: '#ff9800' }}>lock_reset</span>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Forgot Password</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Verify identity & set new password</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ RESET PASSWORD MODAL ================ */}
      {showResetPwd && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowResetPwd(false) }}
        >
          <div className="form-card" style={{ maxWidth: '440px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowResetPwd(false)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <span className="material-symbols-rounded">close</span>
            </button>
            <h3 style={{ marginBottom: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>key</span> Reset Password
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Set a new password for <strong style={{ color: '#fff' }}>{customer?.full_name}</strong>.
            </p>
            {resetPwdMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50', color: '#4caf50', fontSize: '0.85rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>check_circle</span>
                {resetPwdMsg}
              </div>
            )}
            {resetPwdErr && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', color: '#f44336', fontSize: '0.85rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>error</span>
                {resetPwdErr}
              </div>
            )}
            {!resetPwdMsg && (
              <>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Username</label>
                  <input type="text" className="form-control" value={customer?.username || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Current Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional for admin reset)</span></label>
                  <input type="password" className="form-control" value={resetCurrentPwd} onChange={e => setResetCurrentPwd(e.target.value)} placeholder="Leave blank for admin override" />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>New Password</label>
                  <input type="password" className="form-control" value={resetNewPwd} onChange={e => setResetNewPwd(e.target.value)} placeholder="Min 6 chars, letters, numbers, special" />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input type="password" className="form-control" value={resetConfirmPwd} onChange={e => setResetConfirmPwd(e.target.value)} placeholder="Re-enter new password" />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowResetPwd(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={handleResetPwd} className="btn btn-primary">Update Password</button>
                </div>
              </>
            )}
            {resetPwdMsg && (
              <button onClick={() => setShowResetPwd(false)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
            )}
          </div>
        </div>
      )}

      {/* ================ FORGOT PASSWORD MODAL ================ */}
      {showForgotPwd && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotPwd(false) }}
        >
          <div className="form-card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowForgotPwd(false)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <span className="material-symbols-rounded">close</span>
            </button>
            <h3 style={{ marginBottom: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <span className="material-symbols-rounded" style={{ color: '#ff9800' }}>lock_reset</span> Forgot Password
            </h3>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: forgotStep >= 1 ? '#ff9800' : 'var(--border-color)' }} />
              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: forgotStep >= 2 ? '#4caf50' : 'var(--border-color)' }} />
            </div>

            {forgotStep === 1 && !fpMsg && (
              <>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Step 1: Verify customer identity using the following details.
                </p>
                {fpErr && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', color: '#f44336', fontSize: '0.85rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>error</span>
                    {fpErr}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Account Number</label>
                  <input type="text" className="form-control" value={fpAccountNum} onChange={e => setFpAccountNum(e.target.value)} placeholder="VB-2026-..." />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Citizenship Number</label>
                  <input type="text" className="form-control" value={fpCitizenship} onChange={e => setFpCitizenship(e.target.value)} placeholder="121516-1012" />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Registered Mobile Number</label>
                  <input type="text" className="form-control" value={fpPhone} onChange={e => setFpPhone(e.target.value)} placeholder="9841..." />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Date of Birth</label>
                  <input type="date" className="form-control" value={fpDob} onChange={e => setFpDob(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForgotPwd(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={handleFpVerify} className="btn btn-primary">Verify Identity</button>
                </div>
              </>
            )}

            {forgotStep === 2 && !fpMsg && (
              <>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Step 2: Identity verified for <strong style={{ color: '#fff' }}>{customer?.full_name}</strong>. Set a new password.
                </p>
                {fpErr && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: 'rgba(244,67,54,0.1)', border: '1px solid #f44336', color: '#f44336', fontSize: '0.85rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>error</span>
                    {fpErr}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>New Password</label>
                  <input type="password" className="form-control" value={fpNewPwd} onChange={e => setFpNewPwd(e.target.value)} placeholder="Min 6 chars, letters, numbers, special" />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input type="password" className="form-control" value={fpConfirmPwd} onChange={e => setFpConfirmPwd(e.target.value)} placeholder="Re-enter new password" />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForgotPwd(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={handleFpSetPwd} className="btn btn-primary">Update Password</button>
                </div>
              </>
            )}

            {fpMsg && (
              <>
                <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50', color: '#4caf50', fontSize: '0.85rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>check_circle</span>
                  {fpMsg}
                </div>
                <button onClick={() => setShowForgotPwd(false)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
              </>
            )}
          </div>
        </div>
      )}

      {receiptTxn && (
        <div className="modal-overlay" onClick={closeReceipt}>
          <div className="modal-receipt-wrap" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button className="receipt-close-btn" onClick={closeReceipt}>Close</button>
              {receiptLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>sync</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Loading receipt...</div>
                </div>
              ) : receiptData ? (
                <ReceiptView receipt={receiptData} showActions />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>receipt_long</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Receipt not available.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-receipt-wrap {
          width: 100%; max-width: 680px;
          max-height: 85vh; overflow-y: auto;
        }
        .receipt-close-btn {
          background: rgba(239,68,68,0.12); color: var(--danger);
          border: 1px solid rgba(239,68,68,0.3);
          padding: 4px 14px; border-radius: 999px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
          cursor: pointer; transition: all 0.2s;
          text-transform: uppercase;
        }
        .receipt-close-btn:hover { background: rgba(239,68,68,0.2); }
        .modal-receipt-wrap::-webkit-scrollbar { width: 6px; }
        .modal-receipt-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
      `}</style>
    </>
  )
}
