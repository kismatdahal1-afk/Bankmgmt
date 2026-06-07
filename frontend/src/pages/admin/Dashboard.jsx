import React, { useState, useEffect } from 'react'
import StatsCard from '../../components/dashboard/StatsCard'
import ChartCard from '../../components/dashboard/ChartCard'
import EmptyState from '../../components/common/EmptyState'
import { formatCurrency } from '../../utils/helpers'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
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
      </div>

      <div className="grid-stats">
        <StatsCard title="Active Members" value={data?.total_customers || 0} subtitle="Registered cooperative members" variant="success" />
        <StatsCard title="Vault Balance (Savings)" value={formatCurrency(data?.total_deposits_balance || 0)} subtitle="Net deposits currently in vault" />
        <StatsCard title="Outstanding Loans" value={formatCurrency(data?.total_loan_receivable || 0)} subtitle={`${data?.active_loans_count || 0} Active Credit Accounts`} variant="warning" />
        <StatsCard title="Ledger Turnover" value={formatCurrency(data?.total_turnover || 0)} subtitle="Historical transacted volume" variant="danger" />
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
              <tr>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
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
                  <td>
                    <span className={`badge ${txn.type === 'deposit' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
                    {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No recent transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
