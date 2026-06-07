import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, getInitials, formatDateTime } from '../../utils/helpers'

export default function UserDashboard() {
  const { customer } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  const initials = getInitials(data?.customer?.full_name || customer?.name)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {(data?.customer?.full_name || customer?.name || '').split(' ')[0]}</div>
          <div className="page-subtitle">Here's a snapshot of your finances today.</div>
        </div>
        <a href="/user/transactions" className="btn">
          <span className="material-symbols-rounded">receipt_long</span> View ledger
        </a>
      </div>

      <div className="balance-card" style={{ marginBottom: '22px' }}>
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">{formatCurrency(data?.total_balance || 0)}</div>
        <div className="balance-foot">
          <span>
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--success)' }}>trending_up</span>
            {' '}Across {data?.active_accounts || 0} active accounts
          </span>
          <span className="text-muted">Last updated just now</span>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '22px' }}>
        <div className="card-stat">
          <div className="card-stat-icon success"><span className="material-symbols-rounded">south_west</span></div>
          <div>
            <div className="stat-title">Total Deposits</div>
            <div className="stat-value">{formatCurrency(data?.total_deposits || 0)}</div>
          </div>
        </div>
        <div className="card-stat">
          <div className="card-stat-icon danger"><span className="material-symbols-rounded">north_east</span></div>
          <div>
            <div className="stat-title">Total Withdrawals</div>
            <div className="stat-value">{formatCurrency(data?.total_withdrawals || 0)}</div>
          </div>
        </div>
        <div className="card-stat">
          <div className="card-stat-icon"><span className="material-symbols-rounded">account_balance_wallet</span></div>
          <div>
            <div className="stat-title">Active Accounts</div>
            <div className="stat-value">{data?.active_accounts || 0}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="card-title" style={{ margin: 0 }}>Recent Transactions</div>
          <a href="/user/transactions" className="btn btn-sm">See all</a>
        </div>

        <div className="table-container" style={{ background: 'transparent', border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_transactions?.length > 0 ? data.recent_transactions.map((txn, i) => (
                <tr key={i}>
                  <td className="text-muted">{new Date(txn.created_at).toLocaleDateString()}</td>
                  <td className="mono">{txn.account?.account_number}</td>
                  <td>
                    {txn.type === 'deposit' ? (
                      <span className="badge badge-success"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>south_west</span> Deposit</span>
                    ) : (
                      <span className="badge badge-danger"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>north_east</span> Withdrawal</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className={txn.type === 'deposit' ? 'amount-pos' : 'amount-neg'}>
                    {txn.type === 'deposit' ? '+' : '\u2212'} {formatCurrency(txn.amount)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="mono">{formatCurrency(txn.balance_after)}</td>
                </tr>
              )) : (
                <tr><td colSpan="5"><div className="empty"><span className="material-symbols-rounded">inbox</span><div>No recent activity</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
