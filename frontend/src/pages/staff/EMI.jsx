import React, { useState, useEffect } from 'react'
import { formatCurrency, calculateProgress } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function StaffEMI() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/loans/')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const emiLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid')

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>EMI Management</h1>
          <p>Track equated monthly installments</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">EMI Schedule Overview</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Loans: {emiLoans.filter(l => l.status === 'approved').length}</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr><th>Loan ID</th><th>Customer</th><th>Principal</th><th>EMI</th><th>Total Paid</th><th>Remaining</th><th>Progress</th><th>Status</th></tr>
          </thead>
          <tbody>
            {emiLoans.length > 0 ? emiLoans.map(loan => {
              const paid = parseFloat(loan.total_paid)
              const total = parseFloat(loan.total_payable)
              const progress = calculateProgress(paid, total)
              return (
                <tr key={loan.id}>
                  <td><code style={{ fontFamily: 'monospace' }}>{loan.loan_number}</code></td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{loan.customer?.full_name}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(loan.amount)}</td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(loan.emi)}/mo</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(paid)}</td>
                  <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(Math.max(0, total - paid))}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{progress}%</span>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--success)', transition: 'var(--transition)' }} />
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={loan.status} /></td>
                </tr>
              )
            }) : (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active loans with EMI schedules found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
