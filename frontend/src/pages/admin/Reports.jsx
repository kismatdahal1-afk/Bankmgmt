import React, { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function AdminReports() {
  const [reportType, setReportType] = useState('daily')
  const [data, setData] = useState(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchReports = (type, customerId) => {
    setLoading(true)
    let url = `/api/reports?type=${type}`
    if (customerId) url += `&customer_id=${customerId}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports(reportType, selectedCustomerId)
  }, [reportType])

  const handleCustomerSearch = (e) => {
    e.preventDefault()
    fetchReports('customer', selectedCustomerId)
  }

  const dailySummary = data?.daily_summary || {}
  const monthlySummary = data?.monthly_summary || {}
  const netFlow = parseFloat(dailySummary.deposits || 0) + parseFloat(dailySummary.repayments || 0) - parseFloat(dailySummary.withdrawals || 0)
  const monthlyNet = parseFloat(monthlySummary.deposits || 0) + parseFloat(monthlySummary.repayments || 0) - parseFloat(monthlySummary.withdrawals || 0)
  const today = data?.today ? new Date(data.today) : new Date()

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Financial Reports</h1>
          <p>Generate daily ledgers, monthly statistics, or member-wise audits</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {['daily', 'monthly', 'customer'].map(type => (
          <button
            key={type}
            onClick={() => { setReportType(type); setSelectedCustomerId('') }}
            className={`btn ${reportType === type ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span className="material-symbols-rounded">
              {type === 'daily' ? 'calendar_today' : type === 'monthly' ? 'calendar_month' : 'badge'}
            </span>
            {type === 'daily' ? 'Daily Ledger Report' : type === 'monthly' ? 'Monthly Volume Summary' : 'Member-Wise Audit'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <>
          {reportType === 'daily' && (
            <>
              <div className="grid-stats" style={{ marginBottom: '24px' }}>
                <div className="card-stat stat-success">
                  <span className="stat-title">Daily Deposits</span>
                  <span className="stat-value">{formatCurrency(dailySummary.deposits)}</span>
                  <span className="stat-sub">Total credit transactions today</span>
                </div>
                <div className="card-stat stat-danger">
                  <span className="stat-title">Daily Withdrawals</span>
                  <span className="stat-value">{formatCurrency(dailySummary.withdrawals)}</span>
                  <span className="stat-sub">Total debit transactions today</span>
                </div>
                <div className="card-stat stat-warning">
                  <span className="stat-title">Daily Repayments</span>
                  <span className="stat-value">{formatCurrency(dailySummary.repayments)}</span>
                  <span className="stat-sub">Total loan collections today</span>
                </div>
                <div className="card-stat">
                  <span className="stat-title">Net Daily Cash Flow</span>
                  <span className="stat-value" style={{ color: netFlow >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {netFlow < 0 ? '-' : ''}{formatCurrency(Math.abs(netFlow))}
                  </span>
                  <span className="stat-sub">Net change in bank assets today</span>
                </div>
              </div>

              {data?.daily_transactions && (
                <div className="table-container" style={{ marginBottom: '24px' }}>
                  <div className="table-header-bar">
                    <span className="table-title">Today's Transactions Ledger ({today.toLocaleDateString()})</span>
                  </div>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Txn ID</th>
                        <th>Time</th>
                        <th>Member / Acc</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_transactions.length > 0 ? data.daily_transactions.map(txn => (
                        <tr key={txn.id}>
                          <td><code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{txn.transaction_uuid}</code></td>
                          <td>{new Date(txn.created_at).toLocaleTimeString()}</td>
                          <td>{txn.account?.customer?.full_name} (Acc: {txn.account?.account_number})</td>
                          <td><StatusBadge status={txn.type} /></td>
                          <td style={{ fontWeight: 700, color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                            {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </td>
                          <td>{txn.description || '—'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No transactions recorded today yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {data?.daily_repayments && (
                <div className="table-container">
                  <div className="table-header-bar">
                    <span className="table-title">Today's Loan Repayments Collections ({today.toLocaleDateString()})</span>
                  </div>
                  <table className="custom-table">
                    <thead>
                      <tr><th>Repayment ID</th><th>Time</th><th>Borrower / Loan Ref</th><th>Amount Paid</th></tr>
                    </thead>
                    <tbody>
                      {data.daily_repayments.length > 0 ? data.daily_repayments.map(r => (
                        <tr key={r.id}>
                          <td><code style={{ fontFamily: 'monospace' }}>RP-{r.id}</code></td>
                          <td>{new Date(r.repayment_date).toLocaleTimeString()}</td>
                          <td>{r.loan?.customer?.full_name} (Ref: {r.loan?.loan_number})</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(r.amount)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No loan repayments collected today.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {reportType === 'monthly' && (
            <>
              <div className="grid-stats" style={{ marginBottom: '24px' }}>
                <div className="card-stat stat-success">
                  <span className="stat-title">Monthly Deposits Volume</span>
                  <span className="stat-value">{formatCurrency(monthlySummary.deposits)}</span>
                  <span className="stat-sub">Calendar month total credits</span>
                </div>
                <div className="card-stat stat-danger">
                  <span className="stat-title">Monthly Withdrawals Volume</span>
                  <span className="stat-value">{formatCurrency(monthlySummary.withdrawals)}</span>
                  <span className="stat-sub">Calendar month total debits</span>
                </div>
                <div className="card-stat stat-warning">
                  <span className="stat-title">Monthly Repayments Volume</span>
                  <span className="stat-value">{formatCurrency(monthlySummary.repayments)}</span>
                  <span className="stat-sub">Total credit repayments received</span>
                </div>
                <div className="card-stat">
                  <span className="stat-title">Total Monthly Activity</span>
                  <span className="stat-value">{data?.monthly_transactions_count || 0}</span>
                  <span className="stat-sub">Active ledger lines compiled</span>
                </div>
              </div>

              <div className="table-container" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ color: '#fff', fontWeight: 700 }}>Month Overview ({today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  During the current calendar month of <strong>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>, the bank recorded a total cash intake (deposits + repayments) of
                  <strong style={{ color: 'var(--success)' }}> {formatCurrency(parseFloat(monthlySummary.deposits || 0) + parseFloat(monthlySummary.repayments || 0))}</strong>
                  and a total cash withdrawal of
                  <strong style={{ color: 'var(--danger)' }}> {formatCurrency(monthlySummary.withdrawals)}</strong>.
                </p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  The net cash reserve position of the village bank fluctuated by
                  <strong style={{ color: monthlyNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {' '}{monthlyNet < 0 ? '-' : ''}{formatCurrency(Math.abs(monthlyNet))}
                  </strong> overall.
                </p>
              </div>
            </>
          )}

          {reportType === 'customer' && (
            <>
              <div className="table-container" style={{ padding: '24px', marginBottom: '24px' }}>
                <span className="table-title" style={{ marginBottom: '16px', display: 'block' }}>Select Audit Target Member</span>
                <form onSubmit={handleCustomerSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '600px' }}>
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="form-control" required style={{ flex: 1 }}>
                    <option value="" disabled>-- Choose Bank Member --</option>
                    {data?.customers?.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name} (ID: {c.citizenship_id})</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary">
                    <span className="material-symbols-rounded">search</span> Search Profile
                  </button>
                </form>
              </div>

              {data?.selected_customer && (
                <>
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <div className="form-card" style={{ flex: 1, maxWidth: '500px', padding: '24px' }}>
                      <h3 style={{ color: '#fff', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Member Demographic Profile</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p><strong style={{ color: 'var(--text-secondary)' }}>Full Name:</strong> <span style={{ color: '#fff', fontWeight: 600 }}>{data.selected_customer.full_name}</span></p>
                        <p><strong style={{ color: 'var(--text-secondary)' }}>Address:</strong> <span style={{ color: '#fff' }}>{data.selected_customer.address}</span></p>
                        <p><strong style={{ color: 'var(--text-secondary)' }}>Phone Number:</strong> <span style={{ color: '#fff' }}>{data.selected_customer.phone_number}</span></p>
                        <p><strong style={{ color: 'var(--text-secondary)' }}>Citizenship ID Card:</strong> <span style={{ color: '#fff' }}>{data.selected_customer.citizenship_id}</span></p>
                        <p><strong style={{ color: 'var(--text-secondary)' }}>Registration Date:</strong> <span style={{ color: '#fff' }}>{new Date(data.selected_customer.created_at).toLocaleDateString()}</span></p>
                        <p>
                          <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
                          <StatusBadge status={data.selected_customer.status} />
                        </p>
                      </div>
                    </div>

                    <div className="form-card" style={{ flex: 1.2, padding: '24px' }}>
                      <h3 style={{ color: '#fff', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Financial Accounts</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {data.selected_customer.accounts?.map(acc => (
                          <div key={acc.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ color: '#fff', fontSize: '1.1rem', fontFamily: 'monospace' }}>#{acc.account_number}</strong>
                              <StatusBadge status={acc.status} />
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              Account Class: <span style={{ textTransform: 'capitalize', color: '#fff', fontWeight: 500 }}>{acc.account_type}</span>
                            </p>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              Current Available Balance: <strong style={{ color: 'var(--success)', fontSize: '1.2rem' }}>{formatCurrency(acc.balance)}</strong>
                            </p>
                          </div>
                        )) || <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No bank accounts associated with this profile.</p>}
                      </div>
                    </div>
                  </div>

                  {data?.customer_loans && (
                    <div className="table-container" style={{ marginBottom: '24px' }}>
                      <div className="table-header-bar"><span className="table-title">Loan Contracts Summary</span></div>
                      <table className="custom-table">
                        <thead><tr><th>Loan ID</th><th>Date</th><th>Principal</th><th>EMI</th><th>Outstanding</th><th>Status</th></tr></thead>
                        <tbody>
                          {data.customer_loans.length > 0 ? data.customer_loans.map(loan => (
                            <tr key={loan.id}>
                              <td><code style={{ fontFamily: 'monospace' }}>{loan.loan_number}</code></td>
                              <td>{new Date(loan.applied_date).toLocaleDateString()}</td>
                              <td style={{ color: '#fff', fontWeight: 600 }}>{formatCurrency(loan.amount)}</td>
                              <td>{formatCurrency(loan.emi)}/mo</td>
                              <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(parseFloat(loan.total_payable) - parseFloat(loan.total_paid))}</td>
                              <td><StatusBadge status={loan.status} /></td>
                            </tr>
                          )) : <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No historical loans associated with this member.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {data?.customer_txns && (
                    <div className="table-container">
                      <div className="table-header-bar"><span className="table-title">Account Ledger Audit Trail</span></div>
                      <table className="custom-table">
                        <thead><tr><th>Txn ID</th><th>Timestamp</th><th>Account</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Memo</th></tr></thead>
                        <tbody>
                          {data.customer_txns.length > 0 ? data.customer_txns.map(txn => (
                            <tr key={txn.id}>
                              <td><code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{txn.transaction_uuid}</code></td>
                              <td>{formatDateTime(txn.created_at)}</td>
                              <td><code style={{ fontFamily: 'monospace' }}>{txn.account?.account_number}</code></td>
                              <td><StatusBadge status={txn.type} /></td>
                              <td style={{ fontWeight: 700, color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                                {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </td>
                              <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(txn.balance_after)}</td>
                              <td>{txn.description || '—'}</td>
                            </tr>
                          )) : <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No transactions recorded on this member's accounts.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {!data?.selected_customer && reportType === 'customer' && (
                <div className="table-container" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>search_off</span>
                  Please select a cooperative member from the dropdown menu above to query their financial records.
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
