import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { formatCurrency, getInitials, calculateProgress } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import StatsCard from '../../components/dashboard/StatsCard'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function UserDashboard() {
  const { customer } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/dashboard')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  const initials = getInitials(data?.customer?.full_name || customer?.name)
  const hasLoan = (data?.active_loans || 0) > 0

  const chartData = {
    labels: data?.date_labels || [],
    datasets: [
      {
        label: 'Deposits',
        data: data?.daily_deposits || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2
      },
      {
        label: 'Withdrawals',
        data: data?.daily_withdrawals || [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 5 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#6b7280', font: { size: 10 }, callback: (val) => '₹' + val.toLocaleString() }
      }
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {(data?.customer?.full_name || customer?.name || '').split(' ')[0]}</div>
          <div className="page-subtitle">Here's a snapshot of your finances today.</div>
        </div>
        <Link to="/user/transactions" className="btn">
          <span className="material-symbols-rounded">receipt_long</span> View Ledger
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '22px', marginBottom: '22px' }}>
        <div className="balance-card" style={{ flex: '0.95', marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div>
            <div className="balance-label">Total Balance</div>
            <div className="balance-amount" style={{ fontSize: '2rem' }}>{formatCurrency(data?.total_balance || 0)}</div>
            <div className="balance-foot" style={{ marginBottom: '8px' }}>
              <span>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--success)' }}>trending_up</span>
                {' '}Across {data?.active_accounts || 0} active accounts
              </span>
              <span className="text-muted">Last updated just now</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '140px', position: 'relative', marginTop: 'auto' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div style={{ flex: '1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignContent: 'start' }}>
          <StatsCard title="Total Deposits" value={formatCurrency(data?.total_deposits || 0)} subtitle="Lifetime deposits" variant="success" />
          <StatsCard title="Total Withdrawals" value={formatCurrency(data?.total_withdrawals || 0)} subtitle="Lifetime withdrawals" variant="danger" />
          <StatsCard title="Active Accounts" value={data?.active_accounts || 0} subtitle="Currently active" />
          <StatsCard title="Active Loans" value={data?.active_loans || 0} subtitle="Ongoing loans" variant="warning" />
        </div>
      </div>

      {hasLoan && (
        <div className="card" style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="card-title" style={{ margin: 0 }}>Loan Summary</div>
            <Link to="/user/my-loans" className="btn btn-sm">View Loans</Link>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Loan Amount</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(data?.total_loan_amount || 0)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Repaid</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(data?.total_loan_paid || 0)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Remaining</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(data?.total_loan_remaining || 0)}</div>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', marginTop: '16px' }}>
                <div style={{ width: `${calculateProgress(data?.total_loan_paid, data?.total_loan_amount)}%`, height: '100%', background: 'var(--success)', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="card-title" style={{ margin: 0 }}>Recent Transactions</div>
          <Link to="/user/transactions" className="btn btn-sm">See all</Link>
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
                    <StatusBadge status={txn.type}>
                      {txn.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </StatusBadge>
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
