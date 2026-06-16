import { useState, useEffect } from 'react'
import StatsCard from '../../components/dashboard/StatsCard'
import ChartCard from '../../components/dashboard/ChartCard'
import StatusBadge from '../../components/common/StatusBadge'
import { formatCurrency, calculateProgress, formatDate } from '../../utils/helpers'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
          {' '}{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid-stats">
        <StatsCard title="Active Members" value={data?.total_customers || 0} subtitle="Registered cooperative members" variant="success" />
        <StatsCard title="Vault Balance" value={formatCurrency(data?.total_deposits_balance || 0)} subtitle="Net deposits currently in vault" />
        <StatsCard title="Outstanding Loans" value={formatCurrency(data?.total_loan_receivable || 0)} subtitle={`${data?.active_loans_count || 0} Active Credit Accounts`} variant="warning" />
        <StatsCard title="Ledger Turnover" value={formatCurrency(data?.total_turnover || 0)} subtitle="Historical transacted volume" variant="danger" />
      </div>

      <div className="grid-stats" style={{ marginTop: '10px' }}>
        <StatsCard title="Total Accounts" value={data?.total_accounts || 0} subtitle={`${data?.frozen_accounts || 0} frozen`} />
        <StatsCard title="Total Loans" value={data?.total_loans_count || 0} subtitle={`${data?.pending_loans_count || 0} pending approval`} variant="warning" />
        <StatsCard title="Loan Disbursed" value={formatCurrency(data?.total_loan_disbursed || 0)} subtitle={`NPR ${(data?.total_loan_collected || 0).toLocaleString()} collected`} />
        <StatsCard title="Today's Transactions" value={data?.today_transactions || 0} subtitle="processed today" variant="info" />
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '10px' }}>
        <ChartCard
          labels={data?.date_labels || []}
          deposits={data?.daily_deposits || []}
          withdrawals={data?.daily_withdrawals || []}
        />

        <div className="table-container" style={{ flex: '1.5', minWidth: '380px' }}>
          <div className="table-header-bar">
            <span className="table-title">Recent Transactions</span>
            <a href="/admin/transactions" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View Ledger</a>
          </div>
          <table className="custom-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr><th>Member</th><th>Type</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {data?.recent_transactions?.length > 0 ? data.recent_transactions.map((txn, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{txn.account?.customer?.full_name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acc: {txn.account?.account_number}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={txn.type} /></td>
                  <td style={{ fontWeight: 700, color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                    {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No recent transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '10px' }}>
        <div className="table-container" style={{ flex: 1, minWidth: '300px' }}>
          <div className="table-header-bar">
            <span className="table-title">Pending Loan Approvals</span>
            <a href="/admin/loans" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View All</a>
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

        <div className="table-container" style={{ flex: 1, minWidth: '300px' }}>
          <div className="table-header-bar">
            <span className="table-title">Recent Loan Activity</span>
            <a href="/admin/loans" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>View All</a>
          </div>
          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
            <thead><tr><th>Member</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              {data?.recent_loans?.length > 0 ? data.recent_loans.map((l, i) => {
                const p = calculateProgress(parseFloat(l.total_paid), parseFloat(l.total_payable))
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>{l.customer?.full_name}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td style={{ minWidth: '80px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${p}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p}%</span>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recent loan activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
