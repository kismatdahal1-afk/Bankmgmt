import React, { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime, formatDate } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

const REPORT_CATEGORIES = [
  { id: 'daily', label: 'Daily Ledger', icon: 'calendar_today' },
  { id: 'weekly', label: 'Weekly', icon: 'date_range' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar_month' },
  { id: 'quarterly', label: 'Quarterly', icon: 'finance' },
  { id: 'yearly', label: 'Yearly', icon: 'stat_3' },
]
const BANKING_CATEGORIES = [
  { id: 'deposit', label: 'Deposit Report', icon: 'south_west' },
  { id: 'withdrawal', label: 'Withdrawal Report', icon: 'north_east' },
  { id: 'loan', label: 'Loan Report', icon: 'handshake' },
  { id: 'emi_collection', label: 'EMI Collection', icon: 'payments' },
  { id: 'interest', label: 'Interest Report', icon: 'percent' },
  { id: 'customer', label: 'Customer Report', icon: 'group' },
  { id: 'account', label: 'Account Report', icon: 'account_balance' },
]

export default function StaffReports() {
  const [activeTab, setActiveTab] = useState('legacy')
  const [reportType, setReportType] = useState('daily')
  const [bankingCategory, setBankingCategory] = useState('deposit')
  const [data, setData] = useState(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('')
  const [customerSummary, setCustomerSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportFormat, setExportFormat] = useState('json')

  const fetchReports = (type, customerId) => {
    setLoading(true)
    let url = `/api/reports?type=${type}`
    if (customerId) url += `&customer_id=${customerId}`
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const fetchAdvancedReport = () => {
    setLoading(true)
    const params = new URLSearchParams({ type: reportType, category: bankingCategory })
    fetch(`/api/reports/advanced?${params}`).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const fetchCustomerSummary = () => {
    if (!selectedCustomerId) return
    setLoading(true)
    fetch(`/api/reports/customer-summary/${selectedCustomerId}`).then(r => r.json()).then(d => { setCustomerSummary(d); setLoading(false) }).catch(() => setLoading(false))
  }

  const exportReport = async (fmt) => {
    const params = new URLSearchParams({ type: reportType, category: bankingCategory, format: fmt })
    try {
      const r = await fetch(`/api/reports/export?${params}`)
      const d = await r.json()
      if (d.csv) {
        const blob = new Blob([d.csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = d.filename || `report_${new Date().toISOString().slice(0,10)}.csv`
        a.click()
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (activeTab === 'legacy') {
      fetchReports(reportType, selectedCustomerId)
    } else if (activeTab === 'advanced') {
      fetchAdvancedReport()
    } else if (activeTab === 'customer-summary') {
      if (selectedCustomerId) fetchCustomerSummary()
      else { setLoading(false) }
    }
  }, [activeTab, reportType, bankingCategory])

  const dailySummary = data?.daily_summary || {}
  const monthlySummary = data?.monthly_summary || {}
  const netFlow = parseFloat(dailySummary.deposits || 0) + parseFloat(dailySummary.repayments || 0) - parseFloat(dailySummary.withdrawals || 0)
  const today = data?.today ? new Date(data.today) : new Date()

  const renderLegacy = () => (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {REPORT_CATEGORIES.map(t => (
          <button key={t.id} onClick={() => { setReportType(t.id); setSelectedCustomerId('') }}
            className={`btn ${reportType === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            <span className="material-symbols-rounded">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      {reportType === 'daily' && (
        <>
          <div className="grid-stats" style={{ marginBottom: '24px' }}>
            <div className="card-stat stat-success"><span className="stat-title">Daily Deposits</span><span className="stat-value">{formatCurrency(dailySummary.deposits)}</span><span className="stat-sub">Total credit transactions today</span></div>
            <div className="card-stat stat-danger"><span className="stat-title">Daily Withdrawals</span><span className="stat-value">{formatCurrency(dailySummary.withdrawals)}</span><span className="stat-sub">Total debit transactions today</span></div>
            <div className="card-stat stat-warning"><span className="stat-title">Daily Repayments</span><span className="stat-value">{formatCurrency(dailySummary.repayments)}</span><span className="stat-sub">Total loan collections today</span></div>
            <div className="card-stat"><span className="stat-title">Net Cash Flow</span><span className="stat-value" style={{ color: netFlow >= 0 ? 'var(--success)' : 'var(--danger)' }}>{netFlow < 0 ? '-' : ''}{formatCurrency(Math.abs(netFlow))}</span><span className="stat-sub">Net change today</span></div>
          </div>
          {data?.daily_transactions && (
            <div className="table-container" style={{ marginBottom: '24px' }}>
              <div className="table-header-bar"><span className="table-title">Today's Transactions ({today.toLocaleDateString()})</span>
                <button onClick={() => exportReport('csv')} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>file_download</span> Export CSV
                </button>
              </div>
              <table className="custom-table"><thead><tr><th>Txn ID</th><th>Time</th><th>Member / Acc</th><th>Type</th><th>Amount</th><th>Memo</th></tr></thead>
                <tbody>{data.daily_transactions.map(txn => (
                  <tr key={txn.id}><td><code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{txn.reference_number || txn.transaction_uuid}</code></td>
                    <td>{new Date(txn.created_at).toLocaleTimeString()}</td>
                    <td>{txn.account?.customer?.full_name} (Acc: {txn.account?.account_number})</td>
                    <td><StatusBadge status={txn.type} /></td>
                    <td style={{ fontWeight: 700, color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>{txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}</td>
                    <td>{txn.description || '—'}</td></tr>
                ))}</tbody></table>
            </div>
          )}
          {data?.daily_repayments && (
            <div className="table-container"><div className="table-header-bar"><span className="table-title">Today's Repayments</span></div>
              <table className="custom-table"><thead><tr><th>ID</th><th>Time</th><th>Borrower / Loan</th><th>Amount</th></tr></thead>
                <tbody>{data.daily_repayments.map(r => (
                  <tr key={r.id}><td><code>RP-{r.id}</code></td><td>{new Date(r.repayment_date).toLocaleTimeString()}</td><td>{r.loan?.customer?.full_name} ({r.loan?.loan_number})</td><td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(r.amount)}</td></tr>
                ))}</tbody></table>
            </div>
          )}
        </>
      )}
      {reportType === 'monthly' && (
        <div className="grid-stats" style={{ marginBottom: '24px' }}>
          <div className="card-stat stat-success"><span className="stat-title">Monthly Deposits</span><span className="stat-value">{formatCurrency(monthlySummary.deposits)}</span></div>
          <div className="card-stat stat-danger"><span className="stat-title">Monthly Withdrawals</span><span className="stat-value">{formatCurrency(monthlySummary.withdrawals)}</span></div>
          <div className="card-stat stat-warning"><span className="stat-title">Monthly Repayments</span><span className="stat-value">{formatCurrency(monthlySummary.repayments)}</span></div>
          <div className="card-stat"><span className="stat-title">Total Activity</span><span className="stat-value">{data?.monthly_transactions_count || 0}</span></div>
        </div>
      )}
      {['weekly', 'quarterly', 'yearly'].includes(reportType) && (
        <div className="table-container" style={{ padding: '30px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: 'var(--warning)' }}>construction</span>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Advanced {reportType} reports available in the Banking Reports tab.</p>
        </div>
      )}
    </>
  )

  const renderAdvanced = () => {
    const isList = ['deposit', 'withdrawal', 'emi_collection'].includes(bankingCategory)
    const isLoan = bankingCategory === 'loan'
    const isCustomer = bankingCategory === 'customer'
    const isAccount = bankingCategory === 'account'
    const isInterest = bankingCategory === 'interest'
    const transactionList = data?.transactions || []
    const repaymentsList = data?.repayments || []
    const loansList = data?.loans || []
    const customersList = data?.customers || []
    const accountsList = data?.accounts || []
    return (
      <>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <select value={reportType} onChange={e => setReportType(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '140px', padding: '6px 10px' }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '100px', padding: '6px 10px' }}>
            <option value="json">View</option>
            <option value="csv">CSV Export</option>
          </select>
          {exportFormat === 'csv' ? (
            <button onClick={() => exportReport('csv')} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>file_download</span> Download CSV
            </button>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {BANKING_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setBankingCategory(c.id)}
              className={`btn btn-sm ${bankingCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
        {isInterest && data && (
          <div className="grid-stats" style={{ marginBottom: '20px' }}>
            <div className="card-stat"><span className="stat-title">Period</span><span className="stat-value" style={{ fontSize: '1rem' }}>{data.period}</span></div>
            <div className="card-stat"><span className="stat-title">Total Principal</span><span className="stat-value">{formatCurrency(data.total_principal)}</span></div>
            <div className="card-stat stat-warning"><span className="stat-title">Total Interest</span><span className="stat-value">{formatCurrency(data.total_interest)}</span></div>
            <div className="card-stat"><span className="stat-title">Active Loans</span><span className="stat-value">{data.active_loans}</span></div>
          </div>
        )}
        {isCustomer && data && (
          <div className="grid-stats" style={{ marginBottom: '20px' }}>
            <div className="card-stat"><span className="stat-title">Period</span><span className="stat-value" style={{ fontSize: '1rem' }}>{data.period}</span></div>
            <div className="card-stat stat-success"><span className="stat-title">New Customers</span><span className="stat-value">{data.new_customers}</span></div>
          </div>
        )}
        {isAccount && data && (
          <div className="grid-stats" style={{ marginBottom: '20px' }}>
            <div className="card-stat"><span className="stat-title">Period</span><span className="stat-value" style={{ fontSize: '1rem' }}>{data.period}</span></div>
            <div className="card-stat"><span className="stat-title">New Accounts</span><span className="stat-value">{data.new_accounts}</span></div>
            <div className="card-stat"><span className="stat-title">Total Balance</span><span className="stat-value">{formatCurrency(data.total_balance)}</span></div>
          </div>
        )}
        {isLoan && data && (
          <div className="grid-stats" style={{ marginBottom: '20px' }}>
            <div className="card-stat"><span className="stat-title">Applications</span><span className="stat-value">{data.total_applications}</span></div>
            <div className="card-stat"><span className="stat-title">Total Amount</span><span className="stat-value">{formatCurrency(data.total_amount)}</span></div>
            <div className="card-stat stat-success"><span className="stat-title">Approved</span><span className="stat-value">{data.approved_count}</span></div>
            <div className="card-stat stat-danger"><span className="stat-title">Rejected</span><span className="stat-value">{data.rejected_count}</span></div>
            <div className="card-stat stat-warning"><span className="stat-title">Pending</span><span className="stat-value">{data.pending_count}</span></div>
          </div>
        )}
        {isList && data && (
          <div className="table-container">
            <div className="table-header-bar">
              <span className="table-title">{bankingCategory === 'emi_collection' ? 'EMI Collection' : bankingCategory === 'deposit' ? 'Deposit' : 'Withdrawal'} Report - {data.period}</span>
              <span>{data.count || 0} entries &middot; Total: {formatCurrency(data.total_amount || data.total_collected)}</span>
            </div>
            <table className="custom-table">
              <thead><tr><th>Date</th><th>Customer</th><th>Account/Loan</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {(transactionList.length > 0 ? transactionList : repaymentsList).map((item, i) => (
                  <tr key={item.id || i}>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(item.created_at || item.repayment_date)}</td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{item.customer_name}</td>
                    <td><code>{item.account_number || item.loan_number}</code></td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(item.amount)}</td>
                    <td><StatusBadge status={item.status || 'successful'} /></td>
                  </tr>
                ))}
                {(transactionList.length === 0 && repaymentsList.length === 0) && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No data for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {isLoan && data?.loans && (
          <div className="table-container">
            <div className="table-header-bar"><span className="table-title">Loan Applications - {data.period}</span></div>
            <table className="custom-table">
              <thead><tr><th>Loan #</th><th>Customer</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {loansList.map(l => (
                  <tr key={l.id}>
                    <td><code>{l.loan_number}</code></td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{l.customer_name}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(l.amount)}</td>
                    <td>{l.interest_rate}%</td>
                    <td>{formatCurrency(l.emi)}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(l.applied_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  const renderCustomerSummary = () => (
    <>
      <div className="table-container" style={{ padding: '24px', marginBottom: '24px' }}>
        <span className="table-title" style={{ marginBottom: '16px', display: 'block' }}>Customer Summary Report</span>
        <form onSubmit={(e) => { e.preventDefault(); fetchCustomerSummary() }} style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '600px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search by name or ID..." value={searchCustomerQuery} onChange={e => setSearchCustomerQuery(e.target.value)}
            className="form-control" style={{ flex: 1, minWidth: '200px' }} />
          <input type="number" placeholder="Customer ID" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
            className="form-control" style={{ width: '120px' }} />
          <button type="submit" className="btn btn-primary"><span className="material-symbols-rounded">search</span> Generate Report</button>
        </form>
      </div>
      {customerSummary && (
        <>
          <div className="grid-stats" style={{ marginBottom: '20px' }}>
            <div className="card-stat"><span className="stat-title">Customer</span><span className="stat-value" style={{ fontSize: '1.1rem' }}>{customerSummary.customer?.full_name}</span><span className="stat-sub">ID: {customerSummary.customer?.customer_id}</span></div>
            <div className="card-stat"><span className="stat-title">Total Balance</span><span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(customerSummary.accounts_summary?.total_balance)}</span><span className="stat-sub">{customerSummary.accounts_summary?.total_accounts} accounts</span></div>
            <div className="card-stat"><span className="stat-title">Total Loans</span><span className="stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(customerSummary.loans_summary?.total_amount)}</span><span className="stat-sub">{customerSummary.loans_summary?.total_loans} loans</span></div>
            <div className="card-stat"><span className="stat-title">Repaid</span><span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(customerSummary.loans_summary?.total_paid)}</span><span className="stat-sub">total paid</span></div>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div className="form-card" style={{ flex: 1, padding: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '1rem' }}>Personal Details</h3>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p><span style={{ color: 'var(--text-secondary)' }}>Name:</span> <span style={{ color: '#fff', fontWeight: 600 }}>{customerSummary.customer?.full_name}</span></p>
                <p><span style={{ color: 'var(--text-secondary)' }}>Father:</span> <span style={{ color: '#fff' }}>{customerSummary.customer?.father_name || '—'}</span></p>
                <p><span style={{ color: 'var(--text-secondary)' }}>DOB:</span> <span style={{ color: '#fff' }}>{customerSummary.customer?.dob || '—'}</span></p>
                <p><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> <span style={{ color: '#fff' }}>{customerSummary.customer?.phone_number}</span></p>
                <p><span style={{ color: 'var(--text-secondary)' }}>Citizenship:</span> <span style={{ color: '#fff' }}>{customerSummary.customer?.citizenship_id}</span></p>
                <p><span style={{ color: 'var(--text-secondary)' }}>Status:</span> <StatusBadge status={customerSummary.customer?.status} /></p>
              </div>
            </div>
            <div className="form-card" style={{ flex: 1, padding: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '1rem' }}>Account Details</h3>
              {customerSummary.accounts_summary?.accounts?.length > 0 ? customerSummary.accounts_summary.accounts.map(a => (
                <div key={a.account_number} style={{ borderBottom: '1px solid var(--border-color)', padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <code style={{ color: 'var(--accent-color)' }}>{a.account_number}</code>
                    <StatusBadge status={a.account_type} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Balance: <strong style={{ color: '#fff' }}>{formatCurrency(a.balance)}</strong></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dep: {formatCurrency(a.total_deposits)} &middot; Wth: {formatCurrency(a.total_withdrawals)}</div>
                </div>
              )) : <p style={{ color: 'var(--text-muted)' }}>No accounts</p>}
            </div>
          </div>
          {customerSummary.loans_summary?.loans?.length > 0 && (
            <div className="table-container" style={{ marginBottom: '20px' }}>
              <div className="table-header-bar"><span className="table-title">Loan History</span></div>
              <table className="custom-table">
                <thead><tr><th>Loan #</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>{customerSummary.loans_summary.loans.map(l => (
                  <tr key={l.loan_number}><td><code>{l.loan_number}</code></td><td>{formatCurrency(l.amount)}</td><td>{l.interest_rate}%</td><td>{formatCurrency(l.emi)}</td><td>{formatCurrency(l.total_paid)}</td><td><StatusBadge status={l.status} /></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {customerSummary.recent_transactions?.length > 0 && (
            <div className="table-container">
              <div className="table-header-bar"><span className="table-title">Recent Transactions (Last 50)</span></div>
              <table className="custom-table">
                <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance</th><th>Memo</th></tr></thead>
                <tbody>{customerSummary.recent_transactions.map(t => (
                  <tr key={t.id}><td style={{ fontSize: '0.85rem' }}>{formatDate(t.created_at)}</td><td><StatusBadge status={t.type} /></td><td style={{ fontWeight: 700 }}>{formatCurrency(t.amount)}</td><td>{formatCurrency(t.balance_after)}</td><td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description || '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Financial Reports</h1>
          <p>Generate daily/weekly/monthly ledgers, banking reports, or customer summaries</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('legacy')} className={`btn ${activeTab === 'legacy' ? 'btn-primary' : 'btn-secondary'}`}>
          <span className="material-symbols-rounded">calendar_month</span> Period Reports
        </button>
        <button onClick={() => { setActiveTab('advanced'); fetchAdvancedReport() }} className={`btn ${activeTab === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}>
          <span className="material-symbols-rounded">analytics</span> Banking Reports
        </button>
        <button onClick={() => { setActiveTab('customer-summary'); setLoading(false) }} className={`btn ${activeTab === 'customer-summary' ? 'btn-primary' : 'btn-secondary'}`}>
          <span className="material-symbols-rounded">badge</span> Customer Summary
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <>
          {activeTab === 'legacy' && renderLegacy()}
          {activeTab === 'advanced' && renderAdvanced()}
          {activeTab === 'customer-summary' && renderCustomerSummary()}
        </>
      )}
    </>
  )
}
