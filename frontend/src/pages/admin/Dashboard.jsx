import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import StatsCard from '../../components/dashboard/StatsCard'
import ChartCard from '../../components/dashboard/ChartCard'
import StatusBadge from '../../components/common/StatusBadge'
import { formatCurrency, calculateProgress, formatDate, formatDateTime } from '../../utils/helpers'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchDashboard()
    const id = setInterval(fetchDashboard, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchDashboard() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetchDashboard])

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Operations Dashboard</h1>
          <p>Real-time village bank metrics and activity overview</p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: '-3px' }}>today</span>
          {' '}{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '58%', display: 'flex' }}>
          <StatsCard title="Vault Balance" value={(() => { const p = formatCurrency(data?.total_deposits_balance || 0).split(' '); return <><span style={{ color: '#3b82f6' }}>{p[0]}</span> <span style={{ color: '#ffd54f' }}>{p[1]}</span></> })()} subtitle="Net deposits currently in vault" valueStyle={{ fontSize: '2.2rem' }} style={{ padding: '22px', flex: 1, justifyContent: 'center' }} />
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignContent: 'start', alignItems: 'start' }}>
          <StatsCard title="Total Accounts" value={data?.total_accounts || 0} subtitle={`${data?.frozen_accounts || 0} frozen`} style={{ padding: '4px 14px', gap: '2px' }} />
          <StatsCard title="Active Members" value={data?.total_customers || 0} subtitle="Registered cooperative members" variant="success" style={{ padding: '4px 14px', gap: '2px' }} />
          <StatsCard title="Total Loans" value={data?.total_loans_count || 0} subtitle={`${data?.pending_loans_count || 0} pending approval`} variant="warning" style={{ padding: '4px 14px', gap: '2px' }} />
          <StatsCard title="Today's Transactions" value={data?.today_transactions || 0} subtitle="processed today" variant="info" style={{ padding: '4px 14px', gap: '2px' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '12px' }}>
        <StatsCard title="Outstanding Loans" value={formatCurrency(data?.total_loan_receivable || 0)} subtitle={`${data?.active_loans_count || 0} Active Credit Accounts`} variant="warning" style={{ padding: '20px' }} />
        <StatsCard title="Loan Disbursed" value={formatCurrency(data?.total_loan_disbursed || 0)} subtitle={`NPR ${(data?.total_loan_collected || 0).toLocaleString()} collected`} style={{ padding: '20px' }} />
        <StatsCard title="Ledger Turnover" value={formatCurrency(data?.total_turnover || 0)} subtitle="Historical transacted volume" variant="danger" style={{ padding: '20px' }} />
      </div>

      {/* SECTION 1: Transaction Analytics */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>account_balance</span>
        Transaction Analytics
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: '2.2', minWidth: 0 }}>
          <ChartCard
            mode="line"
            labels={data?.date_labels || []}
            deposits={data?.daily_deposits || []}
            withdrawals={data?.daily_withdrawals || []}
            transfers={data?.daily_transfers || []}
          />
        </div>
        <div style={{ flex: '1.2', minWidth: 0 }}>
          <ChartCard
            mode="bar"
            labels={data?.date_labels || []}
            deposits={data?.daily_deposits || []}
            withdrawals={data?.daily_withdrawals || []}
            transfers={data?.daily_transfers || []}
          />
        </div>
      </div>

      {/* SECTION 2: Recent Transactions */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>receipt_long</span>
        Recent Transactions
      </div>
      <div className="table-container" style={{ width: '100%' }}>
        <div className="table-header-bar">
          <span className="table-title">Latest Transactions</span>
          <Link to="/admin/transactions" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View Ledger</Link>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Member</th>
              <th>Account</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date &amp; Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.recent_transactions?.length > 0 ? data.recent_transactions.map((txn, i) => (
              <tr key={i}>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {txn.transaction_uuid ? txn.transaction_uuid.slice(0, 12) : `#${txn.id}`}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{txn.customer_name || txn.account?.customer?.full_name}</span>
                  </div>
                </td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {txn.account_number || txn.account?.account_number}
                </td>
                <td><StatusBadge status={txn.type} /></td>
                <td style={{ fontWeight: 700, color: txn.type === 'deposit' || txn.type === 'transfer_in' ? 'var(--success)' : 'var(--danger)' }}>
                  {txn.type === 'deposit' || txn.type === 'transfer_in' ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {txn.created_at ? formatDateTime(txn.created_at) : '-'}
                </td>
                <td><StatusBadge status={txn.status} /></td>
              </tr>
            )) : (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No recent transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION 3: Loan Operations */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>account_balance</span>
        Loan Operations
      </div>
      <div className="dashboard-two-col">
        {/* Left: Pending Loan Approvals */}
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Pending Loan Approvals</span>
            <Link to="/admin/loan/pending" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
          </div>
          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
            <thead><tr><th>Member</th><th>Amount</th><th>Applied</th></tr></thead>
            <tbody>
              {data?.pending_loans?.length > 0 ? data.pending_loans.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{l.customer?.full_name}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(l.amount)}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(l.applied_date)}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No pending approvals</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Recent Loan Activities (Timeline) */}
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Recent Loan Activity</span>
            <Link to="/admin/loan/applications" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data?.recent_loans?.length > 0 ? data.recent_loans.map((l, i) => {
              const statusIcons = {
                pending: 'hourglass_empty',
                approved: 'check_circle',
                rejected: 'cancel',
                overdue: 'warning',
                fully_paid: 'done_all'
              }
              const statusColors = {
                pending: '#f59e0b',
                approved: '#10b981',
                rejected: '#ef4444',
                overdue: '#f97316',
                fully_paid: '#3b82f6'
              }
              const icon = statusIcons[l.raw_status || l.status] || 'radio_button_unchecked'
              const color = statusColors[l.raw_status || l.status] || 'var(--text-muted)'
              const p = l.total_payable ? calculateProgress(parseFloat(l.total_paid), parseFloat(l.total_payable)) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: i < data.recent_loans.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color }}>{icon}</span>
                    {i < data.recent_loans.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border-color)', marginTop: '4px' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{l.customer?.full_name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(l.applied_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={l.raw_status || l.status} />
                      {l.total_payable > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '120px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${p}%`, height: '100%', background: 'var(--success)', borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recent loan activity</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
