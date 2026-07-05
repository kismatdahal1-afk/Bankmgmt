import React, { useState, useEffect } from 'react'
import { formatCurrency, calculateProgress, formatDate } from '../../utils/helpers'
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge'

export default function AdminEMI() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState(null)

  useEffect(() => {
    fetch('/api/loans/')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const emiLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid' || l.payment_status === 'overdue')
  const activeCount = emiLoans.filter(l => l.payment_status === 'current').length
  const overdueCount = emiLoans.filter(l => l.payment_status === 'overdue').length
  const dueSoonCount = emiLoans.filter(l => l.payment_status === 'due_soon').length
  const fullyPaidCount = emiLoans.filter(l => l.status === 'fully_paid').length

  if (selectedLoan) {
    const loan = selectedLoan
    const paid = parseFloat(loan.total_paid)
    const total = parseFloat(loan.total_payable)
    const remaining = total - paid
    const progress = calculateProgress(paid, total)
    return (
      <>
        <div className="top-header">
          <div className="header-title">
            <h1>EMI Details &mdash; {loan.application_number || loan.loan_number}</h1>
            <p>Detailed repayment schedule for {loan.customer?.full_name}</p>
          </div>
        </div>
        <button onClick={() => setSelectedLoan(null)} className="btn btn-secondary" style={{ marginBottom: '12px' }}>
          <span className="material-symbols-rounded">arrow_back</span> Back to EMI Overview
        </button>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div className="card-stat"><div className="stat-title">Principal</div><div className="stat-value">{formatCurrency(loan.amount)}</div></div>
          <div className="card-stat"><div className="stat-title">EMI</div><div className="stat-value">{formatCurrency(loan.emi)}/mo</div></div>
          <div className="card-stat"><div className="stat-title">Total Payable</div><div className="stat-value">{formatCurrency(total)}</div></div>
          <div className="card-stat"><div className="stat-title">Paid</div><div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(paid)}</div></div>
          <div className="card-stat"><div className="stat-title">Remaining</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(Math.max(0, remaining))}</div></div>
          <div className="card-stat"><div className="stat-title">EMIs Left</div><div className="stat-value">{loan.remaining_emis || 0}</div></div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Repayment Progress</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: (loan.payment_status || 'current') === 'overdue' ? 'var(--danger)' : 'var(--success)', borderRadius: '4px', transition: 'var(--transition)' }} />
          </div>
        </div>
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Repayment History</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loan.repayments?.length || 0} payments</span>
          </div>
          <table className="custom-table">
            <thead>
              <tr><th>EMI #</th><th>Amount</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loan.repayments?.length > 0 ? loan.repayments.map(r => (
                <tr key={r.id}>
                  <td><code>EMI-{r.emi_number || '—'}</code></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(r.repayment_date)}</td>
                  <td><StatusBadge status={r.status || 'paid'} /></td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No repayments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>EMI Management</h1>
          <p>Track equated monthly installments across all active loans</p>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '10px' }}>
        <StatsCard title="Current" value={activeCount} subtitle="On-time payments" variant="success" />
        <StatsCard title="Due Soon" value={dueSoonCount} subtitle="Payment within 7 days" variant="warning" />
        <StatsCard title="Overdue" value={overdueCount} subtitle="Require immediate attention" variant="danger" />
        <StatsCard title="Fully Paid" value={fullyPaidCount} subtitle="Completed contracts" />
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">EMI Schedule Overview</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{activeCount} active &middot; {overdueCount} overdue</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Customer</th>
              <th>Principal</th>
              <th>EMI Amount</th>
              <th>Total Paid</th>
              <th>Remaining</th>
              <th>EMIs Left</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Penalty</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {emiLoans.length > 0 ? emiLoans.map(loan => {
              const paid = parseFloat(loan.total_paid)
              const total = parseFloat(loan.total_payable)
              const remaining = total - paid
              const progress = calculateProgress(paid, total)
              const ps = loan.payment_status || 'current'
              const penalty = loan.late_penalty || 0
              return (
                <tr key={loan.id} style={ps === 'overdue' ? { borderLeft: '3px solid var(--danger)' } : ps === 'due_soon' ? { borderLeft: '3px solid #f59e0b' } : {}}>
                  <td><code style={{ fontFamily: 'monospace' }}>{loan.application_number || loan.loan_number}</code></td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{loan.customer?.full_name}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(loan.amount)}</td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(loan.emi)}/mo</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(paid)}</td>
                  <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(Math.max(0, remaining))}</td>
                  <td style={{ fontWeight: 500 }}>{loan.remaining_emis || 0}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{progress}%</span>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: ps === 'overdue' ? 'var(--danger)' : 'var(--success)', transition: 'var(--transition)' }} />
                      </div>
                    </div>
                  </td>
                  <td><PaymentStatusBadge status={ps} overdueDays={loan.overdue_days} showDetail /></td>
                  <td style={{ fontWeight: 600, color: penalty > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>{penalty > 0 ? formatCurrency(penalty) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelectedLoan(loan)} className="btn btn-sm btn-secondary" style={{ padding: '4px 10px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>visibility</span> View
                    </button>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>calendar_month</span>
                  No active loans with EMI schedules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StatsCard({ title, value, subtitle, variant = '' }) {
  return (
    <div className={`card-stat ${variant ? `stat-${variant}` : ''}`}>
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value}</span>
      {subtitle && <span className="stat-sub">{subtitle}</span>}
    </div>
  )
}
